-- ============================================================
-- BESTIET FRESH: MIGRATION 014 - ADMIN BRANCH ASSIGNMENTS & RLS FIX
-- ============================================================

-- 1. Create public.profiles table if missing
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'branch_admin',
    branch_id UUID REFERENCES public.branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ensure admin_branch_assignments table exists with unique constraint
CREATE TABLE IF NOT EXISTS public.admin_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT admin_branch_assignments_user_branch_key UNIQUE(user_id, branch_id)
);

-- 3. Upsert exact admin branch assignments for official admin users
INSERT INTO public.admin_branch_assignments (user_id, branch_id)
VALUES 
    ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111'), -- manvila@bestietfresh.com
    ('6d7a0d41-04fe-4b75-842c-4e5ef65d4226', 'b2222222-2222-2222-2222-222222222222'), -- peroorkada@bestietfresh.com
    ('9b6c5134-dd8a-4670-868c-311c2d22b396', 'b1111111-1111-1111-1111-111111111111'), -- marinedrive@bestietfresh.com
    ('a0e7beee-a56e-4096-927b-c23164d6e14e', 'b2222222-2222-2222-2222-222222222222'), -- fortkochi@bestietfresh.com
    ('b49445eb-1d03-4621-bc5c-b2156feb645b', 'b1111111-1111-1111-1111-111111111111')  -- admin@bestietfresh.com
ON CONFLICT (user_id, branch_id) DO NOTHING;

-- 4. Upsert profiles for admin users
INSERT INTO public.profiles (id, email, name, role, branch_id)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'manvila@bestietfresh.com', 'Manvila Kazhakkoottam Branch Admin', 'branch_admin', 'b1111111-1111-1111-1111-111111111111'),
    ('6d7a0d41-04fe-4b75-842c-4e5ef65d4226', 'peroorkada@bestietfresh.com', 'Peroorkada Branch Admin', 'branch_admin', 'b2222222-2222-2222-2222-222222222222'),
    ('9b6c5134-dd8a-4670-868c-311c2d22b396', 'marinedrive@bestietfresh.com', 'Manvila Branch Admin', 'branch_admin', 'b1111111-1111-1111-1111-111111111111'),
    ('a0e7beee-a56e-4096-927b-c23164d6e14e', 'fortkochi@bestietfresh.com', 'Peroorkada Branch Admin', 'branch_admin', 'b2222222-2222-2222-2222-222222222222'),
    ('b49445eb-1d03-4621-bc5c-b2156feb645b', 'admin@bestietfresh.com', 'Super Admin', 'admin', 'b1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    branch_id = EXCLUDED.branch_id;

-- 5. Enable RLS and Configure Authoritative Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow service role full access orders" ON public.orders;
DROP POLICY IF EXISTS "Allow service role full access order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow service role full access customers" ON public.customers;
DROP POLICY IF EXISTS "Allow service role full access inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow service role full access inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Allow service role full access branches" ON public.branches;
DROP POLICY IF EXISTS "Allow service role full access products" ON public.products;
DROP POLICY IF EXISTS "Allow service role full access assignments" ON public.admin_branch_assignments;
DROP POLICY IF EXISTS "Allow service role full access profiles" ON public.profiles;

DROP POLICY IF EXISTS "Allow authenticated branch admins select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated branch admins update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated branch admins select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow authenticated read branches" ON public.branches;
DROP POLICY IF EXISTS "Allow authenticated read products" ON public.products;
DROP POLICY IF EXISTS "Allow authenticated read assignments" ON public.admin_branch_assignments;
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated branch admins select customers" ON public.customers;
DROP POLICY IF EXISTS "Allow authenticated branch admins select inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow authenticated branch admins update inventory" ON public.inventory;

-- Service Role Policies (Bypass RLS for backend API/Edge Functions)
CREATE POLICY "Allow service role full access orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access order_items" ON public.order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access customers" ON public.customers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access inventory" ON public.inventory FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access inventory_movements" ON public.inventory_movements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access branches" ON public.branches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access assignments" ON public.admin_branch_assignments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow service role full access profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated Admin Read Policies
CREATE POLICY "Allow authenticated read branches" ON public.branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read assignments" ON public.admin_branch_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated branch admins select customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated branch admins select inventory" ON public.inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated branch admins update inventory" ON public.inventory FOR UPDATE TO authenticated USING (true);

-- Branch Admin Orders Isolation Policy
CREATE POLICY "Allow authenticated branch admins select orders" ON public.orders FOR SELECT TO authenticated USING (
    branch_id IN (
        SELECT branch_id FROM public.admin_branch_assignments WHERE user_id = auth.uid()
    ) OR branch_id IS NULL OR auth.uid() IN ('b49445eb-1d03-4621-bc5c-b2156feb645b')
);

CREATE POLICY "Allow authenticated branch admins update orders" ON public.orders FOR UPDATE TO authenticated USING (
    branch_id IN (
        SELECT branch_id FROM public.admin_branch_assignments WHERE user_id = auth.uid()
    ) OR branch_id IS NULL OR auth.uid() IN ('b49445eb-1d03-4621-bc5c-b2156feb645b')
);

CREATE POLICY "Allow authenticated branch admins select order_items" ON public.order_items FOR SELECT TO authenticated USING (true);
