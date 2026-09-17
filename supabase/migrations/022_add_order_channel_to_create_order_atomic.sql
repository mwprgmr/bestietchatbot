-- Migration 022: Add order_channel support to create_order_atomic RPC function

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_channel TEXT DEFAULT 'storefront';

CREATE INDEX IF NOT EXISTS idx_orders_order_channel ON public.orders(order_channel);
CREATE INDEX IF NOT EXISTS idx_orders_branch_channel_created ON public.orders(branch_id, order_channel, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL,
    p_address_id UUID DEFAULT NULL,
    p_delivery_fee NUMERIC DEFAULT 35,
    p_customer_remarks TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_inventory_date DATE DEFAULT CURRENT_DATE,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL,
    p_maps_url TEXT DEFAULT NULL,
    p_customer_name TEXT DEFAULT NULL,
    p_customer_phone TEXT DEFAULT NULL,
    p_customer_address TEXT DEFAULT NULL,
    p_order_channel TEXT DEFAULT 'storefront'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_order_id UUID;
    v_order_number TEXT;
    v_subtotal NUMERIC := 0;
    v_grand_total NUMERIC := 0;
    v_item JSONB;
    v_product_id UUID;
    v_qty_kg NUMERIC;
    v_unit_price NUMERIC;
    v_item_total NUMERIC;
    v_cutting_type TEXT;
    v_inv_id UUID;
    v_current_stock NUMERIC;
    v_target_branch UUID;
    v_existing_order JSONB;
    v_target_customer_id UUID := p_customer_id;
    v_clean_phone TEXT;
    v_final_channel TEXT;
BEGIN
    -- Validate and normalize order channel ('storefront' | 'whatsapp')
    v_final_channel := LOWER(TRIM(COALESCE(p_order_channel, 'storefront')));
    IF v_final_channel NOT IN ('storefront', 'whatsapp') THEN
        v_final_channel := 'storefront';
    END IF;

    -- Idempotency Check
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT jsonb_build_object(
            'success', true,
            'order_id', id,
            'order_number', order_number,
            'subtotal', COALESCE(subtotal, 0),
            'delivery_charge', COALESCE(delivery_charge, 0),
            'total_amount', COALESCE(total_amount, total, 0),
            'status', status,
            'branch_id', branch_id,
            'order_channel', order_channel,
            'idempotent_replay', true
        )
        INTO v_existing_order
        FROM public.orders
        WHERE idempotency_key = TRIM(p_idempotency_key)
        LIMIT 1;

        IF v_existing_order IS NOT NULL THEN
            RETURN v_existing_order;
        END IF;
    END IF;

    -- Branch Resolution
    v_target_branch := COALESCE(p_branch_id, 'b1111111-1111-1111-1111-111111111111'::uuid);

    -- Customer Resolution / Auto-Upsert
    IF v_target_customer_id IS NULL AND p_customer_phone IS NOT NULL AND TRIM(p_customer_phone) <> '' THEN
        v_clean_phone := regexp_replace(p_customer_phone, '\D', '', 'g');
        IF v_clean_phone <> '' THEN
            SELECT id INTO v_target_customer_id
            FROM public.customers
            WHERE phone = v_clean_phone
            LIMIT 1;

            IF v_target_customer_id IS NULL THEN
                INSERT INTO public.customers (name, phone, address)
                VALUES (
                    COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Valued Customer'),
                    v_clean_phone,
                    NULLIF(TRIM(p_customer_address), '')
                )
                RETURNING id INTO v_target_customer_id;
            END IF;
        END IF;
    END IF;

    -- Calculate Subtotal & Verify Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty_kg := COALESCE((v_item->>'quantity_kg')::numeric, (v_item->>'quantity')::numeric, 0.5);
        v_unit_price := COALESCE((v_item->>'unit_price')::numeric, (v_item->>'price_per_kg')::numeric, 0);
        v_item_total := ROUND(v_qty_kg * v_unit_price, 2);
        v_subtotal := v_subtotal + v_item_total;

        -- Stock check
        SELECT id, COALESCE(available_stock, 0)
        INTO v_inv_id, v_current_stock
        FROM public.inventory
        WHERE product_id = v_product_id AND branch_id = v_target_branch
        LIMIT 1;

        IF v_inv_id IS NOT NULL AND v_current_stock < v_qty_kg THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Stock insufficient for product % (Available: %, Requested: %)', v_product_id, v_current_stock, v_qty_kg;
        END IF;
    END LOOP;

    -- Delivery Fee & Grand Total
    v_grand_total := v_subtotal + COALESCE(p_delivery_fee, 35);
    v_order_number := 'BF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0');

    -- Insert Order with explicit order_channel
    INSERT INTO public.orders (
        order_number,
        customer_id,
        branch_id,
        status,
        subtotal,
        delivery_charge,
        total,
        total_amount,
        payment_status,
        payment_method,
        delivery_address,
        customer_phone,
        business_date,
        customer_remarks,
        idempotency_key,
        latitude,
        longitude,
        maps_url,
        order_channel
    ) VALUES (
        v_order_number,
        v_target_customer_id,
        v_target_branch,
        'pending',
        v_subtotal,
        COALESCE(p_delivery_fee, 35),
        v_grand_total,
        v_grand_total,
        'pending',
        'COD',
        COALESCE(p_customer_address, 'Doorstep Delivery'),
        COALESCE(p_customer_phone, ''),
        COALESCE(p_inventory_date, CURRENT_DATE),
        p_customer_remarks,
        p_idempotency_key,
        p_latitude,
        p_longitude,
        p_maps_url,
        v_final_channel
    )
    RETURNING id INTO v_order_id;

    -- Insert Order Items & Deduct Inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty_kg := COALESCE((v_item->>'quantity_kg')::numeric, (v_item->>'quantity')::numeric, 0.5);
        v_unit_price := COALESCE((v_item->>'unit_price')::numeric, (v_item->>'price_per_kg')::numeric, 0);
        v_item_total := ROUND(v_qty_kg * v_unit_price, 2);
        v_cutting_type := COALESCE(v_item->>'cutting_type', v_item->>'cleaning_option', 'Whole');

        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity,
            price_per_kg,
            cutting_type,
            total
        ) VALUES (
            v_order_id,
            v_product_id,
            v_qty_kg,
            v_unit_price,
            v_cutting_type,
            v_item_total
        );

        -- Deduct inventory stock
        SELECT id, COALESCE(available_stock, 0)
        INTO v_inv_id, v_current_stock
        FROM public.inventory
        WHERE product_id = v_product_id AND branch_id = v_target_branch
        LIMIT 1;

        IF v_inv_id IS NOT NULL THEN
            UPDATE public.inventory
            SET available_stock = GREATEST(0, available_stock - v_qty_kg),
                sold_stock = COALESCE(sold_stock, 0) + v_qty_kg,
                status = CASE WHEN (available_stock - v_qty_kg) <= 0 THEN 'out_of_stock' ELSE 'available' END,
                updated_at = NOW()
            WHERE id = v_inv_id;

            INSERT INTO public.inventory_movements (
                inventory_id,
                movement_type,
                quantity,
                reason,
                reference_id
            ) VALUES (
                v_inv_id,
                'SALE',
                -v_qty_kg,
                'Order ' || v_order_number || ' (' || UPPER(v_final_channel) || ')',
                v_order_id
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'subtotal', v_subtotal,
        'delivery_charge', COALESCE(p_delivery_fee, 35),
        'total_amount', v_grand_total,
        'status', 'pending',
        'branch_id', v_target_branch,
        'order_channel', v_final_channel
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic TO anon, authenticated, service_role, postgres;
ALTER FUNCTION public.create_order_atomic SET row_security = off;
