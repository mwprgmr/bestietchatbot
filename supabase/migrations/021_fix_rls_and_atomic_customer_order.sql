-- Migration 021: Fix Row Level Security (RLS) Policies & Add Auto-Customer Atomic Order RPC

-- 1. Enable RLS and Grant Permissions on Core E-Commerce Tables
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if any to prevent conflicts
DROP POLICY IF EXISTS "Allow anon customer insert" ON public.customers;
DROP POLICY IF EXISTS "Allow anon customer select" ON public.customers;
DROP POLICY IF EXISTS "Allow anon customer update" ON public.customers;

DROP POLICY IF EXISTS "Allow anon order insert" ON public.orders;
DROP POLICY IF EXISTS "Allow anon order select" ON public.orders;
DROP POLICY IF EXISTS "Allow anon order update" ON public.orders;

DROP POLICY IF EXISTS "Allow anon order_items insert" ON public.order_items;
DROP POLICY IF EXISTS "Allow anon order_items select" ON public.order_items;

DROP POLICY IF EXISTS "Allow anon inventory select" ON public.inventory;
DROP POLICY IF EXISTS "Allow anon inventory update" ON public.inventory;

DROP POLICY IF EXISTS "Allow anon inventory_movements insert" ON public.inventory_movements;
DROP POLICY IF EXISTS "Allow anon inventory_movements select" ON public.inventory_movements;

-- Create Permissive RLS Policies for Customer Checkout
CREATE POLICY "Allow anon customer insert" ON public.customers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon customer select" ON public.customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon customer update" ON public.customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon order insert" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon order select" ON public.orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon order update" ON public.orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon order_items insert" ON public.order_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon order_items select" ON public.order_items FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anon inventory select" ON public.inventory FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon inventory update" ON public.inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon inventory_movements insert" ON public.inventory_movements FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon inventory_movements select" ON public.inventory_movements FOR SELECT TO anon, authenticated USING (true);

-- Grant privileges to anon and authenticated roles
GRANT ALL ON TABLE public.customers TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.orders TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.order_items TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.inventory TO anon, authenticated, service_role, postgres;
GRANT ALL ON TABLE public.inventory_movements TO anon, authenticated, service_role, postgres;

-- 2. Enhanced Atomic Order RPC with Auto-Customer Upsert
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
    p_customer_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
BEGIN
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
        v_qty_kg := COALESCE((v_item->>'quantity_kg')::numeric, 0.5);
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

    -- Insert Order
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
        maps_url
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
        p_maps_url
    )
    RETURNING id INTO v_order_id;

    -- Insert Order Items & Deduct Inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::uuid;
        v_qty_kg := COALESCE((v_item->>'quantity_kg')::numeric, 0.5);
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
                'Order ' || v_order_number || ' (WEBSITE)',
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
        'branch_id', v_target_branch
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic TO anon, authenticated, service_role, postgres;
