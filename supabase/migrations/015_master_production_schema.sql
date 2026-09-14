-- ============================================================
-- BESTIET FRESH: MIGRATION 015 - MASTER PRODUCTION SCHEMA
-- ============================================================

-- 1. Non-Negative Inventory Check Constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_stock_non_negative'
    ) THEN
        ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_stock_non_negative CHECK (available_stock >= 0);
    END IF;
END $$;

-- 2. Chatbot Dynamic Opening Message Table
CREATE TABLE IF NOT EXISTS public.chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    welcome_header TEXT NOT NULL DEFAULT '👋 *Welcome to Bestiet Fresh!* 🐟💚',
    additional_message TEXT DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Seed default global chatbot settings row if empty
INSERT INTO public.chatbot_settings (id, is_enabled, welcome_header, additional_message)
VALUES ('00000000-0000-0000-0000-000000000001', true, '👋 *Welcome to Bestiet Fresh!* 🐟💚', '🔥 Today''s Fresh Catch Available! Pre-book your fresh fish now.')
ON CONFLICT (id) DO NOTHING;

-- 3. Payment Status Audit Trail Table
CREATE TABLE IF NOT EXISTS public.payment_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_payment_status TEXT,
    new_payment_status TEXT NOT NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    paid_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Inventory Carry-Forward Tracking Table
CREATE TABLE IF NOT EXISTS public.inventory_carry_forward (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    carried_stock NUMERIC(10,3) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ACCEPTED', 'DECLINED')),
    decided_at TIMESTAMPTZ DEFAULT NOW(),
    decided_by TEXT,
    CONSTRAINT inventory_carry_forward_unique_key UNIQUE(branch_id, product_id, from_date, to_date)
);

-- 5. Mark Order Paid Atomic RPC
CREATE OR REPLACE FUNCTION public.mark_order_paid_atomic(
    p_order_id UUID,
    p_paid_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_curr_payment_status TEXT;
    v_order_number TEXT;
BEGIN
    SELECT payment_status, order_number INTO v_curr_payment_status, v_order_number
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_number IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Order ID % does not exist', p_order_id;
    END IF;

    IF UPPER(COALESCE(v_curr_payment_status, '')) = 'PAID' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Already marked as paid',
            'order_id', p_order_id,
            'already_paid', true
        );
    END IF;

    UPDATE public.orders
    SET payment_status = 'PAID',
        updated_at = NOW()
    WHERE id = p_order_id;

    INSERT INTO public.payment_audits (
        order_id, previous_payment_status, new_payment_status, paid_at, paid_by
    ) VALUES (
        p_order_id, v_curr_payment_status, 'PAID', NOW(), p_paid_by
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order_number,
        'previous_status', v_curr_payment_status,
        'payment_status', 'PAID',
        'paid_at', NOW()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_paid_atomic TO anon, authenticated, service_role;

-- 6. Cancel Order Atomic RPC with Stock Restoration
CREATE OR REPLACE FUNCTION public.cancel_order_atomic(
    p_order_id UUID,
    p_reason TEXT DEFAULT 'Cancelled by admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_record RECORD;
    v_item RECORD;
    v_inv_id UUID;
    v_target_date DATE;
BEGIN
    SELECT id, order_number, branch_id, status, payment_status, created_at
    INTO v_order_record
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_record.id IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist', p_order_id;
    END IF;

    IF UPPER(COALESCE(v_order_record.status, '')) = 'CANCELLED' THEN
        RETURN jsonb_build_object(
            'success', true,
            'order_id', p_order_id,
            'already_cancelled', true
        );
    END IF;

    v_target_date := (v_order_record.created_at AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- Loop through order items and restore stock atomically to exact (branch_id + product_id + business_date)
    FOR v_item IN SELECT product_id, quantity_kg FROM public.order_items WHERE order_id = p_order_id
    LOOP
        SELECT id INTO v_inv_id
        FROM public.inventory
        WHERE product_id = v_item.product_id
          AND branch_id = v_order_record.branch_id
          AND inventory_date = v_target_date
        FOR UPDATE;

        IF v_inv_id IS NOT NULL THEN
            UPDATE public.inventory
            SET available_stock = available_stock + v_item.quantity_kg,
                sold_stock = GREATEST(0, sold_stock - v_item.quantity_kg),
                status = 'available',
                updated_at = NOW()
            WHERE id = v_inv_id;

            INSERT INTO public.inventory_movements (
                inventory_id, product_id, movement_type, quantity_change, reason, reference_id
            ) VALUES (
                v_inv_id, v_item.product_id, 'ORDER_CANCELLED', v_item.quantity_kg,
                'Restored stock from cancelled order ' || v_order_record.order_number || ': ' || COALESCE(p_reason, ''),
                p_order_id
            );
        END IF;
    END LOOP;

    UPDATE public.orders
    SET status = 'CANCELLED',
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order_record.order_number,
        'status', 'CANCELLED',
        'payment_status', v_order_record.payment_status
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order_atomic TO anon, authenticated, service_role;

-- 7. Inventory Carry-Forward Decision Atomic RPC
CREATE OR REPLACE FUNCTION public.carry_forward_stock_atomic(
    p_branch_id UUID,
    p_product_id UUID,
    p_from_date DATE,
    p_to_date DATE,
    p_decision TEXT, -- 'ACCEPTED' or 'DECLINED'
    p_decided_by TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prev_avail NUMERIC(10,3);
    v_prev_price NUMERIC(10,2);
    v_today_inv_id UUID;
    v_actual_carry NUMERIC(10,3);
    v_decision_upper TEXT := UPPER(p_decision);
BEGIN
    IF v_decision_upper NOT IN ('ACCEPTED', 'DECLINED') THEN
        RAISE EXCEPTION 'INVALID_DECISION: Decision must be ACCEPTED or DECLINED';
    END IF;

    -- Re-read live DB stock from previous date FOR UPDATE to prevent stale UI carry-forwards
    SELECT available_stock, price_per_kg INTO v_prev_avail, v_prev_price
    FROM public.inventory
    WHERE branch_id = p_branch_id
      AND product_id = p_product_id
      AND inventory_date = p_from_date
    FOR UPDATE;

    v_actual_carry := COALESCE(v_prev_avail, 0);

    -- Insert/update carry forward tracking record
    INSERT INTO public.inventory_carry_forward (
        branch_id, product_id, from_date, to_date, carried_stock, status, decided_at, decided_by
    ) VALUES (
        p_branch_id, p_product_id, p_from_date, p_to_date, v_actual_carry, v_decision_upper, NOW(), p_decided_by
    )
    ON CONFLICT (branch_id, product_id, from_date, to_date) DO UPDATE SET
        carried_stock = EXCLUDED.carried_stock,
        status = EXCLUDED.status,
        decided_at = NOW(),
        decided_by = EXCLUDED.decided_by;

    IF v_decision_upper = 'ACCEPTED' AND v_actual_carry > 0 THEN
        -- Check if today's inventory row exists
        SELECT id INTO v_today_inv_id
        FROM public.inventory
        WHERE branch_id = p_branch_id
          AND product_id = p_product_id
          AND inventory_date = p_to_date
        FOR UPDATE;

        IF v_today_inv_id IS NULL THEN
            INSERT INTO public.inventory (
                branch_id, product_id, inventory_date, opening_stock, available_stock, reserved_stock, sold_stock, price_per_kg, status
            ) VALUES (
                p_branch_id, p_product_id, p_to_date, v_actual_carry, v_actual_carry, 0, 0, COALESCE(v_prev_price, 220), 'available'
            ) RETURNING id INTO v_today_inv_id;
        ELSE
            UPDATE public.inventory
            SET opening_stock = opening_stock + v_actual_carry,
                available_stock = available_stock + v_actual_carry,
                status = 'available',
                updated_at = NOW()
            WHERE id = v_today_inv_id;
        END IF;

        INSERT INTO public.inventory_movements (
            inventory_id, product_id, movement_type, quantity_change, reason
        ) VALUES (
            v_today_inv_id, p_product_id, 'CARRY_FORWARD', v_actual_carry,
            'Accepted carry forward of ' || v_actual_carry || 'kg from ' || p_from_date
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'branch_id', p_branch_id,
        'product_id', p_product_id,
        'from_date', p_from_date,
        'to_date', p_to_date,
        'decision', v_decision_upper,
        'carried_stock', v_actual_carry
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.carry_forward_stock_atomic TO anon, authenticated, service_role;

-- 8. Enable RLS and Configure Policies
ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_carry_forward ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow authenticated write chatbot_settings" ON public.chatbot_settings;
DROP POLICY IF EXISTS "Allow service role full access chatbot_settings" ON public.chatbot_settings;

CREATE POLICY "Allow public read chatbot_settings" ON public.chatbot_settings FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write chatbot_settings" ON public.chatbot_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access chatbot_settings" ON public.chatbot_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated select payment_audits" ON public.payment_audits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert payment_audits" ON public.payment_audits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow service role full access payment_audits" ON public.payment_audits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated select inventory_carry_forward" ON public.inventory_carry_forward FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert/update inventory_carry_forward" ON public.inventory_carry_forward FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access inventory_carry_forward" ON public.inventory_carry_forward FOR ALL TO service_role USING (true) WITH CHECK (true);
