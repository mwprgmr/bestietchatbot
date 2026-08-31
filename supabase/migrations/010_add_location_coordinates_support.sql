-- ============================================================
-- BESTIET FRESH: MIGRATION 010 - LOCATION COORDINATES & MAPS SUPPORT
-- ============================================================

-- Add location coordinates to addresses table
ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS maps_url TEXT;

-- Add location coordinates to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS maps_url TEXT;

-- Update atomic order creation function to store location coordinates
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
    v_product_name TEXT;
    v_branch_name TEXT;
    v_target_date DATE := COALESCE(p_inventory_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::DATE);
    v_target_branch UUID := COALESCE(p_branch_id, 'b1111111-1111-1111-1111-111111111111');
    v_random_suffix TEXT;
    v_lat NUMERIC(10, 7) := p_latitude;
    v_lng NUMERIC(10, 7) := p_longitude;
    v_map TEXT := p_maps_url;
BEGIN
    -- Check branch exists
    SELECT name INTO v_branch_name FROM public.branches WHERE id = v_target_branch;
    IF v_branch_name IS NULL THEN
        v_target_branch := 'b1111111-1111-1111-1111-111111111111';
        SELECT name INTO v_branch_name FROM public.branches WHERE id = v_target_branch;
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

    -- Validate inventory and lock row FOR UPDATE using exact (branch_id + product_id + inventory_date)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than 0';
        END IF;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;
        IF v_product_name IS NULL THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product ID % does not exist', v_product_id;
        END IF;

        SELECT id, available_stock INTO v_inv_id, v_curr_available
        FROM public.inventory
        WHERE product_id = v_product_id 
          AND branch_id = v_target_branch 
          AND inventory_date = v_target_date
        FOR UPDATE;

        IF v_inv_id IS NULL THEN
            RAISE EXCEPTION 'NO_INVENTORY: % is not available at % for %', v_product_name, COALESCE(v_branch_name, 'selected branch'), v_target_date;
        END IF;

        IF v_curr_available < v_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available at % (requested % kg)', v_curr_available, v_product_name, v_branch_name, v_quantity;
        END IF;

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

    -- Insert order items & deduct stock atomically
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_cutting_type := COALESCE(v_item->>'cutting_type', 'whole');
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
