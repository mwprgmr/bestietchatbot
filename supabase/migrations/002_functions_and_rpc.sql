-- ==========================================
-- BESTIET FRESH: Stored Procedures & Atomic Functions
-- ==========================================

-- Function 1: ATOMIC ORDER CREATION (Prevents Overselling)
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID,
    p_address_id UUID,
    p_items JSONB,
    p_delivery_fee NUMERIC DEFAULT 30.00,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
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
    v_order_id UUID;
    v_order_number TEXT;
    v_today DATE := CURRENT_DATE;
    v_random_suffix TEXT;
    v_existing_order_id UUID;
BEGIN
    -- Check Idempotency key if provided via message ID / reference
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT reference_id INTO v_existing_order_id
        FROM public.inventory_movements
        WHERE reason = 'Idempotency: ' || p_idempotency_key
        LIMIT 1;

        IF v_existing_order_id IS NOT NULL THEN
            SELECT order_number INTO v_order_number FROM public.orders WHERE id = v_existing_order_id;
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_order_id,
                'order_number', v_order_number,
                'idempotent_retry', true
            );
        END IF;
    END IF;

    -- Step 1: Validate items array is not empty
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Cart items cannot be empty';
    END IF;

    -- Step 2: Calculate total amount and validate inventory for ALL items (Locks rows FOR UPDATE)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_cutting_type := COALESCE(v_item->>'cutting_type', 'whole');
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);

        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Quantity must be greater than 0';
        END IF;

        -- Lock relevant inventory row FOR UPDATE
        SELECT id, available_stock INTO v_inv_id, v_curr_available
        FROM public.inventory
        WHERE product_id = v_product_id AND inventory_date = v_today
        FOR UPDATE;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;

        IF v_inv_id IS NULL THEN
            RAISE EXCEPTION 'NO_INVENTORY: % is not available in today''s inventory', COALESCE(v_product_name, 'Selected fish');
        END IF;

        IF v_curr_available < v_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available (requested % kg)', v_curr_available, v_product_name, v_quantity;
        END IF;

        v_total_amount := v_total_amount + v_subtotal;
    END LOOP;

    v_total_amount := v_total_amount + COALESCE(p_delivery_fee, 30.00);

    -- Step 3: Generate unique order number (e.g., BF-20260812-4921)
    LOOP
        v_random_suffix := LPAD(CAST(FLOOR(RANDOM() * 9000 + 1000) AS TEXT), 4, '0');
        v_order_number := 'BF-' || TO_CHAR(v_today, 'YYYYMMDD') || '-' || v_random_suffix;

        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
    END LOOP;

    -- Step 4: Create Order record
    INSERT INTO public.orders (
        order_number,
        customer_id,
        address_id,
        total_amount,
        delivery_fee,
        status,
        payment_status
    ) VALUES (
        v_order_number,
        p_customer_id,
        p_address_id,
        v_total_amount,
        COALESCE(p_delivery_fee, 30.00),
        'PENDING',
        'CASH_ON_DELIVERY'
    ) RETURNING id INTO v_order_id;

    -- Step 5: Insert order_items, deduct inventory & write audit movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_cutting_type := COALESCE(v_item->>'cutting_type', 'whole');
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);

        -- Insert order line item
        INSERT INTO public.order_items (
            order_id,
            product_id,
            quantity_kg,
            cutting_type,
            unit_price,
            subtotal
        ) VALUES (
            v_order_id,
            v_product_id,
            v_quantity,
            v_cutting_type,
            v_unit_price,
            v_subtotal
        );

        -- Update inventory stock
        UPDATE public.inventory
        SET available_stock = available_stock - v_quantity,
            sold_stock = sold_stock + v_quantity,
            updated_at = NOW()
        WHERE product_id = v_product_id AND inventory_date = v_today
        RETURNING id INTO v_inv_id;

        -- Record audit movement
        INSERT INTO public.inventory_movements (
            inventory_id,
            product_id,
            movement_type,
            quantity_change,
            reason,
            reference_id
        ) VALUES (
            v_inv_id,
            v_product_id,
            'SALE',
            -v_quantity,
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


-- Function 2: ATOMIC ORDER CANCELLATION & STOCK RESTORATION
CREATE OR REPLACE FUNCTION public.cancel_order_atomic(
    p_order_id UUID,
    p_reason TEXT DEFAULT 'Cancelled by customer/admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_status TEXT;
    v_order_number TEXT;
    v_item RECORD;
    v_inv_id UUID;
BEGIN
    SELECT status, order_number INTO v_order_status, v_order_number
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_status IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Order does not exist';
    END IF;

    IF v_order_status = 'CANCELLED' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Order already cancelled', 'order_number', v_order_number);
    END IF;

    IF v_order_status IN ('DELIVERED') THEN
        RAISE EXCEPTION 'CANNOT_CANCEL: Order has already been delivered';
    END IF;

    -- Update Order status
    UPDATE public.orders
    SET status = 'CANCELLED',
        cancellation_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Restore Stock for order items
    FOR v_item IN
        SELECT product_id, quantity_kg
        FROM public.order_items
        WHERE order_id = p_order_id
    LOOP
        -- Find today's or most recent inventory record for this product
        SELECT id INTO v_inv_id
        FROM public.inventory
        WHERE product_id = v_item.product_id AND inventory_date = CURRENT_DATE
        FOR UPDATE;

        IF v_inv_id IS NOT NULL THEN
            UPDATE public.inventory
            SET available_stock = available_stock + v_item.quantity_kg,
                sold_stock = GREATEST(0, sold_stock - v_item.quantity_kg),
                updated_at = NOW()
            WHERE id = v_inv_id;

            INSERT INTO public.inventory_movements (
                inventory_id,
                product_id,
                movement_type,
                quantity_change,
                reason,
                reference_id
            ) VALUES (
                v_inv_id,
                v_item.product_id,
                'CANCELLATION',
                v_item.quantity_kg,
                'Order cancellation ' || v_order_number || ': ' || COALESCE(p_reason, ''),
                p_order_id
            );
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order_number,
        'status', 'CANCELLED'
    );
END;
$$;


-- Function 3: MANUAL INVENTORY STOCK ADJUSTMENT
CREATE OR REPLACE FUNCTION public.adjust_inventory_stock(
    p_inventory_id UUID,
    p_adjustment_qty NUMERIC,
    p_movement_type TEXT,
    p_reason TEXT DEFAULT 'Manual adjustment',
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_curr_available NUMERIC(10,3);
    v_new_available NUMERIC(10,3);
    v_product_id UUID;
BEGIN
    SELECT available_stock, product_id INTO v_curr_available, v_product_id
    FROM public.inventory
    WHERE id = p_inventory_id
    FOR UPDATE;

    IF v_curr_available IS NULL THEN
        RAISE EXCEPTION 'INVENTORY_NOT_FOUND: Inventory record not found';
    END IF;

    v_new_available := v_curr_available + p_adjustment_qty;

    IF v_new_available < 0 THEN
        RAISE EXCEPTION 'INVALID_ADJUSTMENT: Resulting available stock cannot be negative (Current: %)', v_curr_available;
    END IF;

    UPDATE public.inventory
    SET available_stock = v_new_available,
        updated_at = NOW()
    WHERE id = p_inventory_id;

    INSERT INTO public.inventory_movements (
        inventory_id,
        product_id,
        movement_type,
        quantity_change,
        reason,
        admin_id
    ) VALUES (
        p_inventory_id,
        v_product_id,
        p_movement_type,
        p_adjustment_qty,
        p_reason,
        p_admin_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'inventory_id', p_inventory_id,
        'previous_available', v_curr_available,
        'new_available', v_new_available
    );
END;
$$;
