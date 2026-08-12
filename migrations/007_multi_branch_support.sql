-- ==========================================
-- BESTIET FRESH: Multi-Branch Support & Remarks Migration
-- ==========================================

-- 1. Create BRANCHES Table
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public branches select" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Admin full branches" ON public.branches FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Seed Default Branches with predictable UUIDs
INSERT INTO public.branches (id, name, location, is_active)
VALUES 
    ('b1111111-1111-1111-1111-111111111111', 'Marine Drive Branch', 'Marine Drive, Kochi', true),
    ('b2222222-2222-2222-2222-222222222222', 'Fort Kochi Branch', 'Fort Kochi, Kochi', true)
ON CONFLICT (name) DO UPDATE
SET location = EXCLUDED.location, is_active = EXCLUDED.is_active;

-- 2. Add branch_id to INVENTORY Table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) DEFAULT 'b1111111-1111-1111-1111-111111111111';

-- Update existing inventory rows to default to Marine Drive Branch
UPDATE public.inventory SET branch_id = 'b1111111-1111-1111-1111-111111111111' WHERE branch_id IS NULL;

-- 3. Add branch_id and customer_remarks to ORDERS Table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) DEFAULT 'b1111111-1111-1111-1111-111111111111',
ADD COLUMN IF NOT EXISTS customer_remarks TEXT;

-- Update existing orders to default branch
UPDATE public.orders SET branch_id = 'b1111111-1111-1111-1111-111111111111' WHERE branch_id IS NULL;

-- 4. Add selected_branch_id and pending_remarks to CHAT_SESSIONS Table
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS selected_branch_id UUID REFERENCES public.branches(id),
ADD COLUMN IF NOT EXISTS pending_remarks TEXT;

-- 5. Helper Function: SECURITY DEFINER Upsert Branch
CREATE OR REPLACE FUNCTION public.upsert_branch_sec(
    p_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    IF p_name IS NULL OR p_name = '' THEN
        RAISE EXCEPTION 'Branch name cannot be empty';
    END IF;

    IF p_id IS NOT NULL THEN
        UPDATE public.branches
        SET name = p_name,
            location = p_location,
            is_active = COALESCE(p_is_active, true),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING * INTO v_result;
    ELSE
        INSERT INTO public.branches (name, location, is_active)
        VALUES (p_name, p_location, COALESCE(p_is_active, true))
        ON CONFLICT (name) DO UPDATE
        SET location = EXCLUDED.location,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING * INTO v_result;
    END IF;

    RETURN to_jsonb(v_result);
END;
$$;

-- 6. Update ATOMIC ORDER CREATION RPC to accept branch_id and customer_remarks
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_customer_id UUID,
    p_address_id UUID,
    p_items JSONB,
    p_delivery_fee NUMERIC DEFAULT 30.00,
    p_idempotency_key TEXT DEFAULT NULL,
    p_branch_id UUID DEFAULT 'b1111111-1111-1111-1111-111111111111',
    p_customer_remarks TEXT DEFAULT NULL
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
    v_target_branch UUID := COALESCE(p_branch_id, 'b1111111-1111-1111-1111-111111111111');
BEGIN
    -- Check Idempotency key if provided
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

    -- Validate items array is not empty
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_CART: Cart items cannot be empty';
    END IF;

    -- Calculate total amount and validate inventory for ALL items (Locks rows FOR UPDATE)
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

        -- Lock relevant inventory row FOR UPDATE matching branch_id (or fallback to any branch row if branch specific row isn't bound)
        SELECT id, available_stock INTO v_inv_id, v_curr_available
        FROM public.inventory
        WHERE product_id = v_product_id AND inventory_date = v_today AND (branch_id = v_target_branch OR branch_id IS NULL)
        ORDER BY branch_id DESC NULLS LAST
        LIMIT 1
        FOR UPDATE;

        SELECT name INTO v_product_name FROM public.products WHERE id = v_product_id;

        IF v_inv_id IS NULL THEN
            RAISE EXCEPTION 'NO_INVENTORY: % is not available in today''s inventory for selected branch', COALESCE(v_product_name, 'Selected fish');
        END IF;

        IF v_curr_available < v_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Only % kg of % is available (requested % kg)', v_curr_available, v_product_name, v_quantity;
        END IF;

        v_total_amount := v_total_amount + v_subtotal;
    END LOOP;

    v_total_amount := v_total_amount + COALESCE(p_delivery_fee, 30.00);

    -- Generate unique order number (e.g., BF-20260812-4921)
    LOOP
        v_random_suffix := LPAD(CAST(FLOOR(RANDOM() * 9000 + 1000) AS TEXT), 4, '0');
        v_order_number := 'BF-' || TO_CHAR(v_today, 'YYYYMMDD') || '-' || v_random_suffix;

        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_order_number);
    END LOOP;

    -- Create Order record
    INSERT INTO public.orders (
        order_number,
        customer_id,
        address_id,
        branch_id,
        customer_remarks,
        total_amount,
        delivery_fee,
        status,
        payment_status
    ) VALUES (
        v_order_number,
        p_customer_id,
        p_address_id,
        v_target_branch,
        p_customer_remarks,
        v_total_amount,
        COALESCE(p_delivery_fee, 30.00),
        'PENDING',
        'CASH_ON_DELIVERY'
    ) RETURNING id INTO v_order_id;

    -- Insert order_items, deduct inventory & write audit movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity_kg')::NUMERIC;
        v_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_cutting_type := COALESCE(v_item->>'cutting_type', 'whole');
        v_subtotal := ROUND(v_quantity * v_unit_price, 2);

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

        UPDATE public.inventory
        SET available_stock = available_stock - v_quantity,
            sold_stock = sold_stock + v_quantity,
            updated_at = NOW()
        WHERE product_id = v_product_id AND inventory_date = v_today AND (branch_id = v_target_branch OR branch_id IS NULL)
        RETURNING id INTO v_inv_id;

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
        'branch_id', v_target_branch,
        'status', 'PENDING'
    );
END;
$$;

-- 7. Update SECURITY DEFINER Chat Session Upsert
CREATE OR REPLACE FUNCTION public.upsert_chat_session_sec(
    p_customer_id UUID,
    p_state TEXT DEFAULT 'MAIN_MENU',
    p_cart JSONB DEFAULT '[]'::jsonb,
    p_selected_product_id UUID DEFAULT NULL,
    p_selected_quantity NUMERIC DEFAULT NULL,
    p_selected_cutting_type TEXT DEFAULT NULL,
    p_selected_address_id UUID DEFAULT NULL,
    p_selected_branch_id UUID DEFAULT NULL,
    p_pending_remarks TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    INSERT INTO public.chat_sessions (
        customer_id, state, cart, selected_product_id, selected_quantity, selected_cutting_type, selected_address_id, selected_branch_id, pending_remarks, updated_at
    ) VALUES (
        p_customer_id, p_state, COALESCE(p_cart, '[]'::jsonb), p_selected_product_id, p_selected_quantity, p_selected_cutting_type, p_selected_address_id, p_selected_branch_id, p_pending_remarks, NOW()
    )
    ON CONFLICT (customer_id) DO UPDATE
    SET state = COALESCE(EXCLUDED.state, public.chat_sessions.state),
        cart = COALESCE(EXCLUDED.cart, public.chat_sessions.cart),
        selected_product_id = EXCLUDED.selected_product_id,
        selected_quantity = EXCLUDED.selected_quantity,
        selected_cutting_type = EXCLUDED.selected_cutting_type,
        selected_address_id = EXCLUDED.selected_address_id,
        selected_branch_id = EXCLUDED.selected_branch_id,
        pending_remarks = EXCLUDED.pending_remarks,
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_branch_sec TO anon, authenticated, service_role;
