import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GRAPH_API_URL = "https://graph.facebook.com/v18.0"

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  try {
    const { to, type, payload } = await req.json()
    const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN")
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")

    if (!token || !phoneId) {
      return new Response(JSON.stringify({ simulated: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    const res = await fetch(`${GRAPH_API_URL}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: type || "text",
        ...payload,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
