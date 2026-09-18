-- Migration 024: Add App & WhatsApp Promo Banner columns to public.homepage_posters
ALTER TABLE public.homepage_posters
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS badge_text TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_message TEXT,
ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Seed default App Promo Poster
INSERT INTO public.homepage_posters (
  id, title, subtitle, badge_text, image_url, media_type, cta_link, whatsapp_number, whatsapp_message, qr_code_url, sort_order, active
) VALUES (
  'app-promo-banner',
  'Get Fresh Seafood & Meat on WhatsApp!',
  'For daily fresh catches, 30-minute doorstep delivery & exclusive discounts curated specially for you in Trivandrum.',
  'Bestiet Fresh WhatsApp Bot',
  'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://wa.me/919876543210',
  'app_promo',
  'https://wa.me/919876543210',
  '919876543210',
  'Hi Bestiet Fresh, I want to view today fresh catch menu!',
  'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://wa.me/919876543210',
  99,
  true
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  badge_text = EXCLUDED.badge_text,
  whatsapp_number = EXCLUDED.whatsapp_number,
  whatsapp_message = EXCLUDED.whatsapp_message,
  qr_code_url = EXCLUDED.qr_code_url,
  active = EXCLUDED.active;
