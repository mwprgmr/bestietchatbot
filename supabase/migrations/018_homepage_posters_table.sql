CREATE TABLE IF NOT EXISTS public.homepage_posters (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT,
  image_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image',
  cta_link TEXT DEFAULT '/category/fish',
  sort_order INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS & public access
ALTER TABLE public.homepage_posters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for posters" ON public.homepage_posters;
CREATE POLICY "Public read access for posters" ON public.homepage_posters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admin full access on homepage posters" ON public.homepage_posters;
CREATE POLICY "Super admin full access on homepage posters" ON public.homepage_posters
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.homepage_posters TO postgres, service_role, anon, authenticated;

-- Seed default posters if empty
INSERT INTO public.homepage_posters 
(id, title, image_url, media_type, cta_link, sort_order, active)
VALUES
(
  'poster-1',
  'Fresh Catch Video Showcase',
  'https://assets.mixkit.co/videos/preview/mixkit-fresh-fish-and-seafood-in-a-market-display-42861-large.mp4',
  'video',
  '/category/fish',
  1,
  true
),
(
  'poster-2',
  'Fresh Seafood Selection',
  'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=1600&q=80',
  'image',
  '/category/fish',
  2,
  true
),
(
  'poster-3',
  'Tender Farm Chicken Banner',
  'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1600&q=80',
  'image',
  '/category/chicken',
  3,
  true
)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  image_url = EXCLUDED.image_url,
  media_type = EXCLUDED.media_type,
  cta_link = EXCLUDED.cta_link,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;

NOTIFY pgrst, 'reload schema';
