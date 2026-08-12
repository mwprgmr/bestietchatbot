import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  try {
    const { customer_id, address_id, items, delivery_fee, idempotency_key } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data, error } = await supabase.rpc("create_order_atomic", {
      p_customer_id: customer_id,
      p_address_id: address_id,
      p_items: items,
      p_delivery_fee: delivery_fee || 30.0,
      p_idempotency_key: idempotency_key,
    })

    if (error) throw error

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 })
  }
})
