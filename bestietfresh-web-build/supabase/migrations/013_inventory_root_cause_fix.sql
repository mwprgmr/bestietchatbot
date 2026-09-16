-- ============================================================
-- BESTIET FRESH: MIGRATION 013 - PRODUCTION INVENTORY ROOT-CAUSE FIX
-- ============================================================

-- 1. Explicitly drop obsolete RPC overloads that lack branch_id or use outdated schemas
DROP FUNCTION IF EXISTS public.reserve_stock(UUID, DATE, NUMERIC);
DROP FUNCTION IF EXISTS public.get_available_product(TEXT);
DROP FUNCTION IF EXISTS public.get_available_product(TEXT, DATE);

-- 2. Create Authoritative Branch-Isolated Available Inventory Helper Function
CREATE OR REPLACE FUNCTION public.get_available_branch_inventory(
    p_branch_id UUID,
    p_inventory_date DATE DEFAULT NULL
)
RETURNS TABLE (
    inventory_id UUID,
    branch_id UUID,
    product_id UUID,
    product_name TEXT,
    available_stock NUMERIC(10,3),
    price_per_kg NUMERIC(10,2),
    inventory_date DATE,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_date DATE := COALESCE(p_inventory_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE);
BEGIN
    RETURN QUERY
    SELECT 
        i.id AS inventory_id,
        i.branch_id,
        i.product_id,
        p.name AS product_name,
        i.available_stock,
        i.price_per_kg,
        i.inventory_date,
        i.status
    FROM public.inventory i
    JOIN public.products p ON p.id = i.product_id
    WHERE i.branch_id = p_branch_id
      AND i.inventory_date = v_date
      AND i.available_stock > 0
      AND i.status = 'available'
      AND p.active IS NOT FALSE
    ORDER BY p.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_branch_inventory TO anon, authenticated, service_role;

-- 3. Branch-Mandatory Stock Reservation Function
CREATE OR REPLACE FUNCTION public.reserve_stock(
    p_branch_id UUID,
    p_product_id UUID,
    p_inventory_date DATE,
    p_quantity NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inv_id UUID;
    v_curr_available NUMERIC(10,3);
    v_price_per_kg NUMERIC(10,2);
    v_product_name TEXT;
    v_branch_name TEXT;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than 0';
    END IF;

    SELECT name INTO v_branch_name FROM public.branches WHERE id = p_branch_id AND is_active = true;
    IF v_branch_name IS NULL THEN
        RAISE EXCEPTION 'INVALID_BRANCH: Branch ID % is invalid or inactive', p_branch_id;
    END IF;

    SELECT name INTO v_product_name FROM public.products WHERE id = p_product_id;
    IF v_product_name IS NULL THEN
        RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product ID % does not exist', p_product_id;
    END IF;

    -- Lock exact row FOR UPDATE by (branch_id + product_id + inventory_date)
    SELECT id, available_stock, price_per_kg INTO v_inv_id, v_curr_available, v_price_per_kg
    FROM public.inventory
    WHERE product_id = p_product_id
      AND branch_id = p_branch_id
      AND inventory_date = p_inventory_date
    FOR UPDATE;

    IF v_inv_id IS NULL THEN
        RAISE EXCEPTION 'NO_INVENTORY: % is not available at % for %', v_product_name, v_branch_name, p_inventory_date;
    END IF;

    IF v_curr_available < p_quantity THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available at % (requested % kg)', v_curr_available, v_product_name, v_branch_name, p_quantity;
    END IF;

    -- Deduct available stock and add to reserved stock
    UPDATE public.inventory
    SET available_stock = available_stock - p_quantity,
        reserved_stock = COALESCE(reserved_stock, 0) + p_quantity,
        status = CASE WHEN (available_stock - p_quantity) <= 0 THEN 'out_of_stock' ELSE 'available' END,
        updated_at = NOW()
    WHERE id = v_inv_id;

    -- Record movement
    INSERT INTO public.inventory_movements (
        inventory_id, product_id, movement_type, quantity_change, reason
    ) VALUES (
        v_inv_id, p_product_id, 'RESERVATION', -p_quantity, 'Stock reservation'
    );

    RETURN jsonb_build_object(
        'success', true,
        'inventory_id', v_inv_id,
        'branch_id', p_branch_id,
        'product_id', p_product_id,
        'price_per_kg', v_price_per_kg,
        'reserved_quantity', p_quantity
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_stock TO anon, authenticated, service_role;

-- 4. Canonical Atomic Order Creation RPC
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID,
    p_address_id UUID,
    p_items JSONB,
    p_inventory_date DATE DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL,
    p_delivery_fee NUMERIC DEFAULT 30.00,
    p_branch_id UUID DEFAULT 'b1111111-1111-1111-1111-111111111111',
    p_customer_remarks TEXT DEFAULT NULL,
    p_latitude NUMERIC DEFAULT NULL,
    p_longitude NUMERIC DEFAULT NULL,
    p_maps_url TEXT DEFAULT NULL
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
    v_quantity NUMERIC(10,3);
    v_unit_price NUMERIC(10,2);
    v_cutting_type TEXT;
    v_subtotal NUMERIC(10,2);
    v_total_amount NUMERIC(10,2) := 0;
    v_inv_id UUID;
    v_curr_available NUMERIC(10,3);
    v_inv_price NUMERIC(10,2);
    v_product_name TEXT;
    v_branch_name TEXT;
    v_target_date DATE := COALESCE(p_inventory_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE);
    v_target_branch UUID := COALESCE(p_branch_id, 'b1111111-1111-1111-1111-111111111111');
    v_random_suffix TEXT;
    v_lat NUMERIC(10, 7) := p_latitude;
    v_lng NUMERIC(10, 7) := p_longitude;
    v_map TEXT := p_maps_url;
BEGIN
    -- Check branch exists & active
    SELECT name INTO v_branch_name FROM public.branches WHERE id = v_target_branch AND is_active = true;
    IF v_branch_name IS NULL THEN
        RAISE EXCEPTION 'INVALID_BRANCH: Branch % does not exist or is inactive', v_target_branch;
    END IF;

    -- Fallback location from address record if not directly supplied
    IF v_lat IS NULL AND p_address_id IS NOT NULL THEN
        SELECT latitude, longitude, maps_url INTO v_lat, v_lng, v_map
        FROM public.addresses WHERE id = p_address_id;
    END IF;

    -- Generate maps_url if coordinates are provided but URL is empty
    IF v_lat IS NOT NULL AND v_lng IS NOT NULL AND (v_map IS NULL OR v_map = '') THEN
        v_map := 'https://www.google.com/maps?q=' || v_lat || ',' || v_lng;
    END IF;

    -- Check Idempotency key if provided
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT reference_id INTO v_order_id
        FROM public.inventory_movements
        WHERE reason LIKE '%' || p_idempotency_key || '%'
        LIMIT 1;

        IF v_order_id IS NOT NULL THEN
            SELECT order_number, total_amount INTO v_order_number, v_total_amount
            FROM public.orders
            WHERE id = v_order_id;

            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_order_id,
                'order_number', v_order_number,
                'total_amount', v_total_amount,
                'idempotent_retry', true
            );
        END IF;
    END IF;

    -- Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Cart items cannot be empty';
    END IF;

    -- LOOP 1: Validate inventory and lock rows FOR UPDATE using exact (branch_id + product_id + inventory_date)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than 0';
        END IF;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;
        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product ID % does not exist', v_product_id;
        END IF;

        -- Lock branch inventory row for specified date and fetch official inventory price
        SELECT id, available_stock, price_per_kg INTO v_inv_id, v_curr_available, v_inv_price
        FROM public.inventory
        WHERE product_id = v_product_id 
          AND branch_id = v_target_branch 
          AND inventory_date = v_target_date
        FOR UPDATE;

        IF v_inv_id IS NULL THEN
            RAISE EXCEPTION 'NO_INVENTORY: Selected fish is not available at % for %', v_branch_name, v_target_date;
        END IF;

        IF v_curr_available < v_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available at %', v_curr_available, v_product_name, v_branch_name;
        END IF;

        -- Mandate unit_price comes directly from the inventory row price_per_kg
        v_unit_price := COALESCE(v_inv_price, (v_item->>'unit_price')::NUMERIC, 220);
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);
        v_total_amount := v_total_amount + v_subtotal;
    END LOOP;

    v_total_amount := v_total_amount + COALESCE(p_delivery_fee, 30.00);

    -- Generate unique order number
    LOOP
        v_random_suffix := LPAD(CAST(FLOOR(RANDOM() * 9000 + 1000) AS TEXT), 4, '0');
        v_order_number := 'BF-' || TO_CHAR(v_target_date, 'YYYYMMDD') || '-' || v_random_suffix;

        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
    END LOOP;

    -- Create Order record
    INSERT INTO public.orders (
        order_number,
        customer_id,
        address_id,
        branch_id,
        total_amount,
        delivery_fee,
        status,
        payment_status,
        customer_remarks,
        latitude,
        longitude,
        maps_url
    ) VALUES (
        v_order_number,
        p_customer_id,
        p_address_id,
        v_target_branch,
        v_total_amount,
        COALESCE(p_delivery_fee, 30.00),
        'PENDING',
        'CASH_ON_DELIVERY',
        p_customer_remarks,
        v_lat,
        v_lng,
        v_map
    ) RETURNING id INTO v_order_id;

    -- LOOP 2: Insert order items & deduct stock per product accurately
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_cutting_type := COALESCE(v_item->>'cutting_type', 'whole');

        -- Re-lock exact inventory record for this product
        SELECT id, price_per_kg INTO v_inv_id, v_inv_price
        FROM public.inventory
        WHERE product_id = v_product_id 
          AND branch_id = v_target_branch 
          AND inventory_date = v_target_date
        FOR UPDATE;

        v_unit_price := COALESCE(v_inv_price, (v_item->>'unit_price')::NUMERIC, 220);
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);

        INSERT INTO public.order_items (
            order_id, product_id, quantity_kg, cutting_type, unit_price, subtotal
        ) VALUES (
            v_order_id, v_product_id, v_quantity, v_cutting_type, v_unit_price, v_subtotal
        );

        UPDATE public.inventory
        SET available_stock = available_stock - v_quantity,
            sold_stock = sold_stock + v_quantity,
            status = CASE WHEN (available_stock - v_quantity) <= 0 THEN 'out_of_stock' ELSE 'available' END,
            updated_at = NOW()
        WHERE id = v_inv_id;

        INSERT INTO public.inventory_movements (
            inventory_id, product_id, movement_type, quantity_change, reason, reference_id
        ) VALUES (
            v_inv_id, v_product_id, 'SALE', -v_quantity,
            COALESCE('Customer order ' || v_order_number, 'Idempotency: ' || COALESCE(p_idempotency_key, '')),
            v_order_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total_amount,
        'branch_id', v_target_branch,
        'status', 'PENDING',
        'latitude', v_lat,
        'longitude', v_lng,
        'maps_url', v_map
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_atomic TO anon, authenticated, service_role;
