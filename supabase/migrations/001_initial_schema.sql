-- ==========================================
-- BESTIET FRESH: Initial Schema Migration
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT DEFAULT 'Fish',
    image_url TEXT,
    unit TEXT DEFAULT 'kg',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INVENTORY TABLE (Date-based)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_date DATE NOT NULL DEFAULT CURRENT_DATE,
    price_per_kg NUMERIC(10, 2) NOT NULL CHECK (price_per_kg >= 0),
    opening_stock NUMERIC(10, 3) NOT NULL CHECK (opening_stock >= 0),
    sold_stock NUMERIC(10, 3) DEFAULT 0 CHECK (sold_stock >= 0),
    reserved_stock NUMERIC(10, 3) DEFAULT 0 CHECK (reserved_stock >= 0),
    available_stock NUMERIC(10, 3) NOT NULL CHECK (available_stock >= 0),
    low_stock_threshold NUMERIC(10, 3) DEFAULT 2.000 CHECK (low_stock_threshold >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_product_date UNIQUE (product_id, inventory_date)
);

-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ADDRESSES TABLE
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Home',
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT DEFAULT 'Kochi',
    pincode TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    delivery_fee NUMERIC(10, 2) DEFAULT 30.00 CHECK (delivery_fee >= 0),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'PREPARING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
    payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CASH_ON_DELIVERY')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity_kg NUMERIC(10, 3) NOT NULL CHECK (quantity_kg > 0),
    cutting_type TEXT DEFAULT 'whole' CHECK (cutting_type IN ('whole', 'curry_cut', 'fry_cut', 'cleaned')),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVENTORY MOVEMENTS TABLE (Audit Trail)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('OPENING', 'SALE', 'RESTOCK', 'DAMAGED', 'MANUAL_ADJUSTMENT', 'CANCELLATION', 'RETURN')),
    quantity_change NUMERIC(10, 3) NOT NULL,
    reason TEXT,
    reference_id UUID,
    admin_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CHAT SESSIONS TABLE (State Machine Persistence)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
    state TEXT NOT NULL DEFAULT 'MAIN_MENU',
    cart JSONB DEFAULT '[]'::jsonb,
    selected_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    selected_quantity NUMERIC(10, 3),
    selected_cutting_type TEXT,
    selected_address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    last_message_id TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. WHATSAPP MESSAGES LOG (Deduplication & History)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    whatsapp_message_id TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    message_type TEXT DEFAULT 'text',
    payload JSONB,
    status TEXT DEFAULT 'PROCESSED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR FAST PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_inventory_product_date ON public.inventory(product_id, inventory_date);
CREATE INDEX IF NOT EXISTS idx_inventory_date ON public.inventory(inventory_date);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_customer ON public.chat_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_msgid ON public.whatsapp_messages(whatsapp_message_id);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active products & available inventory
CREATE POLICY "Public products select" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public inventory select" ON public.inventory FOR SELECT USING (true);

-- Authenticated users (admin) full permissions
CREATE POLICY "Admin full products" ON public.products FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin full inventory" ON public.inventory FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin full customers" ON public.customers FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin full addresses" ON public.addresses FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin full orders" ON public.orders FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin full order_items" ON public.order_items FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin full inventory_movements" ON public.inventory_movements FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin full chat_sessions" ON public.chat_sessions FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Admin full whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');
