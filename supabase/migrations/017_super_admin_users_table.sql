-- Migration 017: Super Admin Users Table and Authorization Setup

CREATE TABLE IF NOT EXISTS public.super_admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view super_admin_users table (to check authorization)
DROP POLICY IF EXISTS "Allow authenticated users to view super_admin_users" ON public.super_admin_users;
CREATE POLICY "Allow authenticated users to view super_admin_users"
    ON public.super_admin_users
    FOR SELECT
    TO authenticated
    USING (true);

-- Ensure initial super admin user exists
INSERT INTO public.super_admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'admin@bestietfresh.com'
ON CONFLICT (user_id) DO NOTHING;
