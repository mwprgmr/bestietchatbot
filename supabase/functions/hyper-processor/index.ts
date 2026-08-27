import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Edge function hyper-processor receiving WhatsApp webhooks
serve(async (req) => {
  const url = new URL(req.url)

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")
    const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "bestiet_fresh_verify_token_2026"

    if (mode === "subscribe" && token === expectedToken) {
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    }
    return new Response("Forbidden", { status: 403 })
  }

  if (req.method === "POST") {
    try {
      const body = await req.json()
      console.log("hyper-processor payload received:", JSON.stringify(body))

      return new Response(JSON.stringify({ status: "success", processor: "hyper-processor" }), {
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
