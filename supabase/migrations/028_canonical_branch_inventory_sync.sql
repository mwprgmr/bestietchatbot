-- Migration 028: Canonical Branch Inventory Sync & Strict Order Validation
-- Removes automatic stale carryover insertions and enforces canonical branch stock checks

DROP FUNCTION IF EXISTS public.create_order_atomic(UUID, UUID, JSONB, DATE, TEXT, NUMERIC, UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_order_atomic(UUID, UUID, JSONB, DATE, TEXT, NUMERIC, UUID, TEXT, NUMERIC, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.create_order_atomic(UUID, UUID, JSONB, DATE, TEXT, NUMERIC, UUID, TEXT);
DROP FUNCTION IF EXISTS public.create_order_atomic(UUID, UUID, JSONB, DATE, TEXT, NUMERIC, UUID);
DROP FUNCTION IF EXISTS public.create_order_atomic(UUID, UUID, JSONB, DATE, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID,
    p_address_id UUID,
    p_items JSONB,
    p_inventory_date DATE,
    p_idempotency_key TEXT,
    p_delivery_fee NUMERIC DEFAULT 35,
    p_branch_id UUID DEFAULT 'b1111111-1111-1111-1111-111111111111'::UUID,
    p_customer_remarks TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL,
    p_maps_url TEXT DEFAULT NULL,
    p_order_channel TEXT DEFAULT 'WEB_STOREFRONT'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_number TEXT;
    v_item JSONB;
    v_product_id UUID;
    v_product_name TEXT;
    v_qty_kg NUMERIC;
    v_unit_price NUMERIC;
    v_inv_id UUID;
    v_curr_available NUMERIC;
    v_inv_price NUMERIC;
    v_cart_subtotal NUMERIC := 0;
    v_item_subtotal NUMERIC;
    v_delivery_charge NUMERIC := COALESCE(p_delivery_fee, 35);
    v_grand_total NUMERIC;
    v_target_branch UUID;
    v_target_date DATE;
    v_existing_order_id UUID;
    v_branch_name TEXT;
BEGIN
    -- 1. Idempotency check to prevent duplicate orders
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_order_id
        FROM public.orders
        WHERE idempotency_key = p_idempotency_key
        LIMIT 1;

        IF v_existing_order_id IS NOT NULL THEN
            SELECT order_number, total_amount INTO v_order_number, v_grand_total
            FROM public.orders WHERE id = v_existing_order_id;

            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_order_id,
                'order_number', v_order_number,
                'total_amount', v_grand_total,
                'message', 'Idempotent replay: Order already processed successfully.'
            );
        END IF;
    END IF;

    -- 2. Standardize Branch and Date (Indian Standard Time)
    v_target_branch := COALESCE(p_branch_id, 'b1111111-1111-1111-1111-111111111111'::UUID);
    v_target_date := COALESCE(p_inventory_date, CURRENT_DATE);

    -- Validate target branch existence
    SELECT name INTO v_branch_name FROM public.branches WHERE id = v_target_branch;
    IF v_branch_name IS NULL THEN
        RAISE EXCEPTION 'INVALID_BRANCH: Branch ID % does not exist', v_target_branch;
    END IF;

    -- 3. Validate Cart Payload
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Cart items payload cannot be empty';
    END IF;

    -- 4. Validate Inventory Stock Strictly for (v_target_branch, v_target_date)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty_kg := COALESCE((v_item->>'quantity_kg')::NUMERIC, (v_item->>'weight_kg')::NUMERIC * COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.5);

        IF v_product_id IS NULL THEN
            RAISE EXCEPTION 'INVALID_PRODUCT: Product ID missing in item payload';
        END IF;

        IF v_qty_kg <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than zero';
        END IF;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;
        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product ID % does not exist', v_product_id;
        END IF;

        v_inv_id := NULL;
        v_curr_available := 0;

        -- Lock inventory row FOR UPDATE strictly for (product_id, branch_id, inventory_date)
        SELECT id, COALESCE(available_stock, 0), price_per_kg INTO v_inv_id, v_curr_available, v_inv_price
        FROM public.inventory
        WHERE product_id = v_product_id 
          AND branch_id = v_target_branch 
          AND inventory_date = v_target_date
          AND status IN ('available', 'AVAILABLE')
        FOR UPDATE;

        IF v_inv_id IS NULL THEN
            RAISE EXCEPTION 'NO_INVENTORY: Product % is not available at % for %', v_product_name, v_branch_name, v_target_date;
        END IF;

        IF v_curr_available < v_qty_kg THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available at %', v_curr_available, v_product_name, v_branch_name;
        END IF;

        v_unit_price := COALESCE(v_inv_price, (v_item->>'price_per_kg')::NUMERIC, (v_item->>'unit_price')::NUMERIC, 200);
        v_item_subtotal := ROUND(v_qty_kg * v_unit_price, 2);
        v_cart_subtotal := v_cart_subtotal + v_item_subtotal;
    END LOOP;

    -- Calculate delivery charge (Free above ₹500)
    IF v_cart_subtotal >= 500 THEN
        v_delivery_charge := 0;
    END IF;

    v_grand_total := v_cart_subtotal + v_delivery_charge;

    -- 5. Generate Order Number
    v_order_number := 'BF-' || TO_CHAR(v_target_date, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');

    -- 6. Insert Order Record
    INSERT INTO public.orders (
        customer_id,
        delivery_address_id,
        branch_id,
        order_number,
        total_amount,
        status,
        payment_status,
        inventory_date,
        idempotency_key,
        delivery_fee,
        customer_remarks,
        source,
        latitude,
        longitude,
        maps_url
    ) VALUES (
        p_customer_id,
        p_address_id,
        v_target_branch,
        v_order_number,
        v_grand_total,
        'PENDING',
        'PENDING',
        v_target_date,
        p_idempotency_key,
        v_delivery_charge,
        p_customer_remarks,
        COALESCE(p_order_channel, 'WEB_STOREFRONT'),
        p_latitude,
        p_longitude,
        p_maps_url
    )
    RETURNING id INTO v_order_id;

    -- 7. Deduct Inventory & Create Order Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_qty_kg := COALESCE((v_item->>'quantity_kg')::NUMERIC, (v_item->>'weight_kg')::NUMERIC * COALESCE((v_item->>'quantity')::NUMERIC, 1), 0.5);

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;

        -- Fetch price and lock inventory row again
        SELECT id, COALESCE(available_stock, 0), price_per_kg INTO v_inv_id, v_curr_available, v_inv_price
        FROM public.inventory
        WHERE product_id = v_product_id 
          AND branch_id = v_target_branch 
          AND inventory_date = v_target_date
        FOR UPDATE;

        v_unit_price := COALESCE(v_inv_price, (v_item->>'price_per_kg')::NUMERIC, (v_item->>'unit_price')::NUMERIC, 200);
        v_item_subtotal := ROUND(v_qty_kg * v_unit_price, 2);

        -- Deduct stock & update status atomically
        UPDATE public.inventory
        SET available_stock = GREATEST(0, available_stock - v_qty_kg),
            sold_stock = COALESCE(sold_stock, 0) + v_qty_kg,
            status = CASE WHEN (available_stock - v_qty_kg) <= 0 THEN 'OUT_OF_STOCK' ELSE status END,
            updated_at = NOW()
        WHERE id = v_inv_id;

        -- Record inventory movement
        INSERT INTO public.inventory_movements (
            inventory_id,
            product_id,
            movement_type,
            quantity_change,
            reason
        ) VALUES (
            v_inv_id,
            v_product_id,
            'SALE',
            -v_qty_kg,
            'Order ' || v_order_number || ' (' || COALESCE(p_order_channel, 'WEB_STOREFRONT') || ')'
        );

        -- Insert order item
        INSERT INTO public.order_items (
            order_id,
            product_id,
            product_name,
            weight_kg,
            quantity_kg,
            unit_price,
            cutting_type,
            subtotal
        ) VALUES (
            v_order_id,
            v_product_id,
            COALESCE(v_item->>'product_name', v_product_name, 'Fresh Catch'),
            COALESCE((v_item->>'weight_kg')::NUMERIC, 0.5),
            v_qty_kg,
            v_unit_price,
            COALESCE(v_item->>'cutting_type', 'Whole'),
            v_item_subtotal
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_grand_total
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic TO anon, authenticated, service_role, postgres;
ALTER FUNCTION public.create_order_atomic SET row_security = off;
