-- Migration 023: Add GPS Location columns to public.orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS maps_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_location ON public.orders (latitude, longitude) WHERE latitude IS NOT NULL;
