import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

async function sendWhatsAppTextMessage(toPhoneNumber: string, textResponse: string) {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "1126837613855957"
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || Deno.env.get("WHATSAPP_TOKEN")

  if (!phoneNumberId || !token) {
    console.error("Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in Supabase Secrets")
    return
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toPhoneNumber,
          type: "text",
          text: { body: textResponse },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      console.error("WhatsApp API Send Error:", JSON.stringify(data, null, 2))
    }
    return data
  } catch (err: any) {
    console.error("WhatsApp API Network Failure:", err.message)
  }
}

serve(async (req) => {
  const url = new URL(req.url)

  // 1. Webhook Verification Handshake (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

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

      const entry = body?.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      const message = value?.messages?.[0]

      if (message) {
        const from = message.from // Sender phone number
        const messageId = message.id
        const type = message.type
        const userText = (message.text?.body || "").trim()

        console.log(`Received message from ${from}: "${userText}"`)

        // Save Inbound Record to Database
        const supabaseUrl = Deno.env.get("SUPABASE_URL")
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          await supabase.from("whatsapp_messages").insert([
            {
              whatsapp_message_id: messageId,
              phone: from,
              direction: "INBOUND",
              message_type: type,
              payload: message,
              status: "PROCESSED",
            },
          ])
        }

        // Generate Bot Response Greeting/Catalog
        let botReplyText = ""

        if (["hi", "hello", "start", "menu"].includes(userText.toLowerCase())) {
          botReplyText = `👋 *Welcome to Bestiet Fresh!* 🐟💚\n"Your Fresh Friend At The Door"\n\nHow can we serve you fresh fish today?\n\n1. 🛒 *Order Fresh Fish*\n2. 📦 *Track Order*\n3. 🔄 *Previous Orders*\n\nReply with item name or number to start!`
        } else {
          botReplyText = `🐟 *Bestiet Fresh Catch Today*\n1. Ayala — ₹33/kg\n2. Mathi — ₹40/kg\n\nReply with the fish name or quantity (e.g., "1kg Ayala") to order!`
        }

        // Dispatch outbound text back to WhatsApp user
        if (from && botReplyText) {
          await sendWhatsAppTextMessage(from, botReplyText)
        }
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
