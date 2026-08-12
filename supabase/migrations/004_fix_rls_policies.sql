-- ==========================================
-- BESTIET FRESH: Fix RLS Policies Migration
-- ==========================================

-- Drop existing restricted policies if present
DROP POLICY IF EXISTS "Public products select" ON public.products;
DROP POLICY IF EXISTS "Public inventory select" ON public.inventory;
DROP POLICY IF EXISTS "Admin full products" ON public.products;
DROP POLICY IF EXISTS "Admin full inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admin full customers" ON public.customers;
DROP POLICY IF EXISTS "Admin full addresses" ON public.addresses;
DROP POLICY IF EXISTS "Admin full orders" ON public.orders;
DROP POLICY IF EXISTS "Admin full order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admin full inventory_movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Admin full chat_sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Admin full whatsapp_messages" ON public.whatsapp_messages;

-- Create permissive RLS policies for application access
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on addresses" ON public.addresses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on inventory_movements" ON public.inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on chat_sessions" ON public.chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
