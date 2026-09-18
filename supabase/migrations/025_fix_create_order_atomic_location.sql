-- Migration 025: Fix create_order_atomic location parameters persistence and RLS security

CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID,
    p_address_id UUID DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_inventory_date DATE DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_delivery_fee NUMERIC DEFAULT 35.00,
    p_branch_id UUID DEFAULT 'b1111111-1111-1111-1111-111111111111',
    p_customer_remarks TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL,
    p_maps_url TEXT DEFAULT NULL
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
    v_item JSONB;
    v_product_id UUID;
    v_weight_kg NUMERIC(10,3);
    v_pack_qty INT;
    v_total_kg NUMERIC(10,3);
    v_unit_price NUMERIC(10,2);
    v_cutting_type TEXT;
    v_item_subtotal NUMERIC(10,2);
    v_cart_subtotal NUMERIC(10,2) := 0;
    v_delivery_charge NUMERIC(10,2) := COALESCE(p_delivery_fee, 35.00);
    v_grand_total NUMERIC(10,2) := 0;
    v_inv_id UUID;
    v_curr_available NUMERIC(10,3);
    v_inv_price NUMERIC(10,2);
    v_product_name TEXT;
    v_branch_name TEXT;
    v_target_date DATE := COALESCE(p_inventory_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE);
    v_target_branch UUID := COALESCE(p_branch_id, 'b1111111-1111-1111-1111-111111111111');
    v_random_suffix TEXT;
    v_prev_avail NUMERIC(10,3);
    v_prev_price NUMERIC(10,2);
    v_phone TEXT;
    v_final_address TEXT;
    v_existing_order JSONB;
BEGIN
    -- 0. Validate Customer
    IF p_customer_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_CUSTOMER: Customer is required';
    END IF;

    -- 1. Check branch exists & active
    SELECT name INTO v_branch_name FROM public.branches WHERE id = v_target_branch AND is_active = true;
    IF v_branch_name IS NULL THEN
        RAISE EXCEPTION 'INVALID_BRANCH: Branch % does not exist or is inactive', v_target_branch;
    END IF;

    -- 2. Fallback customer phone and address from addresses/customers if not explicitly provided
    IF p_address_id IS NOT NULL THEN
        SELECT address_line INTO v_final_address FROM public.addresses WHERE id = p_address_id;
    END IF;
    SELECT phone INTO v_phone FROM public.customers WHERE id = p_customer_id;

    -- 3. Idempotency Check
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
            'idempotent_retry', true
        )
        INTO v_existing_order
        FROM public.orders
        WHERE idempotency_key = TRIM(p_idempotency_key)
        LIMIT 1;

        IF v_existing_order IS NOT NULL THEN
            RETURN v_existing_order;
        END IF;
    END IF;

    -- 4. Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Cart items cannot be empty';
    END IF;

    -- 5. LOOP 1: Validate stock & compute totals
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        
        -- Support weight_kg / quantity_kg
        v_weight_kg := COALESCE((v_item->>'weight_kg')::NUMERIC, (v_item->>'quantity_kg')::NUMERIC, (v_item->>'quantity')::NUMERIC, 0.5);
        v_pack_qty := COALESCE((v_item->>'quantity')::INT, 1);
        IF (v_item->>'quantity_kg') IS NOT NULL AND (v_item->>'weight_kg') IS NULL THEN
            v_total_kg := v_weight_kg;
        ELSE
            v_total_kg := v_weight_kg * v_pack_qty;
        END IF;

        IF v_total_kg <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Total weight must be greater than 0';
        END IF;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;
        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product ID % does not exist', v_product_id;
        END IF;

        -- Lock inventory row FOR UPDATE
        SELECT id, available_stock, price_per_kg INTO v_inv_id, v_curr_available, v_inv_price
        FROM public.inventory
        WHERE product_id = v_product_id 
          AND branch_id = v_target_branch 
          AND inventory_date = v_target_date
        FOR UPDATE;

        -- Automatic Carryover Fallback if today's inventory row is missing
        IF v_inv_id IS NULL THEN
            SELECT available_stock, price_per_kg INTO v_prev_avail, v_prev_price
            FROM public.inventory
            WHERE product_id = v_product_id
              AND branch_id = v_target_branch
              AND inventory_date <= v_target_date
              AND available_stock > 0
            ORDER BY inventory_date DESC
            LIMIT 1;

            IF v_prev_avail IS NOT NULL AND v_prev_avail > 0 THEN
                INSERT INTO public.inventory (
                    branch_id, product_id, inventory_date, opening_stock, available_stock, sold_stock, price_per_kg, status
                ) VALUES (
                    v_target_branch, v_product_id, v_target_date, v_prev_avail, v_prev_avail, 0, COALESCE(v_prev_price, 200), 'available'
                )
                ON CONFLICT (branch_id, product_id, inventory_date) DO UPDATE
                SET available_stock = EXCLUDED.available_stock, status = 'available'
                RETURNING id, available_stock, price_per_kg INTO v_inv_id, v_curr_available, v_inv_price;
            END IF;
        END IF;

        IF v_inv_id IS NULL THEN
            RAISE EXCEPTION 'NO_INVENTORY: Product % is not available at % for %', v_product_name, v_branch_name, v_target_date;
        END IF;

        IF v_curr_available < v_total_kg THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available at %', v_curr_available, v_product_name, v_branch_name;
        END IF;

        v_unit_price := COALESCE(v_inv_price, (v_item->>'price_per_kg')::NUMERIC, (v_item->>'unit_price')::NUMERIC, 200);
        v_item_subtotal := ROUND(v_total_kg * v_unit_price, 2);
        v_cart_subtotal := v_cart_subtotal + v_item_subtotal;
    END LOOP;

    -- Free delivery if subtotal >= 500
    IF v_cart_subtotal >= 500 THEN
        v_delivery_charge := 0;
    END IF;

    v_grand_total := v_cart_subtotal + v_delivery_charge;

    -- 6. Generate unique order number
    LOOP
        v_random_suffix := LPAD(CAST(FLOOR(RANDOM() * 9000 + 1000) AS TEXT), 4, '0');
        v_order_number := 'BF-' || TO_CHAR(v_target_date, 'YYYYMMDD') || '-' || v_random_suffix;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
    END LOOP;

    -- 7. Insert Order Record WITH LOCATION DATA (latitude, longitude, maps_url)
    INSERT INTO public.orders (
        order_number,
        customer_id,
        address_id,
        branch_id,
        subtotal,
        delivery_charge,
        total,
        total_amount,
        status,
        payment_status,
        payment_method,
        customer_remarks,
        idempotency_key,
        delivery_address,
        business_date,
        customer_phone,
        latitude,
        longitude,
        maps_url,
        order_channel
    ) VALUES (
        v_order_number,
        p_customer_id,
        p_address_id,
        v_target_branch,
        v_cart_subtotal,
        v_delivery_charge,
        v_grand_total,
        v_grand_total,
        'pending',
        'pending',
        'COD',
        p_customer_remarks,
        p_idempotency_key,
        v_final_address,
        v_target_date,
        v_phone,
        p_latitude,
        p_longitude,
        p_maps_url,
        'storefront'
    ) RETURNING id INTO v_order_id;

    -- 8. LOOP 2: Insert Order Items & Deduct Stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_weight_kg := COALESCE((v_item->>'weight_kg')::NUMERIC, (v_item->>'quantity_kg')::NUMERIC, (v_item->>'quantity')::NUMERIC, 0.5);
        v_pack_qty := COALESCE((v_item->>'quantity')::INT, 1);
        IF (v_item->>'quantity_kg') IS NOT NULL AND (v_item->>'weight_kg') IS NULL THEN
            v_total_kg := v_weight_kg;
        ELSE
            v_total_kg := v_weight_kg * v_pack_qty;
        END IF;
        v_cutting_type := COALESCE(v_item->>'cleaning_option', v_item->>'cutting_type', 'Whole');

        SELECT id, price_per_kg INTO v_inv_id, v_inv_price
        FROM public.inventory
        WHERE product_id = v_product_id 
          AND branch_id = v_target_branch 
          AND inventory_date = v_target_date
        FOR UPDATE;

        v_unit_price := COALESCE(v_inv_price, (v_item->>'price_per_kg')::NUMERIC, 200);
        v_item_subtotal := ROUND(v_total_kg * v_unit_price, 2);

        -- Insert order item
        INSERT INTO public.order_items (
            order_id, product_id, quantity, price_per_kg, cutting_type, total
        ) VALUES (
            v_order_id, v_product_id, v_total_kg, v_unit_price, v_cutting_type, v_item_subtotal
        );

        -- Deduct Stock
        UPDATE public.inventory
        SET available_stock = GREATEST(0, available_stock - v_total_kg),
            sold_stock = COALESCE(sold_stock, 0) + v_total_kg,
            status = CASE WHEN (available_stock - v_total_kg) <= 0 THEN 'out_of_stock' ELSE 'available' END,
            updated_at = NOW()
        WHERE id = v_inv_id;

        -- Insert Inventory Movement
        INSERT INTO public.inventory_movements (
            inventory_id, movement_type, quantity, reason, reference_id
        ) VALUES (
            v_inv_id, 'SALE', -v_total_kg,
            COALESCE('Order ' || v_order_number, 'Idempotency: ' || COALESCE(p_idempotency_key, '')),
            v_order_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'subtotal', v_cart_subtotal,
        'delivery_charge', v_delivery_charge,
        'total_amount', v_grand_total,
        'branch_id', v_target_branch,
        'status', 'pending'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic TO anon, authenticated, service_role, postgres;
