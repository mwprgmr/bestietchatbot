-- ==========================================
-- BESTIET FRESH: Seed Data Migration
-- ==========================================

-- Insert Default Products Catalogue
INSERT INTO public.products (name, description, category, unit, image_url, active)
VALUES 
    ('Ayala', 'Fresh Mackerel fish caught daily, ideal for traditional Kerala curry or crispy fry.', 'Fish', 'kg', 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=600&q=80', true),
    ('Karimeen', 'Pearl Spot fish from Alleppey backwaters, perfect for Karimeen Pollichathu.', 'Fish', 'kg', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80', true),
    ('Prawns', 'Juicy jumbo prawns, cleaned and deveined, rich in flavor.', 'Shellfish', 'kg', 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80', true),
    ('Crab', 'Fresh sea crabs with sweet meat, ideal for spicy roast or curry.', 'Shellfish', 'kg', 'https://images.unsplash.com/photo-1559737525-27a3c3c7e7dd?auto=format&fit=crop&w=600&q=80', true),
    ('King Fish', 'Premium Seer Fish (Surmai/Neymeen), thick steaks perfect for frying.', 'Fish', 'kg', 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80', true)
ON CONFLICT (name) DO UPDATE 
SET active = EXCLUDED.active,
    description = EXCLUDED.description;

-- Insert Seed Inventory for Today
DO $$
DECLARE
    v_ayala_id UUID;
    v_karimeen_id UUID;
    v_prawns_id UUID;
    v_crab_id UUID;
    v_king_id UUID;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT id INTO v_ayala_id FROM public.products WHERE name = 'Ayala';
    SELECT id INTO v_karimeen_id FROM public.products WHERE name = 'Karimeen';
    SELECT id INTO v_prawns_id FROM public.products WHERE name = 'Prawns';
    SELECT id INTO v_crab_id FROM public.products WHERE name = 'Crab';
    SELECT id INTO v_king_id FROM public.products WHERE name = 'King Fish';

    -- Ayala: 15kg @ ₹220
    IF v_ayala_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, inventory_date, price_per_kg, opening_stock, available_stock, low_stock_threshold)
        VALUES (v_ayala_id, v_today, 220.00, 15.000, 15.000, 2.000)
        ON CONFLICT (product_id, inventory_date) DO NOTHING;
    END IF;

    -- Karimeen: 8kg @ ₹480
    IF v_karimeen_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, inventory_date, price_per_kg, opening_stock, available_stock, low_stock_threshold)
        VALUES (v_karimeen_id, v_today, 480.00, 8.000, 8.000, 2.000)
        ON CONFLICT (product_id, inventory_date) DO NOTHING;
    END IF;

    -- Prawns: 6kg @ ₹420
    IF v_prawns_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, inventory_date, price_per_kg, opening_stock, available_stock, low_stock_threshold)
        VALUES (v_prawns_id, v_today, 420.00, 6.000, 6.000, 2.000)
        ON CONFLICT (product_id, inventory_date) DO NOTHING;
    END IF;

    -- Crab: 5kg @ ₹550
    IF v_crab_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, inventory_date, price_per_kg, opening_stock, available_stock, low_stock_threshold)
        VALUES (v_crab_id, v_today, 550.00, 5.000, 5.000, 2.000)
        ON CONFLICT (product_id, inventory_date) DO NOTHING;
    END IF;

    -- King Fish: 9kg @ ₹650
    IF v_king_id IS NOT NULL THEN
        INSERT INTO public.inventory (product_id, inventory_date, price_per_kg, opening_stock, available_stock, low_stock_threshold)
        VALUES (v_king_id, v_today, 650.00, 9.000, 9.000, 2.000)
        ON CONFLICT (product_id, inventory_date) DO NOTHING;
    END IF;
END;
$$;
