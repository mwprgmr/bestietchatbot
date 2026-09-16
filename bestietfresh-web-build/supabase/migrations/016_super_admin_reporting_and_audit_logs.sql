-- ============================================================
-- BESTIET FRESH: MIGRATION 016 - SUPER ADMIN, REPORTING & AUDIT LOGS
-- ============================================================

-- 1. Create public.user_roles Table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'branch_admin', 'staff', 'customer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_roles_user_role_key UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read user_roles" ON public.user_roles;
CREATE POLICY "Allow authenticated read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow service role full access user_roles" ON public.user_roles;
CREATE POLICY "Allow service role full access user_roles" ON public.user_roles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Upsert official Super Admin user
INSERT INTO public.user_roles (user_id, role)
VALUES ('b49445eb-1d03-4621-bc5c-b2156feb645b', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Create is_super_admin() Function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND (role = 'super_admin' OR role = 'admin')
    ) OR auth.uid() IN (
        'b49445eb-1d03-4621-bc5c-b2156feb645b'::uuid
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin TO anon, authenticated, service_role;

-- 3. Create public.chatbot_events Table
CREATE TABLE IF NOT EXISTS public.chatbot_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    customer_id UUID,
    phone TEXT,
    branch_id UUID REFERENCES public.branches(id),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    business_date DATE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
);

CREATE INDEX IF NOT EXISTS idx_chatbot_events_business_date ON public.chatbot_events(business_date);
CREATE INDEX IF NOT EXISTS idx_chatbot_events_branch_id ON public.chatbot_events(branch_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_events_event_type ON public.chatbot_events(event_type);
CREATE INDEX IF NOT EXISTS idx_chatbot_events_session_id ON public.chatbot_events(session_id);

ALTER TABLE public.chatbot_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert on chatbot_events" ON public.chatbot_events;
CREATE POLICY "Allow public insert on chatbot_events" ON public.chatbot_events FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated select on chatbot_events" ON public.chatbot_events;
CREATE POLICY "Allow authenticated select on chatbot_events" ON public.chatbot_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow service role full access chatbot_events" ON public.chatbot_events;
CREATE POLICY "Allow service role full access chatbot_events" ON public.chatbot_events FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Create public.audit_logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read audit_logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow service role full access audit_logs" ON public.audit_logs;
CREATE POLICY "Allow service role full access audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Audit log helper
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event TO anon, authenticated, service_role;

-- 5. RPC: get_super_admin_dashboard_summary
CREATE OR REPLACE FUNCTION public.get_super_admin_dashboard_summary(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_start DATE := COALESCE(p_start_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
    v_end DATE := COALESCE(p_end_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
    v_total_orders BIGINT := 0;
    v_total_revenue NUMERIC(12,2) := 0;
    v_total_customers BIGINT := 0;
    v_whatsapp_orders BIGINT := 0;
    v_website_orders BIGINT := 0;
    v_pending_orders BIGINT := 0;
    v_completed_orders BIGINT := 0;
    v_cancelled_orders BIGINT := 0;
    v_avg_order_value NUMERIC(12,2) := 0;
    v_total_quantity_sold NUMERIC(12,3) := 0;
    v_delivery_revenue NUMERIC(12,2) := 0;
    v_cod_revenue NUMERIC(12,2) := 0;
    v_online_revenue NUMERIC(12,2) := 0;
BEGIN
    SELECT
        COUNT(*),
        COALESCE(SUM(total), 0),
        COALESCE(SUM(CASE WHEN LOWER(source) = 'whatsapp' OR source IS NULL THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(source) = 'website' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(status) IN ('pending', 'accepted', 'preparing') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(status) IN ('delivered', 'completed') THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(delivery_charge), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'cod' OR payment_method IS NULL THEN total ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN LOWER(payment_method) = 'online' THEN total ELSE 0 END), 0)
    INTO
        v_total_orders,
        v_total_revenue,
        v_whatsapp_orders,
        v_website_orders,
        v_pending_orders,
        v_completed_orders,
        v_cancelled_orders,
        v_delivery_revenue,
        v_cod_revenue,
        v_online_revenue
    FROM public.orders
    WHERE business_date >= v_start
      AND business_date <= v_end
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND LOWER(COALESCE(source, 'whatsapp')) != 'test';

    IF v_total_orders > 0 THEN
        v_avg_order_value := ROUND(v_total_revenue / v_total_orders, 2);
    END IF;

    SELECT COUNT(DISTINCT id) INTO v_total_customers FROM public.customers;

    SELECT COALESCE(SUM(COALESCE(oi.quantity, oi.quantity_kg, 1)), 0)
    INTO v_total_quantity_sold
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.business_date >= v_start
      AND o.business_date <= v_end
      AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
      AND LOWER(o.status) NOT IN ('cancelled')
      AND LOWER(COALESCE(o.source, 'whatsapp')) != 'test';

    RETURN jsonb_build_object(
        'start_date', v_start,
        'end_date', v_end,
        'branch_id', p_branch_id,
        'total_orders', v_total_orders,
        'total_revenue', v_total_revenue,
        'total_customers', v_total_customers,
        'whatsapp_orders', v_whatsapp_orders,
        'website_orders', v_website_orders,
        'pending_orders', v_pending_orders,
        'completed_orders', v_completed_orders,
        'cancelled_orders', v_cancelled_orders,
        'avg_order_value', v_avg_order_value,
        'total_quantity_sold', v_total_quantity_sold,
        'delivery_revenue', v_delivery_revenue,
        'cod_revenue', v_cod_revenue,
        'online_revenue', v_online_revenue
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_super_admin_dashboard_summary TO anon, authenticated, service_role;

-- 6. RPC: get_chatbot_analytics
CREATE OR REPLACE FUNCTION public.get_chatbot_analytics(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_start DATE := COALESCE(p_start_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
    v_end DATE := COALESCE(p_end_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
    v_total_conversations BIGINT := 0;
    v_abandoned_conversations BIGINT := 0;
    v_cart_created BIGINT := 0;
    v_checkout_started BIGINT := 0;
    v_orders_created BIGINT := 0;
    v_completed_orders BIGINT := 0;
    v_failed_checkouts BIGINT := 0;
    v_no_inventory_events BIGINT := 0;
    v_cart_clears BIGINT := 0;
    v_event_counts JSONB := '{}'::jsonb;
BEGIN
    SELECT
        COUNT(*),
        COALESCE(SUM(CASE WHEN LOWER(state) IN ('idle', 'cancelled') AND updated_at < NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END), 0)
    INTO
        v_total_conversations,
        v_abandoned_conversations
    FROM public.chat_sessions
    WHERE (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND created_at::date >= v_start AND created_at::date <= v_end;

    SELECT jsonb_object_agg(event_type, event_count)
    INTO v_event_counts
    FROM (
        SELECT event_type, COUNT(*) as event_count
        FROM public.chatbot_events
        WHERE business_date >= v_start AND business_date <= v_end
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)
        GROUP BY event_type
    ) t;

    SELECT COALESCE(SUM(CASE WHEN event_type = 'CART_CREATED' THEN 1 ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN event_type = 'CHECKOUT_STARTED' THEN 1 ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN event_type = 'ORDER_CREATED' THEN 1 ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN event_type = 'ORDER_FAILED' THEN 1 ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN event_type = 'NO_INVENTORY' THEN 1 ELSE 0 END), 0),
           COALESCE(SUM(CASE WHEN event_type = 'CART_CLEARED' THEN 1 ELSE 0 END), 0)
    INTO
        v_cart_created,
        v_checkout_started,
        v_orders_created,
        v_failed_checkouts,
        v_no_inventory_events,
        v_cart_clears
    FROM public.chatbot_events
    WHERE business_date >= v_start AND business_date <= v_end
      AND (p_branch_id IS NULL OR branch_id = p_branch_id);

    SELECT COUNT(*) INTO v_completed_orders
    FROM public.orders
    WHERE business_date >= v_start AND business_date <= v_end
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND LOWER(status) IN ('delivered', 'completed')
      AND LOWER(COALESCE(source, 'whatsapp')) = 'whatsapp';

    RETURN jsonb_build_object(
        'start_date', v_start,
        'end_date', v_end,
        'branch_id', p_branch_id,
        'total_conversations', v_total_conversations,
        'abandoned_conversations', v_abandoned_conversations,
        'cart_created', v_cart_created,
        'checkout_started', v_checkout_started,
        'orders_created', v_orders_created,
        'completed_orders', v_completed_orders,
        'failed_checkouts', v_failed_checkouts,
        'no_inventory_events', v_no_inventory_events,
        'cart_clears', v_cart_clears,
        'event_counts', COALESCE(v_event_counts, '{}'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chatbot_analytics TO anon, authenticated, service_role;

-- 7. RPC: get_branch_comparison
CREATE OR REPLACE FUNCTION public.get_branch_comparison(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_start DATE := COALESCE(p_start_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
    v_end DATE := COALESCE(p_end_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
    v_branches JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'branch_id', b.id,
            'branch_name', b.name,
            'total_orders', COALESCE(o.total_orders, 0),
            'total_revenue', COALESCE(o.total_revenue, 0),
            'completed_orders', COALESCE(o.completed_orders, 0),
            'cancelled_orders', COALESCE(o.cancelled_orders, 0),
            'avg_order_value', COALESCE(o.avg_order_value, 0),
            'quantity_sold', COALESCE(q.total_qty, 0)
        )
    )
    INTO v_branches
    FROM public.branches b
    LEFT JOIN LATERAL (
        SELECT
            COUNT(*) as total_orders,
            COALESCE(SUM(total), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN LOWER(status) IN ('delivered', 'completed') THEN 1 ELSE 0 END), 0) as completed_orders,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled_orders,
            CASE WHEN COUNT(*) > 0 THEN ROUND(COALESCE(SUM(total), 0) / COUNT(*), 2) ELSE 0 END as avg_order_value
        FROM public.orders ord
        WHERE ord.branch_id = b.id
          AND ord.business_date >= v_start AND ord.business_date <= v_end
          AND LOWER(COALESCE(ord.source, 'whatsapp')) != 'test'
    ) o ON true
    LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(COALESCE(oi.quantity, oi.quantity_kg, 1)), 0) as total_qty
        FROM public.order_items oi
        JOIN public.orders ord ON ord.id = oi.order_id
        WHERE ord.branch_id = b.id
          AND ord.business_date >= v_start AND ord.business_date <= v_end
          AND LOWER(ord.status) != 'cancelled'
          AND LOWER(COALESCE(ord.source, 'whatsapp')) != 'test'
    ) q ON true;

    RETURN jsonb_build_object(
        'start_date', v_start,
        'end_date', v_end,
        'branches', COALESCE(v_branches, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_branch_comparison TO anon, authenticated, service_role;

-- 8. RPC: get_product_sales_report
CREATE OR REPLACE FUNCTION public.get_product_sales_report(
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_start DATE := COALESCE(p_start_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
    v_end DATE := COALESCE(p_end_date, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date);
    v_products JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_id', p.id,
            'product_name', p.name,
            'category', p.category,
            'unit', p.unit,
            'quantity_sold', COALESCE(s.qty_sold, 0),
            'revenue', COALESCE(s.total_rev, 0),
            'order_count', COALESCE(s.orders_cnt, 0),
            'avg_selling_price', CASE WHEN COALESCE(s.qty_sold, 0) > 0 THEN ROUND(COALESCE(s.total_rev, 0) / s.qty_sold, 2) ELSE p.price END
        )
        ORDER BY COALESCE(s.total_rev, 0) DESC
    )
    INTO v_products
    FROM public.products p
    LEFT JOIN LATERAL (
        SELECT
            SUM(COALESCE(oi.quantity, oi.quantity_kg, 1)) as qty_sold,
            SUM(oi.subtotal) as total_rev,
            COUNT(DISTINCT oi.order_id) as orders_cnt
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.product_id = p.id
          AND o.business_date >= v_start AND o.business_date <= v_end
          AND (p_branch_id IS NULL OR o.branch_id = p_branch_id)
          AND LOWER(o.status) != 'cancelled'
          AND LOWER(COALESCE(o.source, 'whatsapp')) != 'test'
    ) s ON true;

    RETURN jsonb_build_object(
        'start_date', v_start,
        'end_date', v_end,
        'branch_id', p_branch_id,
        'products', COALESCE(v_products, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_product_sales_report TO anon, authenticated, service_role;

-- Grant permissions across all schema objects
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
