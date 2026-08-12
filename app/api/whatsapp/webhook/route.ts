import { NextRequest, NextResponse } from 'next/server';
import { processWhatsAppMessage } from '@/lib/whatsapp/state-machine';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'bestiet_fresh_verify_token_2026';

// Helper function to send WhatsApp text message via Meta Graph API
async function sendWhatsAppTextMessage(toPhoneNumber: string, textResponse: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !token) {
    console.error('Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TOKEN / WHATSAPP_ACCESS_TOKEN');
    return;
  }

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
  );

  const data = await response.json();
  if (!response.ok) {
    console.error('WhatsApp API Error:', data);
  }
  return data;
}

// 1. Handle Meta Webhook Verification (GET Request)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// 2. Handle Incoming WhatsApp Messages (POST Request)
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Parse body.entry[0].changes[0].value.messages[0]
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message) {
      const from = message.from; // Sender phone number
      const messageId = message.id;
      const type = message.type;

      let text = message.text?.body || '';
      let buttonId = undefined;
      let listId = undefined;

      if (type === 'interactive') {
        const interactive = message.interactive;
        if (interactive?.type === 'button_reply') {
          buttonId = interactive.button_reply?.id;
          text = interactive.button_reply?.title || text;
        } else if (interactive?.type === 'list_reply') {
          listId = interactive.list_reply?.id;
          text = interactive.list_reply?.title || text;
        }
      }

      console.log(`Received message from ${from}: ${text}`);

      // 2. Pass message text to state machine logic to generate reply
      const botResponse = await processWhatsAppMessage({
        from,
        type,
        text,
        buttonId,
        listId,
        messageId,
      });

      const botReplyText =
        botResponse?.reply ||
        botResponse?.text ||
        (typeof botResponse === 'string' ? botResponse : '');

      // 3. Call sendWhatsAppTextMessage(message.from, botReplyText)
      if (from && botReplyText) {
        await sendWhatsAppTextMessage(from, botReplyText);
      }
    }

    // 4. Always respond with 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ status: 'error', error: err.message }, { status: 200 });
  }
}
