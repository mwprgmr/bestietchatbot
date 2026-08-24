-- ============================================================
-- BESTIET FRESH: TWO-BRANCH CLEANUP & RPC UPDATE MIGRATION
-- ============================================================

-- 1. Ensure public.branches table has ONLY the 2 fixed branches
INSERT INTO public.branches (id, name, location, is_active)
VALUES 
  ('b1111111-1111-1111-1111-111111111111', 'Marine Drive Branch', 'Marine Drive, Kochi', true),
  ('b2222222-2222-2222-2222-222222222222', 'Fort Kochi Branch', 'Fort Kochi, Kochi', true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, location = EXCLUDED.location, is_active = true;

DELETE FROM public.branches 
WHERE id NOT IN ('b1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222');

-- 2. Populate branch_id for existing unassigned orders
UPDATE public.orders
SET branch_id = 'b1111111-1111-1111-1111-111111111111'
WHERE branch_id IS NULL;

-- 3. Update create_order_atomic RPC function to strictly associate branch_id and return order details
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID,
    p_address_id UUID,
    p_items JSONB,
    p_inventory_date DATE DEFAULT CURRENT_DATE,
    p_idempotency_key TEXT DEFAULT NULL,
    p_delivery_fee NUMERIC DEFAULT 30.00,
    p_branch_id UUID DEFAULT 'b1111111-1111-1111-1111-111111111111',
    p_customer_remarks TEXT DEFAULT NULL
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
    v_quantity NUMERIC;
    v_unit_price NUMERIC;
    v_cutting_type TEXT;
    v_subtotal NUMERIC;
    v_total_amount NUMERIC := 0;
    v_inv_id UUID;
    v_curr_available NUMERIC;
    v_product_name TEXT;
    v_today DATE := COALESCE(p_inventory_date, CURRENT_DATE);
    v_random_suffix TEXT;
    v_branch_id UUID;
BEGIN
    v_branch_id := COALESCE(p_branch_id, 'b1111111-1111-1111-1111-111111111111'::uuid);

    -- Check idempotency
    IF p_idempotency_key IS NOT NULL THEN
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
                'message', 'Idempotent request — order already processed'
            );
        END IF;
    END IF;

    -- Validate items array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Cart items cannot be empty';
    END IF;

    -- Calculate total amount & lock stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than 0';
        END IF;

        -- Lock branch inventory row
        SELECT id, available_stock INTO v_inv_id, v_curr_available
        FROM public.inventory
        WHERE product_id = v_product_id 
          AND inventory_date = v_today 
          AND (branch_id = v_branch_id OR branch_id IS NULL)
        FOR UPDATE;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;

        IF v_inv_id IS NULL THEN
            RAISE EXCEPTION 'NO_INVENTORY: % is not available in today''s menu', COALESCE(v_product_name, 'Selected fish');
        END IF;

        IF v_curr_available < v_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available', v_curr_available, v_product_name;
        END IF;

        v_total_amount := v_total_amount + v_subtotal;
    END LOOP;

    v_total_amount := v_total_amount + COALESCE(p_delivery_fee, 30.00);

    -- Generate unique order number (e.g. BF-20260824-4921)
    LOOP
        v_random_suffix := LPAD(CAST(FLOOR(RANDOM() * 9000 + 1000) AS TEXT), 4, '0');
        v_order_number := 'BF-' || TO_CHAR(v_today, 'YYYYMMDD') || '-' || v_random_suffix;

        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
    END LOOP;

    -- Create Order with branch_id
    INSERT INTO public.orders (
        order_number,
        customer_id,
        address_id,
        branch_id,
        total_amount,
        delivery_fee,
        status,
        payment_status,
        customer_remarks
    ) VALUES (
        v_order_number,
        p_customer_id,
        p_address_id,
        v_branch_id,
        v_total_amount,
        COALESCE(p_delivery_fee, 30.00),
        'PENDING',
        'CASH_ON_DELIVERY',
        p_customer_remarks
    ) RETURNING id INTO v_order_id;

    -- Insert order items & deduct stock
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
            updated_at = NOW()
        WHERE product_id = v_product_id 
          AND inventory_date = v_today 
          AND (branch_id = v_branch_id OR branch_id IS NULL)
        RETURNING id INTO v_inv_id;

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
        'status', 'PENDING'
    );
END;
$$;
