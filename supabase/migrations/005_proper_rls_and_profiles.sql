-- ==========================================
-- BESTIET FRESH: Secure RLS & Profiles Migration
-- ==========================================

-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'store_admin', 'customer')),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'store_admin')
        )
    );

-- Helper Function: Check if Authenticated User is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'store_admin')
  );
$$;

-- Trigger to Automatically Create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE 
      WHEN NEW.email LIKE '%admin%' THEN 'admin'
      ELSE 'customer'
    END,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Store Admin')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. RE-SECURE PRODUCTS TABLE RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Drop insecure open policies
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
DROP POLICY IF EXISTS "Public products select" ON public.products;
DROP POLICY IF EXISTS "Admin full products" ON public.products;

-- SECURE PRODUCTS RLS POLICIES:
-- Everyone (Public & Customers) can view active products
CREATE POLICY "Public read products" ON public.products
    FOR SELECT USING (active = true OR public.is_admin() OR auth.role() = 'service_role');

-- ONLY Authenticated Admins / Store-Admins can INSERT products
CREATE POLICY "Admin insert products" ON public.products
    FOR INSERT
    WITH CHECK (
        public.is_admin() OR auth.role() = 'service_role'
    );

-- ONLY Authenticated Admins / Store-Admins can UPDATE products
CREATE POLICY "Admin update products" ON public.products
    FOR UPDATE
    USING (
        public.is_admin() OR auth.role() = 'service_role'
    );

-- ONLY Authenticated Admins / Store-Admins can DELETE products
CREATE POLICY "Admin delete products" ON public.products
    FOR DELETE
    USING (
        public.is_admin() OR auth.role() = 'service_role'
    );

-- 3. RE-SECURE INVENTORY TABLE RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on inventory" ON public.inventory;

CREATE POLICY "Public read inventory" ON public.inventory
    FOR SELECT USING (true);

CREATE POLICY "Admin manage inventory" ON public.inventory
    FOR ALL USING (
        public.is_admin() OR auth.role() = 'service_role'
    );

-- 4. RE-SECURE ORDERS & CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations on orders" ON public.orders;
DROP POLICY IF EXISTS "Allow all operations on chat_sessions" ON public.chat_sessions;

CREATE POLICY "Admin or service read customers" ON public.customers
    FOR SELECT USING (public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Admin or service insert customers" ON public.customers
    FOR INSERT WITH CHECK (public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Admin or service update customers" ON public.customers
    FOR UPDATE USING (public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Admin or service read orders" ON public.orders
    FOR SELECT USING (public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Admin or service manage orders" ON public.orders
    FOR ALL USING (public.is_admin() OR auth.role() = 'service_role');

CREATE POLICY "Service or admin manage chat_sessions" ON public.chat_sessions
    FOR ALL USING (public.is_admin() OR auth.role() = 'service_role');
