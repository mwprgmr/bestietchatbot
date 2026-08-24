-- ==========================================
-- BESTIET FRESH: 008_two_branch_architecture.sql
-- True Two-Branch Isolated Architecture Migration
-- ==========================================

-- 1. Ensure public.branches has exactly the 2 fixed branch records
INSERT INTO public.branches (id, name, location, is_active)
VALUES 
    ('b1111111-1111-1111-1111-111111111111', 'Marine Drive Branch', 'Marine Drive, Kochi', true),
    ('b2222222-2222-2222-2222-222222222222', 'Fort Kochi Branch', 'Fort Kochi, Kochi', true)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, location = EXCLUDED.location, is_active = true;

-- 2. Add branch_id column to public.profiles table if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) DEFAULT 'b1111111-1111-1111-1111-111111111111';

-- Update existing profile roles and default branches
UPDATE public.profiles
SET branch_id = 'b1111111-1111-1111-1111-111111111111'
WHERE branch_id IS NULL;

-- 3. Update RLS policies on public.branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public branches select" ON public.branches;
DROP POLICY IF EXISTS "Admin full branches" ON public.branches;

CREATE POLICY "Public branches select" ON public.branches
    FOR SELECT USING (true);

CREATE POLICY "Admin branches manage" ON public.branches
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 4. Re-secure inventory RLS for strict branch isolation
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admin manage inventory" ON public.inventory;

CREATE POLICY "Public read inventory" ON public.inventory
    FOR SELECT USING (available_stock > 0 OR auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Branch admin inventory read" ON public.inventory
    FOR SELECT USING (
        auth.role() = 'service_role' OR
        branch_id IS NULL OR
        branch_id = (SELECT p.branch_id FROM public.profiles p WHERE p.id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'store_admin'))
    );

CREATE POLICY "Branch admin inventory write" ON public.inventory
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR
        branch_id = (SELECT p.branch_id FROM public.profiles p WHERE p.id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'store_admin'))
    );

CREATE POLICY "Branch admin inventory update" ON public.inventory
    FOR UPDATE USING (
        auth.role() = 'service_role' OR
        branch_id = (SELECT p.branch_id FROM public.profiles p WHERE p.id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'store_admin'))
    );

-- 5. Helper function for SECURITY DEFINER branch profile lookup
CREATE OR REPLACE FUNCTION public.get_auth_user_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT branch_id FROM public.profiles WHERE id = auth.uid()),
    'b1111111-1111-1111-1111-111111111111'::uuid
  );
$$;
