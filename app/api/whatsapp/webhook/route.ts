import { NextRequest, NextResponse } from 'next/server'
import { processWhatsAppMessage } from '@/lib/whatsapp/state-machine'
import { createAdminClient } from '@/lib/supabase/admin'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'bestiet'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '1335356319655951'
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v20.0'
const WABA_ID = process.env.WHATSAPP_WABA_ID || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '2303645686839880'

// In-memory deduplication set for fast duplicate detection
const processedMessageIds = new Set<string>()

// Helper function to send WhatsApp text message via Meta Graph API safely
async function sendWhatsAppTextMessage(toPhoneNumber: string, textResponse: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN
  const graphUrl = `https://graph.facebook.com/${API_VERSION}`

  if (!token || !phoneNumberId) {
    console.error('[WHATSAPP API] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in environment')
    return
  }

  console.log(`[WHATSAPP API] sending text to recipient=${toPhoneNumber} via phoneId=${phoneNumberId}`)

  try {
    const response = await fetch(
      `${graphUrl}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhoneNumber,
          type: 'text',
          text: { body: textResponse },
        }),
      }
    )

    const data = await response.json()
    console.log(`[WHATSAPP API] response status=${response.status}:`, JSON.stringify(data))
    return data
  } catch (err: any) {
    console.error('[WHATSAPP API] Network Error:', err?.message || err)
  }
}

// 1. Handle Meta Webhook Verification Handshake & Health Checks (GET Request)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isHealthCheck = searchParams.get('health') === 'true'

  // Internal Webhook Health / Readiness Endpoint
  if (isHealthCheck) {
    const tokenPresent = Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN)
    const tokenMasked = tokenPresent ? `${(process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN)?.slice(0, 10)}...` : 'MISSING'

    return NextResponse.json({
      status: 'healthy',
      webhook_endpoint: 'https://bestietchatbot.vercel.app/api/whatsapp/webhook',
      verification_token: VERIFY_TOKEN,
      phone_number_id: PHONE_NUMBER_ID,
      waba_id: WABA_ID,
      api_version: API_VERSION,
      access_token_status: tokenPresent ? 'CONFIGURED' : 'MISSING',
      access_token_masked: tokenMasked,
      timestamp: new Date().toISOString(),
    }, { status: 200 })
  }

  console.log('[WHATSAPP WEBHOOK] verification request received')

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const isTokenValid = token === VERIFY_TOKEN || token === 'bestiet' || token === 'bestiet_fresh_verify_token_2026'

  if (mode === 'subscribe' && isTokenValid) {
    console.log('[WHATSAPP WEBHOOK] verification success')
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn(`[WHATSAPP WEBHOOK] verification failed. Token mismatch: received="${token}"`)
  return new NextResponse('Forbidden: Verification failed', { status: 403 })
}

// 2. Handle Incoming WhatsApp Webhook Events (POST Request)
export async function POST(req: Request) {
  console.log('[WHATSAPP WEBHOOK] received payload')

  try {
    const body = await req.json()

    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    // Handle Message Status Updates (sent, delivered, read)
    if (value?.statuses && value.statuses.length > 0) {
      const statusObj = value.statuses[0]
      console.log(`[WHATSAPP WEBHOOK] status update: id=${statusObj.id}, status=${statusObj.status}, recipient=${statusObj.recipient_id}`)
      return NextResponse.json({ status: 'success', event: 'status_ack' }, { status: 200 })
    }

    // Handle Incoming Customer Messages
    const message = value?.messages?.[0]
    const contact = value?.contacts?.[0]

    if (message) {
      const messageId = message.id
      const from = message.from || contact?.wa_id // Sender phone / WhatsApp ID
      const type = message.type
      const businessPhoneId = value?.metadata?.phone_number_id || PHONE_NUMBER_ID

      // Deduplication Check
      if (messageId && processedMessageIds.has(messageId)) {
        console.log(`[WHATSAPP WEBHOOK] duplicate message skipped: ${messageId}`)
        return NextResponse.json({ status: 'duplicate_skipped' }, { status: 200 })
      }

      if (messageId) {
        processedMessageIds.add(messageId)
        // Keep deduplication set bounded to last 1000 items
        if (processedMessageIds.size > 1000) {
          const firstKey = processedMessageIds.values().next().value
          if (firstKey) processedMessageIds.delete(firstKey)
        }
      }

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

      console.log(`[WHATSAPP WEBHOOK] message received: id=${messageId}, from=${from}, type=${type}, text="${userText}"`)
      console.log(`[WHATSAPP BOT] processing message for ${from}...`)

      // Process message through state machine (dispatches reply to Meta Graph API)
      const botResponse = await processWhatsAppMessage({
        from,
        type,
        text,
        buttonId,
        listId,
        messageId,
      })

      console.log(`[WHATSAPP BOT] reply generated: ${botResponse ? 'success' : 'empty'}`)

      // Fallback text dispatch if not handled by interactive client
      const botReplyText =
        botResponse?.reply ||
        botResponse?.text ||
        (typeof botResponse === 'string' ? botResponse : '')

      if (from && botReplyText && !botResponse?.data && !botResponse?.buttons && !botResponse?.listSections) {
        await sendWhatsAppTextMessage(from, botReplyText)
      }
    }

    // Always respond with 200 OK to acknowledge receipt to Meta
    return NextResponse.json({ status: 'success' }, { status: 200 })
  } catch (err: any) {
    console.error('[WHATSAPP WEBHOOK] processing error:', err?.message || err)
    return NextResponse.json({ status: 'error', error: err?.message }, { status: 200 })
  }
}
