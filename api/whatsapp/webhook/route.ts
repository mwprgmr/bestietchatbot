import { NextRequest, NextResponse } from 'next/server'
import { processWhatsAppMessage } from '@/lib/whatsapp/state-machine'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'bestiet_fresh_verify_token_2026'

// Helper function to send WhatsApp text message via Meta Graph API
async function sendWhatsAppTextMessage(toPhoneNumber: string, textResponse: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN

  if (!phoneNumberId || !token) {
    console.error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toPhoneNumber,
          type: 'text',
          text: { body: textResponse },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      console.error('WhatsApp API Error:', data)
    }
    return data
  } catch (err: any) {
    console.error('WhatsApp API Network Error:', err.message)
  }
}

// 1. Handle Meta Webhook Verification (GET Request)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

// 2. Handle Incoming WhatsApp Messages (POST Request)
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // 1. Parse body.entry[0].changes[0].value.messages[0]
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value
    const message = value?.messages?.[0]

    if (message) {
      const from = message.from // Sender phone number
      const messageId = message.id
      const type = message.type

      let userText = ''
      let buttonId = undefined
      let listId = undefined

      if (type === 'interactive' || message.interactive) {
        const interactive = message.interactive || message
        if (interactive?.type === 'button_reply' || interactive?.button_reply) {
          buttonId = interactive.button_reply?.id
          userText = interactive.button_reply?.id || interactive.button_reply?.title || ''
        } else if (interactive?.type === 'list_reply' || interactive?.list_reply) {
          listId = interactive.list_reply?.id
          userText = interactive.list_reply?.id || interactive.list_reply?.title || ''
        }
      } else if (type === 'button' || message.button) {
        buttonId = message.button?.payload || message.button?.id || message.button?.text
        userText = message.button?.payload || message.button?.text || ''
      } else if (type === 'text' || message.text) {
        userText = message.text?.body || ''
      } else if (type === 'location' || message.location) {
        const loc = message.location
        userText = loc?.address || loc?.name || `${loc?.latitude}, ${loc?.longitude}`
      } else {
        userText = message.text?.body || message.body || ''
      }

      userText = userText.trim()
      const text = userText

      console.log(`Received WhatsApp message from ${from}: type="${type}", userText="${userText}", buttonId="${buttonId}"`)

      // 2. Pass user input to state machine logic (which dispatches reply to Meta Graph API)
      const botResponse = await processWhatsAppMessage({
        from,
        type,
        text,
        buttonId,
        listId,
        messageId,
      })

      // 3. Fallback text dispatch if not handled by interactive client
      const botReplyText =
        botResponse?.reply ||
        botResponse?.text ||
        (typeof botResponse === 'string' ? botResponse : '')

      if (from && botReplyText && !botResponse?.data && !botResponse?.buttons && !botResponse?.listSections) {
        await sendWhatsAppTextMessage(from, botReplyText)
      }
    }

    // 4. Always respond with 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'success' }, { status: 200 })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ status: 'error', error: err.message }, { status: 200 })
  }
}
