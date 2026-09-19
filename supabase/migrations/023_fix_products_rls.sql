-- Migration 023: Enable Public Read Access for Products Table
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon products select" ON public.products;
DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;

CREATE POLICY "Allow anon products select" ON public.products FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON TABLE public.products TO anon, authenticated, service_role, postgres;
