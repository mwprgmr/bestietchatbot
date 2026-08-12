import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const todayStr = new Date().toISOString().split("T")[0]

    const { data, error } = await supabase
      .from("inventory")
      .select("*, product:products(*)")
      .eq("inventory_date", todayStr)
      .gt("available_stock", 0)

    if (error) throw error

    return new Response(JSON.stringify({ date: todayStr, in_stock_products: data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
