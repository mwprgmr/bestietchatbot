-- ==========================================
-- BESTIET FRESH: Chat Messages & Address Policies
-- ==========================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    phone TEXT,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
    text TEXT NOT NULL,
    buttons JSONB,
    list_sections JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Enable & Grant Access Policies for chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public select on chat_messages" 
ON public.chat_messages FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public insert on chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public insert on chat_messages" 
ON public.chat_messages FOR INSERT TO public WITH CHECK (true);

-- RLS Enable & Grant Access Policies for addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on addresses" ON public.addresses;
CREATE POLICY "Allow public select on addresses" 
ON public.addresses FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public insert on addresses" ON public.addresses;
CREATE POLICY "Allow public insert on addresses" 
ON public.addresses FOR INSERT TO public WITH CHECK (true);
