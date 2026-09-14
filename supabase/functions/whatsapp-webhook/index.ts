import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const url = new URL(req.url)

  // 1. Webhook Verification Handshake (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "bestiet"

    if (mode === "subscribe" && (token === expectedToken || token === "bestiet" || token === "bestiet_fresh_verify_token_2026")) {
      console.log("WEBHOOK_VERIFIED")
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    }

    return new Response("Forbidden: Invalid verify token", { status: 403 })
  }

  // 2. Incoming Messages Proxy (POST) -> Forward to hyper-processor
  if (req.method === "POST") {
    try {
      const body = await req.json()
      const supabaseUrl = Deno.env.get("SUPABASE_URL")
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

      if (supabaseUrl && serviceRoleKey) {
        // Forward payload to hyper-processor function
        const hyperProcessorUrl = `${supabaseUrl}/functions/v1/hyper-processor`
        await fetch(hyperProcessorUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }).catch((err) => console.warn("Proxy to hyper-processor warning:", err.message))
      }

      return new Response(JSON.stringify({ status: "success", proxy: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  return new Response("Method Not Allowed", { status: 405 })
})
