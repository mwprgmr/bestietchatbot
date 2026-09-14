import { WhatsAppButtonReply, WhatsAppListSection } from './types'

function getGraphApiUrl() {
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0'
  return `https://graph.facebook.com/${apiVersion}`
}

export async function sendWhatsAppTextMessage(to: string, bodyText: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1335356319655951'
  const graphUrl = getGraphApiUrl()

  if (!token || !phoneId) {
    console.warn('[WHATSAPP API] Credentials missing in environment. Logged message body:\n', bodyText)
    return { success: true, simulated: true, text: bodyText, reply: bodyText }
  }

  console.log(`[WHATSAPP API] sending text message to phoneId=${phoneId}, recipient=${to}`)

  try {
    const res = await fetch(`${graphUrl}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: bodyText },
      }),
    })

    const data = await res.json()
    console.log(`[WHATSAPP API] response status=${res.status}:`, JSON.stringify(data))

    if (!res.ok) {
      console.error('[WHATSAPP API] Text Send Error:', data)
      return { success: false, error: data, text: bodyText, reply: bodyText }
    }
    return { success: true, data, text: bodyText, reply: bodyText }
  } catch (err: any) {
    console.error('[WHATSAPP API] Text Fetch Failure:', err?.message || err)
    return { success: false, error: err, text: bodyText, reply: bodyText }
  }
}

export async function sendWhatsAppButtonsMessage(
  to: string,
  bodyText: string,
  buttons: WhatsAppButtonReply[]
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1335356319655951'
  const graphUrl = getGraphApiUrl()

  if (!token || !phoneId) {
    console.warn('[WHATSAPP API] Credentials missing. Simulated Buttons:\n', bodyText, buttons)
    return { success: true, simulated: true, text: bodyText, reply: bodyText, buttons }
  }

  console.log(`[WHATSAPP API] sending interactive buttons to phoneId=${phoneId}, recipient=${to}`)

  try {
    const formattedButtons = buttons.slice(0, 3).map((b) => ({
      type: 'reply',
      reply: {
        id: b.id,
        title: b.title.slice(0, 20), // Meta 20 char max constraint
      },
    }))

    const res = await fetch(`${graphUrl}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: { buttons: formattedButtons },
        },
      }),
    })

    const data = await res.json()
    console.log(`[WHATSAPP API] response status=${res.status}:`, JSON.stringify(data))

    if (!res.ok) {
      console.error('[WHATSAPP API] Buttons Send Error:', data)
      const fallbackText = `${bodyText}\n\nOptions:\n` + buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')
      return await sendWhatsAppTextMessage(to, fallbackText)
    }
    return { success: true, data, text: bodyText, reply: bodyText, buttons }
  } catch (err: any) {
    console.error('[WHATSAPP API] Buttons Fetch Error:', err?.message || err)
    return { success: false, error: err, text: bodyText, reply: bodyText, buttons }
  }
}

export async function sendWhatsAppListMessage(
  to: string,
  bodyText: string,
  buttonTitle: string,
  sections: WhatsAppListSection[]
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1335356319655951'
  const graphUrl = getGraphApiUrl()

  if (!token || !phoneId) {
    console.warn('[WHATSAPP API] Credentials missing. Simulated List:\n', bodyText, sections)
    return { success: true, simulated: true, text: bodyText, reply: bodyText, listSections: sections }
  }

  console.log(`[WHATSAPP API] sending interactive list to phoneId=${phoneId}, recipient=${to}`)

  try {
    const res = await fetch(`${graphUrl}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: { text: bodyText },
          action: {
            button: buttonTitle.slice(0, 20),
            sections: sections.map((s) => ({
              title: s.title.slice(0, 24),
              rows: s.rows.map((r) => ({
                id: r.id,
                title: r.title.slice(0, 24),
                description: r.description ? r.description.slice(0, 72) : undefined,
              })),
            })),
          },
        },
      }),
    })

    const data = await res.json()
    console.log(`[WHATSAPP API] response status=${res.status}:`, JSON.stringify(data))

    if (!res.ok) {
      console.error('[WHATSAPP API] List Send Error:', data)
      let fallbackText = `${bodyText}\n\n`
      sections.forEach((s) => {
        fallbackText += `*${s.title}*\n`
        s.rows.forEach((r) => {
          fallbackText += `• ${r.title} ${r.description ? `(${r.description})` : ''}\n`
        })
      })
      return await sendWhatsAppTextMessage(to, fallbackText)
    }
    return { success: true, data, text: bodyText, reply: bodyText, listSections: sections }
  } catch (err: any) {
    console.error('[WHATSAPP API] List Fetch Error:', err?.message || err)
    return { success: false, error: err, text: bodyText, reply: bodyText, listSections: sections }
  }
}

export async function sendWhatsAppStatusUpdate({
  phone,
  orderNumber,
  newStatus,
}: {
  phone: string
  orderNumber: string
  newStatus: string
}) {
  let message = ''

  switch (newStatus) {
    case 'ACCEPTED':
      message = `✅ *Order Accepted!*\n\nYour Bestiet Fresh order *#${orderNumber}* has been accepted and confirmed by our team. 🐟💚`
      break
    case 'PREPARING':
      message = `👨‍🍳 *Order Preparing*\n\nYour fresh fish order *#${orderNumber}* is currently being freshly cut and cleaned.`
      break
    case 'PACKED':
      message = `📦 *Order Packed*\n\nYour order *#${orderNumber}* has been hygienically packed and is ready for dispatch.`
      break
    case 'OUT_FOR_DELIVERY':
      message = `🚚 *Out for Delivery!*\n\nYour Bestiet Fresh order *#${orderNumber}* is on its way to your doorstep!`
      break
    case 'DELIVERED':
      message = `🎉 *Order Delivered!*\n\nYour fresh fish order *#${orderNumber}* has been delivered. Thank you for choosing Bestiet Fresh! 🐟💚`
      break
    case 'CANCELLED':
      message = `❌ *Order Cancelled*\n\nYour order *#${orderNumber}* has been cancelled.`
      break
    default:
      message = `🔔 *Order Status Update*\n\nOrder *#${orderNumber}* status updated to: *${newStatus}*`
  }

  return await sendWhatsAppTextMessage(phone, message)
}
