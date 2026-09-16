-- ==========================================
-- BESTIET FRESH: Security Definer Helper Procedures & RLS Fix
-- ==========================================

-- 1. SECURITY DEFINER: Upsert Product (Bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.upsert_product_sec(
    p_id UUID DEFAULT NULL,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT 'Fish',
    p_unit TEXT DEFAULT 'kg',
    p_image_url TEXT DEFAULT NULL,
    p_active BOOLEAN DEFAULT true,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prod_id UUID;
    v_result RECORD;
BEGIN
    IF p_name IS NULL OR p_name = '' THEN
        RAISE EXCEPTION 'Fish name cannot be empty';
    END IF;

    IF p_id IS NOT NULL THEN
        UPDATE public.products
        SET name = p_name,
            description = p_description,
            category = COALESCE(p_category, 'Fish'),
            unit = COALESCE(p_unit, 'kg'),
            image_url = p_image_url,
            active = COALESCE(p_active, true),
            created_by = COALESCE(public.products.created_by, p_created_by),
            updated_at = NOW()
        WHERE id = p_id
        RETURNING * INTO v_result;
        v_prod_id := p_id;
    ELSE
        INSERT INTO public.products (
            name, description, category, unit, image_url, active, created_by
        ) VALUES (
            p_name, p_description, COALESCE(p_category, 'Fish'), COALESCE(p_unit, 'kg'), p_image_url, COALESCE(p_active, true), p_created_by
        )
        ON CONFLICT (name) DO UPDATE
        SET description = EXCLUDED.description,
            category = EXCLUDED.category,
            unit = EXCLUDED.unit,
            image_url = EXCLUDED.image_url,
            active = EXCLUDED.active,
            updated_at = NOW()
        RETURNING * INTO v_result;
        v_prod_id := v_result.id;
    END IF;

    RETURN to_jsonb(v_result);
END;
$$;


-- 2. SECURITY DEFINER: Delete Product
CREATE OR REPLACE FUNCTION public.delete_product_sec(p_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.products WHERE id = p_id;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN foreign_key_violation THEN
    UPDATE public.products SET active = false WHERE id = p_id;
    RETURN jsonb_build_object('success', true, 'deactivated', true);
END;
$$;


-- 3. SECURITY DEFINER: Upsert Customer
CREATE OR REPLACE FUNCTION public.upsert_customer_sec(
    p_phone TEXT,
    p_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    INSERT INTO public.customers (phone, name)
    VALUES (p_phone, COALESCE(p_name, 'Customer ' || right(p_phone, 4)))
    ON CONFLICT (phone) DO UPDATE
    SET name = COALESCE(EXCLUDED.name, public.customers.name),
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;


-- 4. SECURITY DEFINER: Upsert Chat Session
CREATE OR REPLACE FUNCTION public.upsert_chat_session_sec(
    p_customer_id UUID,
    p_state TEXT DEFAULT 'MAIN_MENU',
    p_cart JSONB DEFAULT '[]'::jsonb,
    p_selected_product_id UUID DEFAULT NULL,
    p_selected_quantity NUMERIC DEFAULT NULL,
    p_selected_cutting_type TEXT DEFAULT NULL,
    p_selected_address_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    INSERT INTO public.chat_sessions (
        customer_id, state, cart, selected_product_id, selected_quantity, selected_cutting_type, selected_address_id, updated_at
    ) VALUES (
        p_customer_id, p_state, COALESCE(p_cart, '[]'::jsonb), p_selected_product_id, p_selected_quantity, p_selected_cutting_type, p_selected_address_id, NOW()
    )
    ON CONFLICT (customer_id) DO UPDATE
    SET state = COALESCE(EXCLUDED.state, public.chat_sessions.state),
        cart = COALESCE(EXCLUDED.cart, public.chat_sessions.cart),
        selected_product_id = EXCLUDED.selected_product_id,
        selected_quantity = EXCLUDED.selected_quantity,
        selected_cutting_type = EXCLUDED.selected_cutting_type,
        selected_address_id = EXCLUDED.selected_address_id,
        updated_at = NOW()
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;


-- 5. SECURITY DEFINER: Upsert Inventory
CREATE OR REPLACE FUNCTION public.upsert_inventory_sec(
    p_product_id UUID,
    p_inventory_date DATE,
    p_price_per_kg NUMERIC,
    p_opening_stock NUMERIC,
    p_low_stock_threshold NUMERIC DEFAULT 2.0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    INSERT INTO public.inventory (
        product_id, inventory_date, price_per_kg, opening_stock, available_stock, sold_stock, reserved_stock, low_stock_threshold, updated_at
    ) VALUES (
        p_product_id, p_inventory_date, p_price_per_kg, p_opening_stock, p_opening_stock, 0, 0, COALESCE(p_low_stock_threshold, 2.0), NOW()
    )
    ON CONFLICT (product_id, inventory_date) DO UPDATE
    SET price_per_kg = EXCLUDED.price_per_kg,
        opening_stock = EXCLUDED.opening_stock,
        available_stock = EXCLUDED.opening_stock,
        low_stock_threshold = EXCLUDED.low_stock_threshold,
        updated_at = NOW()
    RETURNING * INTO v_result;

    -- Record opening movement
    INSERT INTO public.inventory_movements (
        inventory_id, product_id, movement_type, quantity_change, reason
    ) VALUES (
        v_result.id, p_product_id, 'OPENING', p_opening_stock, 'Opening stock set for ' || p_inventory_date
    );

    RETURN to_jsonb(v_result);
END;
$$;


-- 6. SECURITY DEFINER: Upsert Address
CREATE OR REPLACE FUNCTION public.upsert_address_sec(
    p_customer_id UUID,
    p_address_line1 TEXT,
    p_title TEXT DEFAULT 'Home',
    p_city TEXT DEFAULT 'Kochi',
    p_pincode TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result RECORD;
BEGIN
    INSERT INTO public.addresses (
        customer_id, title, address_line1, city, pincode, is_default
    ) VALUES (
        p_customer_id, COALESCE(p_title, 'Home'), p_address_line1, COALESCE(p_city, 'Kochi'), p_pincode, true
    )
    RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;


-- Grant execution permissions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.upsert_product_sec TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_product_sec TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_customer_sec TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_chat_session_sec TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_inventory_sec TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.upsert_address_sec TO anon, authenticated, service_role;
