import { NextRequest, NextResponse } from 'next/server'
import { processWhatsAppMessage } from '@/lib/whatsapp/state-machine'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'bestiet_fresh_verify_token_2026'

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
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('Incoming Webhook Event:', JSON.stringify(body, null, 2))

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      const message = value?.messages?.[0]

      if (message) {
        const from = message.from
        const messageId = message.id
        const type = message.type

        let text = ''
        let buttonId = undefined
        let listId = undefined

        if (type === 'text') {
          text = message.text?.body || ''
        } else if (type === 'interactive') {
          const interactive = message.interactive
          if (interactive.type === 'button_reply') {
            buttonId = interactive.button_reply.id
            text = interactive.button_reply.title
          } else if (interactive.type === 'list_reply') {
            listId = interactive.list_reply.id
            text = interactive.list_reply.title
          }
        }

        console.log(`[WhatsApp Webhook] Processing message from ${from}: "${text}"`)

        const result = await processWhatsAppMessage({
          from,
          type,
          text,
          buttonId,
          listId,
          messageId,
        })

        return NextResponse.json({ status: 'success', result })
      }
    }

    return NextResponse.json({ status: 'success', message: 'No actionable message' })
  } catch (err: any) {
    console.error('[WhatsApp Webhook Error]:', err)
    return NextResponse.json({ status: 'error', error: err.message }, { status: 200 })
  }
}
