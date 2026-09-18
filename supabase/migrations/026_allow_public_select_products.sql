-- Migration 026: Enable public SELECT policy on products catalog and storefront tables

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_posters ENABLE ROW LEVEL SECURITY;

-- 1. Create public SELECT policies for storefront catalog display
DROP POLICY IF EXISTS "Allow public select on products" ON public.products;
CREATE POLICY "Allow public select on products"
ON public.products FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public select on inventory" ON public.inventory;
CREATE POLICY "Allow public select on inventory"
ON public.inventory FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public select on branches" ON public.branches;
CREATE POLICY "Allow public select on branches"
ON public.branches FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public select on homepage_categories" ON public.homepage_categories;
CREATE POLICY "Allow public select on homepage_categories"
ON public.homepage_categories FOR SELECT
TO public, anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow public select on homepage_posters" ON public.homepage_posters;
CREATE POLICY "Allow public select on homepage_posters"
ON public.homepage_posters FOR SELECT
TO public, anon, authenticated
USING (true);

-- 2. Grant table permissions to public, anon, authenticated
GRANT SELECT ON TABLE public.products TO anon, authenticated, public, service_role;
GRANT SELECT ON TABLE public.inventory TO anon, authenticated, public, service_role;
GRANT SELECT ON TABLE public.branches TO anon, authenticated, public, service_role;
GRANT SELECT ON TABLE public.homepage_categories TO anon, authenticated, public, service_role;
GRANT SELECT ON TABLE public.homepage_posters TO anon, authenticated, public, service_role;
