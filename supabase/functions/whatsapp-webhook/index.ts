import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const url = new URL(req.url)

  // 1. Webhook Verification Handshake (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    // Get verify token set in Supabase Secrets or fallback
    const expectedToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "bestiet_fresh_verify_token_2026"

    if (mode === "subscribe" && token === expectedToken) {
      console.log("WEBHOOK_VERIFIED")
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    }

    return new Response("Forbidden: Invalid verify token", { status: 403 })
  }

  // 2. Incoming Messages (POST)
  if (req.method === "POST") {
    try {
      const body = await req.json()
      console.log("Incoming Webhook Event:", JSON.stringify(body, null, 2))

      const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]

      if (!message) {
        return new Response(JSON.stringify({ status: "success", message: "No actionable message" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Deduplication Check
        const { data: existing } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("whatsapp_message_id", message.id)
          .single()

        if (existing) {
          return new Response(JSON.stringify({ status: "duplicate_ignored" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        }

        // Log Inbound Message
        await supabase.from("whatsapp_messages").insert([
          {
            whatsapp_message_id: message.id,
            phone: message.from,
            direction: "INBOUND",
            message_type: message.type,
            payload: message,
            status: "PROCESSED",
          },
        ])
      }

      return new Response(JSON.stringify({ status: "success" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    } catch (err: any) {
      console.error("Webhook processing error:", err)
      return new Response(JSON.stringify({ error: err.message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  return new Response("Method Not Allowed", { status: 405 })
})
