import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendWhatsAppTextMessage,
  sendWhatsAppButtonsMessage,
  sendWhatsAppListMessage,
} from './client'
import { IncomingMessagePayload, BotState, WhatsAppListRow } from './types'
import { normalizePhoneNumber, getBusinessDate } from './phone-utils'

const processedMessageIds = new Set<string>()

async function isDuplicateMessage(supabase: any, messageId: string | undefined): Promise<boolean> {
  if (!messageId) return false

  if (processedMessageIds.has(messageId)) {
    return true
  }
  processedMessageIds.add(messageId)

  if (processedMessageIds.size > 10000) {
    const firstKey = processedMessageIds.values().next().value
    if (firstKey) processedMessageIds.delete(firstKey)
  }

  try {
    const { error } = await supabase.from('whatsapp_messages').insert([
      {
        whatsapp_message_id: messageId,
        direction: 'INBOUND',
        status: 'PROCESSED',
      },
    ])
    if (error && error.code === '23505') {
      return true
    }
  } catch (e) {}

  return false
}

function isLikelyAddressText(text: string): boolean {
  const clean = text.toLowerCase().trim()
  if (clean.length < 5) return false

  const hasPincode = /\b\d{6}\b/.test(clean)
  const addressKeywords = [
    'address', 'flat', 'house', 'building', 'apartment', 'villa', 'floor',
    'road', 'street', 'st', 'lane', 'nagar', 'colony', 'junction',
    'manvila', 'kazhakkoottam', 'peroorkada', 'trivandrum', 'thiruvananthapuram',
    'kochi', 'ernakulam', 'kerala', 'pincode', 'pin'
  ]

  const hasKeyword = addressKeywords.some((kw) => clean.includes(kw))
  return hasPincode || hasKeyword
}

function normalizeCart(cart: any[]) {
  if (!Array.isArray(cart)) return []
  return cart.map((item: any) => {
    const qty = Number(item.quantity_kg ?? item.quantity ?? 1.0)
    const price = Number(item.unit_price ?? item.price ?? 0)
    const subtotal = Number(item.subtotal ?? Math.round(price * qty * 100) / 100)
    return {
      product_id: item.product_id,
      branch_id: item.branch_id,
      product_name: item.product_name || item.name || 'Fish',
      quantity_kg: qty,
      quantity: qty,
      unit_price: price,
      price_per_kg: item.price_per_kg || price,
      inventory_date: item.inventory_date,
      cutting_type: item.cutting_type || item.cut_type || 'whole',
      subtotal,
    }
  })
}

export function isUuid(val: any): boolean {
  return typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
}

export function getTodayDateIST(): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }
  const formatter = new Intl.DateTimeFormat('en-CA', options)
  return formatter.format(new Date())
}

export async function logChatbotEvent(
  supabase: any,
  session: any,
  eventType: string,
  eventData: Record<string, any> = {}
) {
  try {
    const today = getTodayDateIST()
    await supabase.from('chatbot_events').insert([
      {
        session_id: session?.id && isUuid(session.id) ? session.id : null,
        customer_id: session?.customer_id && isUuid(session.customer_id) ? session.customer_id : null,
        phone: session?.customer_phone || session?.phone || null,
        branch_id: session?.selected_branch_id || session?.branch_id || null,
        event_type: eventType,
        event_data: eventData,
        business_date: today,
      },
    ])
  } catch (err) {
    console.error('[chatbot_events log error]:', err)
  }
}

export async function resolveCustomerBranch(
  supabase: any,
  session: any
): Promise<{ branch_id: string | null; branch_name: string | null; isValid: boolean }> {
  const branchId = session?.selected_branch_id
  if (!branchId || typeof branchId !== 'string' || !isUuid(branchId)) {
    return { branch_id: null, branch_name: null, isValid: false }
  }

  const { data: branch, error } = await supabase
    .from('branches')
    .select('id, name, is_active')
    .eq('id', branchId)
    .single()

  if (error || !branch || branch.is_active === false) {
    console.warn(`[Stale/Inactive Branch Cleared]: ${branchId}`)
    if (session?.id) {
      await updateSessionState(supabase, session.id, 'SELECTING_BRANCH', { selected_branch_id: null })
    }
    return { branch_id: null, branch_name: null, isValid: false }
  }

  return { branch_id: branch.id, branch_name: branch.name, isValid: true }
}

export type NormalizedAction =
  | 'ORDER_FISH'
  | 'TRACK_ORDER'
  | 'PREVIOUS_ORDERS'
  | 'CHECKOUT'
  | 'CLEAR_CART'
  | 'CONFIRM_ORDER'
  | 'CANCEL_ORDER'
  | 'ADD_MORE'
  | 'MAIN_MENU'
  | 'BRANCH_SELECTION'
  | 'CHANGE_BRANCH'
  | 'PRODUCT_SELECTION'
  | 'QUANTITY_SELECTION'
  | 'CUT_SELECTION'
  | 'ADDRESS_SELECTION'
  | 'SHARE_LOCATION'
  | 'CONFIRM_LOCATION_ONLY'
  | 'ADD_ADDRESS_WITH_LOCATION'
  | 'REMARKS_INPUT'
  | 'UNKNOWN'

export function normalizeWhatsAppAction(
  payload: IncomingMessagePayload,
  session?: any,
  currentState?: BotState
): NormalizedAction {
  const rawId = (payload.buttonId || payload.listId || '').trim()
  const rawText = (payload.text || '').trim()

  const cleanId = rawId.toLowerCase()
  const cleanTitle = rawText
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .trim()
  const combined = `${cleanId} ${cleanTitle}`.trim()

  // 1. ORDER_FISH (Recognize all IDs and title variations)
  const isOrderFishId = ['order_fish', 'btn_order_fish', 'order', 'order_fresh_fish', 'btn_order', 'fish_order', 'order_fish_now'].includes(cleanId)
  const isOrderFishTitle = cleanTitle.includes('order fresh fish') || cleanTitle.includes('order fish') || cleanTitle.includes('fresh fish') || cleanTitle === 'order' || combined.includes('order fresh fish')
  if (isOrderFishId || isOrderFishTitle) {
    return 'ORDER_FISH'
  }

  // 2. TRACK_ORDER
  const isTrackId = ['track_order', 'btn_track_order', 'track', 'btn_track'].includes(cleanId)
  const isTrackTitle = cleanTitle.includes('track order') || cleanTitle === 'track'
  if (isTrackId || isTrackTitle) {
    return 'TRACK_ORDER'
  }

  // 3. PREVIOUS_ORDERS
  const isPrevId = ['previous_orders', 'btn_previous_orders', 'previous_order', 'history', 'btn_history', 'order_history'].includes(cleanId)
  const isPrevTitle = cleanTitle.includes('previous orders') || cleanTitle.includes('previous order') || cleanTitle.includes('order history') || cleanTitle === 'previous'
  if (isPrevId || isPrevTitle) {
    return 'PREVIOUS_ORDERS'
  }

  // 4. CHECKOUT
  const isCheckoutId = ['checkout', 'btn_checkout', 'proceed_checkout', 'btn_proceed_checkout'].includes(cleanId)
  const isCheckoutTitle = cleanTitle.includes('proceed checkout') || cleanTitle.includes('checkout')
  if (isCheckoutId || isCheckoutTitle) {
    return 'CHECKOUT'
  }

  // 5. CLEAR_CART
  const isClearCartId = ['clear_cart', 'btn_clear_cart', 'clear_cart_resume', 'btn_clear_cart_resume'].includes(cleanId)
  const isClearCartTitle = cleanTitle.includes('clear cart')
  if (isClearCartId || isClearCartTitle) {
    return 'CLEAR_CART'
  }

  // 6. CONFIRM_ORDER
  const isConfirmId = ['confirm_order', 'btn_confirm_order', 'confirm', 'place_order'].includes(cleanId)
  const isConfirmTitle = cleanTitle.includes('confirm & order') || cleanTitle.includes('confirm order') || cleanTitle.includes('place order') || cleanTitle === 'confirm'
  if (isConfirmId || isConfirmTitle) {
    return 'CONFIRM_ORDER'
  }

  // 7. CANCEL_ORDER
  const isCancelId = ['cancel_order', 'btn_cancel_order', 'cancel'].includes(cleanId)
  const isCancelTitle = cleanTitle.includes('cancel order') || (cleanTitle.includes('cancel') && cleanTitle.includes('order'))
  if (isCancelId || isCancelTitle) {
    return 'CANCEL_ORDER'
  }

  // 8. ADD_MORE
  const isAddMoreId = ['add_more', 'btn_add_more', 'add_more_fish'].includes(cleanId)
  const isAddMoreTitle = cleanTitle.includes('add more fish') || cleanTitle.includes('add more')
  if (isAddMoreId || isAddMoreTitle) {
    return 'ADD_MORE'
  }

  // 9. MAIN_MENU / GREETINGS
  const isMenuId = ['main_menu', 'btn_main_menu', 'home', 'btn_home'].includes(cleanId)
  const isMenuTitle = /^(hi|hello|hey|start|menu|main_menu|home)$/i.test(cleanTitle)
  if (isMenuId || isMenuTitle) {
    return 'MAIN_MENU'
  }

  // 10. CHANGE_BRANCH
  const isChangeBranchId = ['change_branch', 'btn_change_branch', 'switch_branch', 'btn_switch_branch'].includes(cleanId)
  const isChangeBranchTitle = cleanTitle.includes('change branch') || cleanTitle.includes('switch branch')
  if (isChangeBranchId || isChangeBranchTitle) {
    return 'CHANGE_BRANCH'
  }

  // 11. BRANCH_SELECTION
  const isBranchId = cleanId === 'b1111111-1111-1111-1111-111111111111' || cleanId === 'b2222222-2222-2222-2222-222222222222' || cleanId.startsWith('btn_branch_')
  const isAddressContext =
    currentState === 'SELECTING_ADDRESS' ||
    currentState === 'AWAITING_LOCATION' ||
    currentState === 'CONFIRMING_LOCATION' ||
    currentState === 'ADDING_ADDRESS' ||
    currentState === 'ADDING_ADDRESS_WITH_LOCATION' ||
    currentState === 'CONFIRMING_NEW_ADDRESS' ||
    isLikelyAddressText(rawText)
  const isBranchTitle = (combined.includes('manvila') || combined.includes('kazhakkoottam') || combined.includes('peroorkada')) && !isAddressContext
  if (isBranchId || isBranchTitle) {
    return 'BRANCH_SELECTION'
  }

  // 12. QUANTITY_SELECTION
  if (cleanId.startsWith('qty_')) {
    return 'QUANTITY_SELECTION'
  }

  // 13. CUT_SELECTION
  if (cleanId.startsWith('cut_')) {
    return 'CUT_SELECTION'
  }

  // 14. LOCATION ACTIONS
  if (cleanId === 'btn_share_location' || cleanTitle.includes('share location') || cleanTitle.includes('share live location')) {
    return 'SHARE_LOCATION'
  }
  if (cleanId === 'btn_confirm_location_only' || cleanTitle.includes('use location')) {
    return 'CONFIRM_LOCATION_ONLY'
  }
  if (cleanId === 'btn_add_address_with_location' || cleanTitle.includes('add house address')) {
    return 'ADD_ADDRESS_WITH_LOCATION'
  }

  // 15. REMARKS ACTIONS
  if (
    cleanId === 'btn_skip_remarks' ||
    cleanTitle === 'skip' ||
    cleanTitle.includes('skip') ||
    currentState === 'ADDING_REMARKS'
  ) {
    if (cleanId !== 'btn_cancel_order' && cleanTitle !== 'cancel') {
      return 'REMARKS_INPUT'
    }
  }

  // 16. ADDRESS_SELECTION
  if (
    cleanId.startsWith('addr_') ||
    cleanId === 'btn_add_new_address' ||
    cleanId === 'btn_confirm_new_address' ||
    cleanId === 'btn_edit_new_address' ||
    (isAddressContext && !isBranchId)
  ) {
    return 'ADDRESS_SELECTION'
  }

  // 16. PRODUCT_SELECTION (Only IDs starting with fish_ or matching UUIDs)
  if (cleanId.startsWith('fish_')) {
    return 'PRODUCT_SELECTION'
  }

  return 'UNKNOWN'
}

export async function processWhatsAppMessage(payload: IncomingMessagePayload) {
  const supabase = createAdminClient()

  // Webhook message deduplication check
  if (payload.messageId && (await isDuplicateMessage(supabase, payload.messageId))) {
    console.log(`[Duplicate webhook message suppressed]: ${payload.messageId}`)
    return { status: 'duplicate_suppressed' }
  }

  const rawPhone = payload.from
  const phone = normalizePhoneNumber(rawPhone)

  // 1. Identify or Create Customer
  let { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!customer) {
    const { data: newCust, error: custErr } = await supabase.rpc('upsert_customer_sec', {
      p_phone: phone,
      p_name: `Customer ${phone.slice(-4)}`,
    })

    if (custErr) {
      const { data: fallbackCust, error: fallbackErr } = await supabase
        .from('customers')
        .insert([{ phone, name: `Customer ${phone.slice(-4)}` }])
        .select()
        .single()

      if (fallbackErr) {
        customer = { id: `cust_${phone}`, phone, name: `Customer ${phone.slice(-4)}` }
      } else {
        customer = fallbackCust
      }
    } else {
      customer = newCust
    }
  }

  // 2. Identify or Create Chat Session
  let { data: session } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('customer_id', customer.id)
    .single()

  if (!session) {
    const { data: newSess, error: sessErr } = await supabase.rpc('upsert_chat_session_sec', {
      p_customer_id: customer.id,
      p_state: 'MAIN_MENU',
      p_cart: [],
    })

    if (sessErr) {
      const { data: fallbackSess, error: fallbackErr } = await supabase
        .from('chat_sessions')
        .insert([{ customer_id: customer.id, state: 'MAIN_MENU', cart: [] }])
        .select()
        .single()

      if (fallbackErr) {
        session = { id: `sess_${customer.id}`, customer_id: customer.id, state: 'MAIN_MENU', cart: [] }
      } else {
        session = fallbackSess
      }
    } else {
      session = newSess
    }
  }

  parseSessionLocation(session)

  // Normalize session cart for backward compatibility
  session.cart = normalizeCart(session.cart)

  const buttonOrListId = (payload.buttonId || payload.listId || '').trim()
  const rawText = (payload.text || '').trim()
  const userText = buttonOrListId || rawText

  // Save User Incoming Message to chat_messages Table
  if (session?.id && (rawText || buttonOrListId || payload.location)) {
    try {
      await supabase.from('chat_messages').insert([{
        session_id: session.id,
        customer_id: customer.id,
        phone: phone,
        sender: 'user',
        text: payload.location ? `📍 Shared Location (${payload.location.latitude}, ${payload.location.longitude})` : (rawText || buttonOrListId),
      }])
    } catch (e: any) {
      console.warn('[chat_messages insert user warning]:', e?.message)
    }
  }

  const hasActiveCart = Array.isArray(session.cart) && session.cart.length > 0 && !!session.selected_branch_id
  const currentState: BotState = session.state || 'MAIN_MENU'

  let botResponse: any = null

  // Intercept location payload directly
  if (payload.type === 'location' || payload.location) {
    const loc = payload.location
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      botResponse = await handleLocationReceived(phone, loc.latitude, loc.longitude, session, customer, supabase)
    } else {
      botResponse = await handleInvalidLocation(phone, session, supabase)
    }

    if (session?.id && botResponse) {
      const replyText = botResponse.text || botResponse.reply || (typeof botResponse === 'string' ? botResponse : '')
      if (replyText) {
        try {
          await supabase.from('chat_messages').insert([{
            session_id: session.id,
            customer_id: customer.id,
            phone: phone,
            sender: 'bot',
            text: replyText,
            buttons: botResponse.buttons || null,
            list_sections: botResponse.listSections || null,
          }])
        } catch (e: any) {}
      }
    }
    return botResponse
  }

  // Centralized Action Normalizer Execution
  const action = normalizeWhatsAppAction(payload, session, currentState)

  // -------------------------------------------------------------
  // CENTRALIZED INTERACTION ACTION DISPATCHER
  // -------------------------------------------------------------
  switch (action) {
    case 'SHARE_LOCATION':
      botResponse = await handleShareLocationPrompt(phone, session, supabase)
      break

    case 'CONFIRM_LOCATION_ONLY':
      botResponse = await handleConfirmLocationOnly(phone, session, customer, supabase)
      break

    case 'ADD_ADDRESS_WITH_LOCATION':
      await updateSessionState(supabase, session.id, 'ADDING_ADDRESS_WITH_LOCATION')
      botResponse = await sendWhatsAppTextMessage(
        phone,
        `📍 Please reply with your house name/number and complete street address:`
      )
      break

    case 'REMARKS_INPUT':
      botResponse = await handleRemarksInput(phone, userText, session, supabase, payload.buttonId)
      break

    case 'CONFIRM_ORDER':
      botResponse = await handleOrderReview(phone, userText, session, customer.id, payload.messageId, supabase)
      break

    case 'CANCEL_ORDER':
      await updateSessionState(supabase, session.id, 'MAIN_MENU', { pending_remarks: null, idempotency_key: null })
      botResponse = await sendWhatsAppTextMessage(phone, '❌ Order checkout cancelled. Your cart items have been preserved.')
      break

    case 'CLEAR_CART':
      botResponse = await handleClearCartAction(phone, session, supabase)
      break

    case 'CHECKOUT':
      botResponse = await handleCheckoutAction(phone, session, customer, supabase)
      break

    case 'ORDER_FISH': {
      const branchRes = await resolveCustomerBranch(supabase, session)
      if (branchRes.isValid && branchRes.branch_id) {
        await updateSessionState(supabase, session.id, 'SELECTING_FISH')
        botResponse = await showDailyFishMenu(phone, session, supabase, branchRes.branch_id)
      } else {
        await updateSessionState(supabase, session.id, 'SELECTING_BRANCH')
        botResponse = await showBranchSelection(phone, session, supabase)
      }
      break
    }

    case 'CHANGE_BRANCH': {
      await updateSessionState(supabase, session.id, 'SELECTING_BRANCH', {
        selected_branch_id: null,
        cart: [],
        pending_remarks: null,
        selected_product_id: null,
      })
      session.selected_branch_id = null
      session.cart = []
      botResponse = await showBranchSelection(phone, session, supabase)
      break
    }

    case 'ADD_MORE': {
      const branchRes = await resolveCustomerBranch(supabase, session)
      if (branchRes.isValid && branchRes.branch_id) {
        await updateSessionState(supabase, session.id, 'SELECTING_FISH')
        botResponse = await showDailyFishMenu(phone, session, supabase, branchRes.branch_id)
      } else {
        await updateSessionState(supabase, session.id, 'SELECTING_BRANCH')
        botResponse = await showBranchSelection(phone, session, supabase)
      }
      break
    }

    case 'TRACK_ORDER':
      await updateSessionState(supabase, session.id, 'TRACK_ORDER')
      botResponse = await handleTrackOrder(phone, customer.id, supabase)
      break

    case 'PREVIOUS_ORDERS':
      await updateSessionState(supabase, session.id, 'PREVIOUS_ORDERS')
      botResponse = await handlePreviousOrders(phone, customer.id, supabase)
      break

    case 'BRANCH_SELECTION':
      botResponse = await handleBranchSelection(phone, userText, session, supabase)
      
      // 8. UPDATE ORDER WITH GPS LOCATION COORDINATES AND MAPS URL IF SHARED
      if (botResponse?.order_id && (session.latitude || session.longitude)) {
        try {
          const lat = session.latitude
          const lng = session.longitude
          const mapsUrl = session.maps_url || `https://www.google.com/maps?q=${lat},${lng}`
          await supabase.from('orders').update({
            latitude: lat,
            longitude: lng,
            maps_url: mapsUrl
          }).eq('id', botResponse.order_id)
        } catch (e) {
          console.error('[Order location update error]:', e)
        }
      }
      break

    case 'MAIN_MENU': {
      const branchRes = await resolveCustomerBranch(supabase, session)
      if (hasActiveCart) {
        const bName = branchRes.branch_name || 'selected branch'
        botResponse = await sendWhatsAppButtonsMessage(
          phone,
          `🛒 *You have an active cart for ${bName}!*\nWould you like to continue with checkout or clear your cart?`,
          [
            { id: 'btn_checkout', title: '🚀 Proceed Checkout' },
            { id: 'btn_clear_cart', title: '🗑️ Clear Cart & Resume' },
          ]
        )
      } else if (branchRes.isValid && branchRes.branch_name) {
        await updateSessionState(supabase, session.id, 'MAIN_MENU')

        let extraNotice = ''
        try {
          const { data: cSettings } = await supabase.from('chatbot_settings').select('*').eq('is_enabled', true).limit(1)
          if (cSettings && cSettings[0]?.additional_message) {
            extraNotice = `${cSettings[0].additional_message.trim()}\n\n`
          }
        } catch (e) {}

        const welcomeBody = `👋 *Welcome to Bestiet Fresh!* 🐟💚\n"Your Fresh Friend At The Door"\n\n${extraNotice}Active Branch: *${branchRes.branch_name}*\nHow can we serve you fresh fish today?`

        botResponse = await sendWhatsAppButtonsMessage(
          phone,
          welcomeBody,
          [
            { id: 'btn_order_fish', title: '🛒 Order Fresh Fish' },
            { id: 'btn_change_branch', title: '🔄 Change Branch' },
            { id: 'btn_track_order', title: '📦 Track Order' },
          ]
        )
      } else {
        await updateSessionState(supabase, session.id, 'SELECTING_BRANCH')
        botResponse = await showBranchSelection(phone, session, supabase)
      }
      break
    }

    case 'PRODUCT_SELECTION':
      botResponse = await handleFishSelection(phone, userText, session, supabase)
      break

    case 'QUANTITY_SELECTION':
      botResponse = await handleQuantitySelection(phone, userText, session, supabase)
      break

    case 'CUT_SELECTION':
      botResponse = await handleCutSelection(phone, userText, session, supabase)
      break

    case 'ADDRESS_SELECTION':
      botResponse = await handleAddressSelection(phone, userText, session, supabase, rawText)
      break

    case 'UNKNOWN':
    default:
      if (
        (currentState === 'SELECTING_ADDRESS' || currentState === 'ADDING_ADDRESS' || isLikelyAddressText(rawText)) &&
        hasActiveCart &&
        !buttonOrListId.startsWith('btn_')
      ) {
        botResponse = await handleAddressSelection(phone, userText, session, supabase, rawText)
      } else if (currentState === 'SELECTING_FISH') {
        botResponse = await handleFishSelection(phone, userText, session, supabase)
      } else if (currentState === 'SELECTING_QUANTITY') {
        botResponse = await handleQuantitySelection(phone, userText, session, supabase)
      } else if (currentState === 'SELECTING_CUT') {
        botResponse = await handleCutSelection(phone, userText, session, supabase)
      } else if (currentState === 'CART') {
        botResponse = await handleCartRouter(phone, userText, session, supabase)
      } else if (buttonOrListId.startsWith('btn_')) {
        console.warn(`[Unrecognized interactive action ID]: ${buttonOrListId}`)
        if (hasActiveCart) {
          botResponse = await sendWhatsAppButtonsMessage(
            phone,
            `⚠️ That option is no longer active. Please choose an option from the current menu.`,
            [
              { id: 'btn_checkout', title: '🚀 Proceed Checkout' },
              { id: 'btn_clear_cart', title: '🗑️ Clear Cart & Resume' },
            ]
          )
        } else {
          await updateSessionState(supabase, session.id, 'MAIN_MENU')
          botResponse = await handleMainMenu(phone)
        }
      } else {
        if (hasActiveCart) {
          botResponse = await sendWhatsAppButtonsMessage(
            phone,
            `🛒 *You have an active cart!*\nWould you like to continue with checkout or clear your cart?`,
            [
              { id: 'btn_checkout', title: '🚀 Proceed Checkout' },
              { id: 'btn_clear_cart', title: '🗑️ Clear Cart & Resume' },
            ]
          )
        } else {
          await updateSessionState(supabase, session.id, 'MAIN_MENU')
          botResponse = await handleMainMenu(phone)
        }
      }
      break
  }

  // 5. Fallback for unrecognized text when cart is active
  if (!botResponse && hasActiveCart) {
    botResponse = await sendWhatsAppButtonsMessage(
      phone,
      `🤔 I didn't quite understand that. Your cart is still active!\nWould you like to continue checkout?`,
      [
        { id: 'btn_checkout', title: '🚀 Proceed Checkout' },
        { id: 'btn_add_more', title: '➕ Add More Fish' },
        { id: 'btn_clear_cart', title: '🗑️ Clear Cart' },
      ]
    )
  } else if (!botResponse) {
    await updateSessionState(supabase, session.id, 'MAIN_MENU')
    botResponse = await handleMainMenu(phone)
  }

  // Save Bot Outbound Response to chat_messages Table
  if (session?.id && botResponse) {
    const replyText = botResponse.text || botResponse.reply || (typeof botResponse === 'string' ? botResponse : '')
    if (replyText) {
      try {
        await supabase.from('chat_messages').insert([{
          session_id: session.id,
          customer_id: customer.id,
          phone: phone,
          sender: 'bot',
          text: replyText,
          buttons: botResponse.buttons || null,
          list_sections: botResponse.listSections || null,
        }])
      } catch (e: any) {
        console.warn('[chat_messages insert bot warning]:', e?.message)
      }
    }
  }

  return botResponse
}

// -------------------------------------------------------------
// STATE HANDLERS
// -------------------------------------------------------------

async function handleMainMenu(phone: string) {
  return await sendWhatsAppButtonsMessage(
    phone,
    `👋 *Welcome to Bestiet Fresh!* 🐟💚\n"Your Fresh Friend At The Door"\n\nHow can we serve you fresh fish today?`,
    [
      { id: 'btn_order_fish', title: '🛒 Order Fresh Fish' },
      { id: 'btn_track_order', title: '📦 Track Order' },
      { id: 'btn_previous_orders', title: '🔄 Previous Orders' },
    ]
  )
}

async function handleMainMenuRouter(phone: string, userText: string, session: any, supabase: any) {
  const clean = userText.toLowerCase().trim()

  if (clean === 'btn_track_order' || clean.includes('track')) {
    await updateSessionState(supabase, session.id, 'TRACK_ORDER')
    return await handleTrackOrder(phone, session.customer_id, supabase)
  }

  if (clean === 'btn_previous_orders' || clean.includes('previous')) {
    await updateSessionState(supabase, session.id, 'PREVIOUS_ORDERS')
    return await handlePreviousOrders(phone, session.customer_id, supabase)
  }

  if (clean === 'btn_order_fish' || clean.includes('order fresh fish') || clean === 'order' || clean === 'order fish') {
    return await showBranchSelection(phone, session, supabase)
  }

  return await handleMainMenu(phone)
}

async function getBranchInventory(supabase: any, branchId: string, targetDate?: string) {
  const today = targetDate || getTodayDateIST()

  // 1. Query public.inventory for branch_id, inventory_date = today, available_stock > 0, status in ('available', 'AVAILABLE')
  let { data: items, error } = await supabase
    .from('inventory')
    .select('*, product:products(*)')
    .eq('branch_id', branchId)
    .eq('inventory_date', today)
    .gt('available_stock', 0)
    .in('status', ['available', 'AVAILABLE'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error(`[INVENTORY READ ERROR] branch_id=${branchId} business_date=${today}:`, error.message)
  }

  // 2. Fallback: If no items exist for today, check latest available inventory date and auto carry-forward
  if (!items || items.length === 0) {
    console.log(`[INVENTORY READ FALLBACK] No today rows for branch_id=${branchId} date=${today}. Checking latest available stock...`)
    const { data: latestItems, error: latestErr } = await supabase
      .from('inventory')
      .select('*, product:products(*)')
      .eq('branch_id', branchId)
      .lte('inventory_date', today)
      .gt('available_stock', 0)
      .in('status', ['available', 'AVAILABLE'])
      .order('inventory_date', { ascending: false })

    if (!latestErr && latestItems && latestItems.length > 0) {
      const latestDate = latestItems[0].inventory_date
      const fallbackList = latestItems.filter((i: any) => i.inventory_date === latestDate)

      for (const item of fallbackList) {
        try {
          await supabase.from('inventory').upsert(
            {
              branch_id: branchId,
              product_id: item.product_id,
              inventory_date: today,
              opening_stock: Number(item.available_stock || 0),
              available_stock: Number(item.available_stock || 0),
              sold_stock: 0,
              price_per_kg: Number(item.price_per_kg || 200),
              status: 'AVAILABLE',
            },
            { onConflict: 'branch_id,product_id,inventory_date' }
          )
        } catch (_) {}
      }

      const { data: refreshed } = await supabase
        .from('inventory')
        .select('*, product:products(*)')
        .eq('branch_id', branchId)
        .eq('inventory_date', today)
        .gt('available_stock', 0)
        .in('status', ['available', 'AVAILABLE'])

      if (refreshed && refreshed.length > 0) {
        items = refreshed
      } else {
        items = fallbackList
      }
    }
  }

  const activeItems = (items || []).filter((item: any) => item.product && item.product.active !== false)

  console.log(`[INVENTORY READ SUCCESS] branch_id=${branchId} business_date=${today} product_count=${activeItems.length}`)
  for (const item of activeItems) {
    console.log(`   product_id=${item.product_id} product_name=${item.product?.name} inventory_id=${item.id} available_stock=${item.available_stock} price_per_kg=${item.price_per_kg}`)
  }

  return activeItems
}

async function showBranchSelection(phone: string, session: any, supabase: any) {
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const today = getBusinessDate()

  const rows = await Promise.all(
    (branches || []).map(async (b: any) => {
      const invItems = await getBranchInventory(supabase, b.id, today)
      const count = invItems.length
      const description =
        count === 0
          ? '⚠️ Sold out today'
          : count === 1
          ? '1 fish variety available today'
          : `${count} fish varieties available today`

      return {
        id: b.id,
        title: b.name,
        description,
      }
    })
  )

  await updateSessionState(supabase, session.id, 'SELECTING_BRANCH')

  return await sendWhatsAppListMessage(
    phone,
    `🏪 *Welcome to Bestiet Fresh!*\nPlease select a branch to order from:`,
    'Select Branch',
    [
      {
        title: 'Available Branches',
        rows,
      },
    ]
  )
}

async function handleBranchSelection(phone: string, userInput: string, session: any, supabase: any) {
  const cleanInput = userInput.trim().toLowerCase()
  const { data: branches } = await supabase.from('branches').select('*').eq('is_active', true)

  const matchedBranch = branches?.find((b: any) => {
    const isId = b.id === cleanInput
    const isName = b.name.toLowerCase().includes(cleanInput) || cleanInput.includes(b.name.toLowerCase())
    return isId || isName
  })

  const selectedBranchId = matchedBranch?.id || cleanInput
  const previousBranchId = session?.selected_branch_id
  let cartWasUpdated = false

  // Reset cart when switching branch to enforce strict branch isolation
  let updatedCart = normalizeCart(session?.cart)
  if (previousBranchId && previousBranchId !== selectedBranchId && updatedCart.length > 0) {
    updatedCart = []
    cartWasUpdated = true
  }

  await updateSessionState(supabase, session.id, 'SELECTING_FISH', {
    selected_branch_id: selectedBranchId,
    cart: updatedCart,
  })

  if (cartWasUpdated) {
    const branchName = matchedBranch?.name || 'Selected Branch'
    await sendWhatsAppTextMessage(
      phone,
      `⚠️ *Branch Changed to ${branchName}*\nSome items in your cart were updated or removed as they are not available at this branch.`
    )
  }

  return await showDailyFishMenu(phone, session, supabase, selectedBranchId)
}

async function showDailyFishMenu(phone: string, session: any, supabase: any, branchIdOverride?: string) {
  const today = getTodayDateIST()
  const branchId = branchIdOverride || session?.selected_branch_id

  if (!branchId || !isUuid(branchId)) {
    return await showBranchSelection(phone, session, supabase)
  }

  const { data: bData, error: bErr } = await supabase.from('branches').select('id, name, is_active').eq('id', branchId).single()
  if (bErr || !bData || bData.is_active === false) {
    console.warn(`[showDailyFishMenu]: Branch ${branchId} is inactive or invalid. Prompting selection.`)
    await updateSessionState(supabase, session.id, 'SELECTING_BRANCH', { selected_branch_id: null })
    return await showBranchSelection(phone, session, supabase)
  }

  const branchName = bData.name || 'Bestiet Fresh'

  // Query Active Inventory with automatic carry forward
  const activeStockItems = await getBranchInventory(supabase, branchId, today)

  if (activeStockItems.length === 0) {
    await updateSessionState(supabase, session.id, 'SELECTING_BRANCH')
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ *Stock Update — ${branchName}*\nOur fresh catch for today is sold out or being prepared at this branch. Please select another branch!`
    )
  }

  // Embed branchId into list row ID for menu versioning & stale cross-branch button protection
  const rows = activeStockItems.map((inv: any) => ({
    id: `fish_${inv.product_id}_b_${branchId}`,
    title: inv.product?.name || 'Fresh Fish',
    description: `₹${inv.price_per_kg}/kg | ${inv.available_stock}kg left`,
  }))

  await updateSessionState(supabase, session.id, 'SELECTING_FISH', {
    selected_branch_id: branchId,
  })

  const totalCount = activeStockItems.length
  const menuHeader = totalCount > 10
    ? `🐟 *Fresh Fish Catalogue — ${branchName}*\n(${totalCount} varieties available today. Select below or reply with any fish name!)\nSelect a fish to choose quantity & cut:`
    : `🐟 *Fresh Fish Catalogue — ${branchName}*\nSelect a fish to choose quantity & cut:`

  return await sendWhatsAppListMessage(
    phone,
    menuHeader,
    'Select Fish',
    [
      {
        title: 'Today Fresh Catch',
        rows,
      },
    ]
  )
}

async function handleFishSelection(phone: string, userInput: string, session: any, supabase: any) {
  const cleanInput = userInput.trim()
  const branchRes = await resolveCustomerBranch(supabase, session)

  if (!branchRes.isValid || !branchRes.branch_id) {
    return await showBranchSelection(phone, session, supabase)
  }

  // Stale/Cross-Branch Button Protection: parse embedded _b_${branchId}
  let selectedProductId = cleanInput
  if (cleanInput.includes('_b_')) {
    const parts = cleanInput.split('_b_')
    selectedProductId = parts[0].replace('fish_', '')
    const buttonBranchId = parts[1]

    if (buttonBranchId && buttonBranchId !== branchRes.branch_id) {
      console.warn(`[Stale Cross-Branch Button Intercepted]: Button branch ${buttonBranchId} != session branch ${branchRes.branch_id}`)
      await sendWhatsAppTextMessage(
        phone,
        `⚠️ *This menu option belongs to another branch.*\nHere is the latest fresh fish catalogue for *${branchRes.branch_name}*:`
      )
      return await showDailyFishMenu(phone, session, supabase, branchRes.branch_id)
    }
  } else if (cleanInput.startsWith('fish_')) {
    selectedProductId = cleanInput.replace('fish_', '')
  }

  const today = getTodayDateIST()
  const inventoryItems = await getBranchInventory(supabase, branchRes.branch_id, today)

  const selectedInv = (inventoryItems || []).find((inv: any) => {
    const isIdMatch = inv.product_id === selectedProductId || inv.id === selectedProductId
    const pName = (inv.product?.name || '').toLowerCase().trim()
    const inp = selectedProductId.toLowerCase().trim()
    const isNameMatch = pName === inp
    const isPartialMatch = pName.includes(inp) || inp.includes(pName)
    return isIdMatch || isNameMatch || isPartialMatch
  })

  if (!selectedInv) {
    await sendWhatsAppTextMessage(
      phone,
      `⚠️ Item is not available in today's menu for *${branchRes.branch_name}*. Please select a fish from the catalogue below.`
    )
    return await showDailyFishMenu(phone, session, supabase, branchRes.branch_id)
  }

  const availableStock = Number(selectedInv.available_stock ?? selectedInv.opening_stock ?? 0)

  if (availableStock <= 0) {
    await sendWhatsAppTextMessage(
      phone,
      `❌ Sorry, ${selectedInv.product?.name || 'that item'} is currently out of stock at *${branchRes.branch_name}*. Please select another fish from the menu.`
    )
    return await showDailyFishMenu(phone, session, supabase, branchRes.branch_id)
  }

  await updateSessionState(supabase, session.id, 'SELECTING_QUANTITY', {
    selected_product_id: selectedInv.product_id,
  })

  return await sendWhatsAppButtonsMessage(
    phone,
    `⚖️ *Selected: ${selectedInv.product?.name || 'Fish'}*\nPrice: ₹${selectedInv.price_per_kg}/kg\nAvailable at ${branchRes.branch_name}: ${availableStock}kg\n\nChoose quantity below or reply with your custom quantity in kg (e.g. 1.5, 2.5):`,
    [
      { id: 'qty_0.5', title: '0.5 kg (500g)' },
      { id: 'qty_1.0', title: '1.0 kg (1000g)' },
      { id: 'qty_custom', title: '✍️ Custom Quantity' },
    ]
  )
}

async function handleQuantitySelection(phone: string, userText: string, session: any, supabase: any) {
  const clean = userText.toLowerCase().trim()

  if (clean === 'qty_custom' || clean.includes('custom')) {
    return await sendWhatsAppTextMessage(
      phone,
      `✍️ *Custom Quantity*\nPlease reply with your custom quantity in kg (e.g. 1.5, 2.5, 3.5):`
    )
  }

  let qty = 1.0

  if (clean.startsWith('qty_')) {
    qty = parseFloat(clean.replace('qty_', ''))
  } else if (clean.includes('500g') || clean.includes('half')) {
    qty = 0.5
  } else if (clean.includes('750g')) {
    qty = 0.75
  } else if (clean.includes('1000g') || clean.includes('1kg')) {
    qty = 1.0
  } else if (clean.includes('2000g') || clean.includes('2kg')) {
    qty = 2.0
  } else {
    const matched = clean.match(/[\d.]+/)
    qty = matched ? parseFloat(matched[0]) : NaN
  }

  if (isNaN(qty) || qty <= 0) {
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ Please reply with a valid numeric quantity in kg (e.g. 1.5, 2.5, 3.5).`
    )
  }

  const productId = session.selected_product_id
  const today = getBusinessDate()
  const branchId = session?.selected_branch_id

  if (!branchId || !productId) {
    return await showBranchSelection(phone, session, supabase)
  }

  const inventoryItems = await getBranchInventory(supabase, branchId, today)
  const inv = inventoryItems.find((i: any) => i.product_id === productId)

  const availableStock = Number(inv?.available_stock ?? inv?.opening_stock ?? 0)
  if (qty > availableStock) {
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ Requested ${qty}kg exceeds available stock (${availableStock}kg left). Please enter a smaller quantity.`
    )
  }

  await updateSessionState(supabase, session.id, 'SELECTING_CUT', {
    selected_quantity: qty,
  })

  return await sendWhatsAppButtonsMessage(
    phone,
    `🔪 *Select Cutting Preference for ${inv?.product?.name || 'Fish'} (${qty}kg)*:`,
    [
      { id: 'cut_whole', title: '🐟 Whole (Cleaned)' },
      { id: 'cut_curry', title: '🍲 Curry Cut' },
      { id: 'cut_fry', title: '🍳 Fry Cut / Slices' },
    ]
  )
}

async function handleCutSelection(phone: string, userText: string, session: any, supabase: any) {
  let cutType = 'whole'
  const clean = userText.toLowerCase().trim()

  if (clean.includes('curry')) {
    cutType = 'curry_cut'
  } else if (clean.includes('fry')) {
    cutType = 'fry_cut'
  } else {
    cutType = 'whole'
  }

  const productId = session.selected_product_id
  const qty = Number(session.selected_quantity || 1.0)
  const today = getBusinessDate()
  const branchId = session.selected_branch_id

  if (!branchId || !productId) {
    return await showBranchSelection(phone, session, supabase)
  }

  const inventoryItems = await getBranchInventory(supabase, branchId, today)
  const inv = inventoryItems.find((i: any) => i.product_id === productId)

  if (!inv) {
    await updateSessionState(supabase, session.id, 'MAIN_MENU')
    return await sendWhatsAppTextMessage(phone, '⚠️ Product session expired. Please start order again.')
  }

  const unitPrice = Number(inv.price_per_kg)
  const subtotal = Math.round(unitPrice * qty * 100) / 100

  // 1. Re-fetch current cart directly from database as single source of truth
  if (session?.id || session?.customer_id) {
    let cartQuery = supabase.from('chat_sessions').select('cart')
    if (session.id) cartQuery = cartQuery.eq('id', session.id)
    else cartQuery = cartQuery.eq('customer_id', session.customer_id)

    const { data: dbSess } = await cartQuery.single()
    if (dbSess) {
      session.cart = normalizeCart(dbSess.cart)
    }
  }

  const currentCart = normalizeCart(session.cart)
  currentCart.push({
    product_id: productId,
    branch_id: branchId,
    product_name: inv.product?.name || 'Fish',
    quantity_kg: qty,
    quantity: qty,
    cutting_type: cutType,
    unit_price: unitPrice,
    price_per_kg: unitPrice,
    inventory_date: today,
    subtotal,
  })

  await updateSessionState(supabase, session.id, 'CART', {
    cart: currentCart,
    selected_product_id: null,
    selected_quantity: null,
    selected_cutting_type: null,
  })

  let cartSummary = `🛒 *Item Added to Cart!*\n\n`
  let cartTotal = 0
  currentCart.forEach((item: any, idx: number) => {
    cartSummary += `${idx + 1}. *${item.product_name}* — ${item.quantity_kg}kg (${item.cutting_type.replace('_', ' ')})\n   ₹${item.subtotal}\n`
    cartTotal += item.subtotal
  })
  cartSummary += `\n*Cart Total: ₹${cartTotal}*`

  return await sendWhatsAppButtonsMessage(phone, cartSummary, [
    { id: 'btn_checkout', title: '🚀 Proceed Checkout' },
    { id: 'btn_add_more', title: '➕ Add More Fish' },
    { id: 'btn_clear_cart', title: '🗑️ Clear Cart' },
  ])
}

export async function clearCustomerCart(
  supabase: any,
  phone: string,
  session: any,
  customerId?: string | null,
  branchId?: string | null
): Promise<{ success: boolean; remainingItemsCount: number; error?: string }> {
  const normPhone = normalizePhoneNumber(phone)
  const sessionId = session?.id || (customerId ? `sess_${customerId}` : 'none')
  const currentCartCount = Array.isArray(session?.cart) ? session.cart.length : 0

  console.log(`[CART_CLEAR_START]\ncustomer_phone=${normPhone}\ncart_id=${sessionId}`)
  console.log(`[CART_CLEAR_ITEMS]\nnumber_of_items=${currentCartCount}`)

  // 1. Invalidate in-memory session object cart immediately
  if (session && typeof session === 'object') {
    session.cart = []
    session.selected_product_id = null
    session.selected_quantity = null
    session.selected_cutting_type = null
    session.selected_address_id = null
    session.delivery_address = null
    session.pending_remarks = null
    session.idempotency_key = null
    session.latitude = null
    session.longitude = null
    session.maps_url = null
  }
  console.log(`[CART_CLEAR_SESSION_RESET]\nresult=success\nerror=none`)

  // 2. Commit empty cart and state reset directly to Database
  const targetBranch = branchId || session?.selected_branch_id || null
  const resetPayload = {
    state: 'SELECTING_FISH',
    cart: [],
    selected_product_id: null,
    selected_quantity: null,
    selected_cutting_type: null,
    selected_address_id: null,
    delivery_address: null,
    pending_remarks: null,
    selected_branch_id: targetBranch,
    updated_at: new Date().toISOString()
  }

  let dbErr: any = null
  if (session?.id && isUuid(session.id)) {
    const { error } = await supabase.from('chat_sessions').update(resetPayload).eq('id', session.id)
    if (error) dbErr = error
  }
  const realCustId = customerId || session?.customer_id
  if (realCustId && isUuid(realCustId)) {
    const { error } = await supabase.from('chat_sessions').update(resetPayload).eq('customer_id', realCustId)
    if (error) dbErr = error || dbErr
  }

  await updateSessionState(supabase, session, 'SELECTING_FISH', resetPayload)

  console.log(`[CART_CLEAR_DELETE]\nresult=${dbErr ? 'error' : 'success'}\nerror=${dbErr?.message || 'none'}`)

  // 3. Re-fetch cart from database to VERIFY zero cart items
  let remainingCount = 0
  let isVerifiedEmpty = false

  try {
    let query = supabase.from('chat_sessions').select('cart')
    if (session?.id && isUuid(session.id)) {
      query = query.eq('id', session.id)
    } else if (realCustId && isUuid(realCustId)) {
      query = query.eq('customer_id', realCustId)
    }

    const { data: verifiedSession, error: queryErr } = await query.single()
    if (queryErr) {
      console.warn('[CART_CLEAR_VERIFY DB Query Warning]:', queryErr.message)
    }
    const verifiedCart = normalizeCart(verifiedSession?.cart)
    remainingCount = verifiedCart.length
    if (remainingCount === 0) {
      isVerifiedEmpty = true
    }
  } catch (e: any) {
    console.error('[CART_CLEAR_VERIFY Exception]:', e?.message)
  }

  console.log(`[CART_CLEAR_VERIFY]\nremaining_cart_items=${remainingCount}\nremaining_active_cart=${remainingCount > 0 ? 'true' : 'false'}`)

  if (isVerifiedEmpty) {
    console.log(`[CART_CLEAR_SUCCESS]`)
    return { success: true, remainingItemsCount: 0 }
  } else {
    const failReason = `Database verification query found ${remainingCount} items remaining in cart`
    console.log(`[CART_CLEAR_FAILED]\nreason=${failReason}`)
    return { success: false, remainingItemsCount: remainingCount, error: failReason }
  }
}

async function handleClearCartAction(phone: string, session: any, supabase: any) {
  const branchId = session?.selected_branch_id
  const customerId = session?.customer_id

  const clearResult = await clearCustomerCart(supabase, phone, session, customerId, branchId)

  if (clearResult.success) {
    await sendWhatsAppTextMessage(
      phone,
      `🗑️ *Cart Cleared!*\nYour cart has been reset. You can now select fresh fish from the same branch:`
    )

    if (branchId) {
      return await showDailyFishMenu(phone, session, supabase, branchId)
    } else {
      return await showBranchSelection(phone, session, supabase)
    }
  } else {
    return await sendWhatsAppButtonsMessage(
      phone,
      `⚠️ We couldn't reset your cart automatically due to a temporary system issue.\nPlease try tapping 🗑️ Clear Cart again.`,
      [
        { id: 'btn_clear_cart', title: '🗑️ Clear Cart' },
        { id: 'btn_main_menu', title: '🐟 Main Menu' },
      ]
    )
  }
}

function parseSessionLocation(session: any) {
  if (!session) return
  if (session.latitude && session.longitude) {
    if (!session.maps_url) {
      session.maps_url = `https://www.google.com/maps?q=${session.latitude},${session.longitude}`
    }
    return
  }

  const rawAddr = session.delivery_address || ''
  if (rawAddr.includes('[GPS:')) {
    const match = rawAddr.match(/\[GPS:(-?\d+\.?\d*),(-?\d+\.?\d*)\]/)
    if (match) {
      session.latitude = parseFloat(match[1])
      session.longitude = parseFloat(match[2])
      session.maps_url = `https://www.google.com/maps?q=${session.latitude},${session.longitude}`
    }
  }
}

function cleanAddressForDisplay(rawText?: string): string {
  if (!rawText) return ''
  return rawText.replace(/\[GPS:[^\]]+\]/g, '').trim()
}

function isPinOnlyInput(text: string): boolean {
  const clean = text.trim()
  return /^\d{6}$/.test(clean) || /^(pin|pincode)?\s*:?\s*\d{6}$/i.test(clean)
}

async function handleShareLocationPrompt(phone: string, session: any, supabase: any) {
  await updateSessionState(supabase, session.id, 'AWAITING_LOCATION')
  return await sendWhatsAppButtonsMessage(
    phone,
    `📍 *SHARE YOUR LOCATION*\n\nPlease share your current location using WhatsApp's location sharing feature:\n\n1. Tap the 📎 (attachment) or + icon in WhatsApp chat.\n2. Select *Location*.\n3. Tap *Send Your Current Location*.\n\n_If location sharing is unavailable, click Enter Address below._`,
    [
      { id: 'btn_add_new_address', title: '✏️ Enter Address' },
      { id: 'btn_main_menu', title: '🐟 Main Menu' },
    ]
  )
}

async function handleInvalidLocation(phone: string, session: any, supabase: any) {
  await updateSessionState(supabase, session.id, 'AWAITING_LOCATION')
  return await sendWhatsAppButtonsMessage(
    phone,
    `⚠️ We couldn't read that location.\n\nPlease share your location again or enter your delivery address manually.`,
    [
      { id: 'btn_share_location', title: '📍 Share Location' },
      { id: 'btn_add_new_address', title: '✏️ Enter Address' },
    ]
  )
}

async function handleLocationReceived(
  phone: string,
  lat: number,
  lng: number,
  session: any,
  customer: any,
  supabase: any
) {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    isNaN(lat) ||
    isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return await handleInvalidLocation(phone, session, supabase)
  }

  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
  const gpsTag = `[GPS:${lat},${lng}]`
  const deliveryAddr = `GPS Location Shared ${gpsTag}`

  console.log(`LOCATION RECEIVED\nlatitude: ${lat}\nlongitude: ${lng}\ncheckout_state: awaiting_location_confirmation\nselected_address_id: ${session.selected_address_id || 'none'}`)

  session.latitude = lat
  session.longitude = lng
  session.maps_url = mapsUrl

  await updateSessionState(supabase, session.id, 'CONFIRMING_LOCATION', {
    delivery_address: deliveryAddr,
  })

  return await sendWhatsAppButtonsMessage(
    phone,
    `📍 *DELIVERY LOCATION RECEIVED*\n\nCoordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}\n\nWould you also like to provide your house address (house name/number), or use this location directly for delivery?`,
    [
      { id: 'btn_confirm_location_only', title: '✅ Use Location' },
      { id: 'btn_add_address_with_location', title: '🏠 Add House Address' },
      { id: 'btn_share_location', title: '✏️ Share Again' },
    ]
  )
}

async function handleConfirmLocationOnly(phone: string, session: any, customer: any, supabase: any) {
  parseSessionLocation(session)
  const lat = session.latitude
  const lng = session.longitude
  const mapsUrl = session.maps_url || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null)

  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  let realCustomerId = customer?.id || session?.customer_id
  if (!isUuid(realCustomerId)) {
    const { data: cData } = await supabase.from('customers').select('id').eq('phone', phone).single()
    if (cData?.id && isUuid(cData.id)) realCustomerId = cData.id
  }

  let addressIdToSave: string | null = null

  if (isUuid(realCustomerId)) {
    try {
      const { data: directData, error: insertErr } = await supabase
        .from('addresses')
        .insert([
          {
            customer_id: realCustomerId,
            label: 'Location',
            address_line: 'GPS Location Shared',
            latitude: lat || null,
            longitude: lng || null,
            is_default: false,
          },
        ])
        .select('id, latitude, longitude')
        .single()

      if (insertErr) {
        console.error('[handleConfirmLocationOnly address insert error]:', insertErr)
      } else if (directData?.id && isUuid(directData.id)) {
        addressIdToSave = directData.id
      }
    } catch (e: any) {
      console.error('[handleConfirmLocationOnly address exception]:', e?.message)
    }
  }

  await updateSessionState(supabase, session.id, 'ADDING_REMARKS', {
    selected_address_id: addressIdToSave,
    address_mode: 'location',
    delivery_address: 'GPS Location Shared',
    latitude: lat,
    longitude: lng,
    maps_url: mapsUrl,
    pending_remarks: null,
  })
  session.selected_address_id = addressIdToSave
  session.delivery_address = 'GPS Location Shared'
  session.pending_remarks = null

  return await promptAdditionalRemarks(phone, session, supabase)
}

async function promptAdditionalRemarks(phone: string, session: any, supabase: any) {
  await updateSessionState(supabase, session.id, 'ADDING_REMARKS')
  return await sendWhatsAppButtonsMessage(
    phone,
    `📝 *ADDITIONAL REMARKS*\n\nDo you have any special instructions for your order?\n\nFor example:\n• Please call before delivery\n• Leave at the gate\n• Please deliver after 5 PM\n• Any other delivery instruction\n\nYou can type your remarks below.`,
    [
      { id: 'btn_skip_remarks', title: '⏭️ Skip' },
      { id: 'btn_cancel_order', title: '❌ Cancel Order' },
    ]
  )
}

async function handleRemarksInput(
  phone: string,
  userText: string,
  session: any,
  supabase: any,
  buttonId?: string
) {
  const cleanId = (buttonId || '').toLowerCase().trim()
  const cleanText = (userText || '').trim()
  const lowerText = cleanText.toLowerCase()

  // 1. Check if user clicked Skip button or typed 'skip'
  const isSkip =
    cleanId === 'btn_skip_remarks' ||
    lowerText === 'skip' ||
    lowerText === '⏭️ skip' ||
    lowerText.includes('skip')

  // 2. Check if user clicked Cancel
  const isCancel =
    cleanId === 'btn_cancel_order' ||
    lowerText.includes('cancel')

  if (isCancel) {
    await updateSessionState(supabase, session.id, 'MAIN_MENU', {
      cart: [],
      selected_branch_id: null,
      selected_address_id: null,
      pending_remarks: null,
      idempotency_key: null,
    })
    return await sendWhatsAppTextMessage(phone, '❌ Order cancelled. Returned to main menu.')
  }

  let finalRemarks: string | null = null

  if (!isSkip && cleanText && !cleanText.startsWith('btn_') && cleanText.length > 0) {
    finalRemarks = cleanText
  }

  await updateSessionState(supabase, session.id, 'CONFIRMING_ORDER', {
    pending_remarks: finalRemarks,
  })
  session.pending_remarks = finalRemarks

  return await renderOrderReview(phone, session, session.selected_address_id, supabase)
}

async function handleCheckoutAction(phone: string, session: any, customer: any, supabase: any) {
  const cart = normalizeCart(session?.cart)
  const branchId = session?.selected_branch_id

  if (!cart || cart.length === 0) {
    await updateSessionState(supabase, session.id, 'MAIN_MENU')
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ *Your cart is empty.*\nPlease select a branch to order fresh fish.`
    )
  }

  if (!branchId) {
    return await showBranchSelection(phone, session, supabase)
  }

  // 1. Verify branch inventory for all cart items
  const today = new Date().toISOString().split('T')[0]
  const activeStock = await getBranchInventory(supabase, branchId, today)

  for (const item of cart) {
    const invItem = activeStock.find((i: any) => i.product_id === item.product_id)
    const availKg = Number(invItem?.available_stock ?? invItem?.opening_stock ?? 0)

    if (!invItem || availKg < Number(item.quantity_kg || 1)) {
      return await sendWhatsAppButtonsMessage(
        phone,
        `❌ *Stock Availability Issue*\n"${item.product_name}" has only ${availKg}kg left in stock at this branch (requested ${item.quantity_kg}kg).\n\nWould you like to adjust your cart or clear cart?`,
        [
          { id: 'btn_add_more', title: '➕ Adjust Cart' },
          { id: 'btn_clear_cart', title: '🗑️ Clear Cart & Resume' },
        ]
      )
    }
  }

  // 2. Delivery Address Check & Resolution
  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  let realCustomerId = customer?.id || session?.customer_id
  if (!isUuid(realCustomerId)) {
    const { data: cData } = await supabase.from('customers').select('id').eq('phone', phone).single()
    if (cData?.id && isUuid(cData.id)) {
      realCustomerId = cData.id
    }
  }

  // HARD RULE: ALWAYS reset pre-existing selected_address_id, location, AND pending_remarks parameters when Proceed Checkout is clicked!
  await updateSessionState(supabase, session.id, 'SELECTING_ADDRESS', {
    selected_address_id: null,
    delivery_address: null,
    pending_new_address: null,
    pending_remarks: null,
    address_mode: null,
    latitude: null,
    longitude: null,
    maps_url: null,
  })
  session.selected_address_id = null
  session.delivery_address = null
  session.pending_remarks = null
  session.latitude = null
  session.longitude = null
  session.maps_url = null

  // Fetch all saved addresses for this customer
  const { data: customerAddrs } = await supabase
    .from('addresses')
    .select('*')
    .eq('customer_id', realCustomerId)
    .order('created_at', { ascending: false })

  // CASE 1: Customer has NO saved address
  if (!customerAddrs || customerAddrs.length === 0) {
    return await sendWhatsAppButtonsMessage(
      phone,
      `📍 *DELIVERY LOCATION*\n\nYou don't have a saved delivery address yet.\n\nChoose how you would like to provide your delivery location:`,
      [
        { id: 'btn_share_location', title: '📍 Share Location' },
        { id: 'btn_add_new_address', title: '✏️ Enter Address' },
      ]
    )
  }

  // CASE 2: Customer has EXACTLY 1 saved address
  if (customerAddrs.length === 1) {
    const addr = customerAddrs[0]
    const label = addr.label || addr.title || 'Home'
    const line = addr.address_line || addr.address_line1 || addr.address || ''
    const pin = addr.pincode ? `, ${addr.pincode}` : ''
    const fullText = `${line}${pin}`.trim()
    const hasCoords = addr.latitude && addr.longitude

    return await sendWhatsAppButtonsMessage(
      phone,
      `📍 *DELIVERY ADDRESS*\n\nWe found a saved delivery address:\n\n🏠 *${label}*\n${fullText}${hasCoords ? '\n📍 *Location coordinates available*' : ''}\n\nChoose how you would like to provide your delivery location for this order:`,
      [
        { id: `addr_confirm_${addr.id}`, title: '🏠 Use Saved Address' },
        { id: 'btn_share_location', title: '📍 Share Location' },
        { id: 'btn_add_new_address', title: '✏️ Enter New Address' },
      ]
    )
  }

  // CASE 3: Customer has MULTIPLE saved addresses
  const rows: WhatsAppListRow[] = [
    {
      id: 'btn_share_location',
      title: '📍 Share Live Location',
      description: 'Share current WhatsApp GPS coordinates',
    },
    ...customerAddrs.map((addr: any, idx: number) => {
      const label = addr.label || addr.title || `Address ${idx + 1}`
      const line = addr.address_line || addr.address_line1 || addr.address || ''
      const pin = addr.pincode ? `, ${addr.pincode}` : ''
      const desc = `${line}${pin}`.trim()
      const hasCoords = addr.latitude && addr.longitude
      return {
        id: `addr_sel_${addr.id}`,
        title: `🏠 ${label.slice(0, 20)}`,
        description: `${hasCoords ? '📍 Location saved | ' : ''}${desc}`.slice(0, 72),
      }
    }),
    {
      id: 'btn_add_new_address',
      title: '✏️ Add New Address',
      description: 'Enter a new delivery address for this order',
    },
  ]

  return await sendWhatsAppListMessage(
    phone,
    `📍 *SELECT DELIVERY ADDRESS*\n\nChoose your saved address or share live location:`,
    'Select Address',
    [
      {
        title: 'Delivery Options',
        rows,
      },
    ]
  )
}

async function handleCartRouter(phone: string, userText: string, session: any, supabase: any) {
  const clean = userText.toLowerCase().trim()

  if (clean === 'btn_add_more' || clean.includes('add_more')) {
    await updateSessionState(supabase, session.id, 'SELECTING_FISH')
    return await showDailyFishMenu(phone, session, supabase)
  }
  if (clean === 'btn_clear_cart' || clean.includes('clear_cart') || clean.includes('clear cart')) {
    return await handleClearCartAction(phone, session, supabase)
  }
  if (clean === 'btn_checkout' || clean.includes('checkout')) {
    return await handleCheckoutAction(phone, session, session?.customer_id ? { id: session.customer_id } : null, supabase)
  }

  return await sendWhatsAppButtonsMessage(
    phone,
    `🛒 *Your Cart is Active*\nWould you like to proceed to checkout or manage your cart?`,
    [
      { id: 'btn_checkout', title: '🚀 Proceed Checkout' },
      { id: 'btn_add_more', title: '➕ Add More Fish' },
      { id: 'btn_clear_cart', title: '🗑️ Clear Cart & Resume' },
    ]
  )
}

async function handleAddressSelection(phone: string, userText: string, session: any, supabase: any, rawText?: string) {
  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  const inputClean = (userText || '').trim()
  const rawClean = (rawText || '').trim()

  // 1. Check if user clicked "Add New Address" or "Edit Address"
  if (
    inputClean === 'btn_add_new_address' ||
    inputClean === 'btn_edit_new_address' ||
    inputClean === 'addr_new' ||
    inputClean.toLowerCase().includes('add new address') ||
    inputClean.toLowerCase().includes('edit address')
  ) {
    await updateSessionState(supabase, session.id, 'ADDING_ADDRESS', {
      pending_new_address: null,
      selected_address_id: null,
    })
    return await sendWhatsAppTextMessage(
      phone,
      `📍 *ADD DELIVERY ADDRESS*\n\nPlease enter your complete delivery address.\n\n*Example:*\nHouse Name, House Number\nStreet / Area\nCity\nPIN Code`
    )
  }

  // 2. Check if user confirmed selecting a saved address (ID: addr_confirm_<UUID> or addr_use_single_<UUID>)
  if (inputClean.startsWith('addr_confirm_') || inputClean.startsWith('addr_use_single_')) {
    const targetAddrId = inputClean.replace(/^addr_confirm_|^addr_use_single_/, '').trim()
    if (isUuid(targetAddrId)) {
      const { data: matchedAddr } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', targetAddrId)
        .single()

      if (matchedAddr) {
        parseSessionLocation(session)
        const line = matchedAddr.address_line || matchedAddr.address_line1 || matchedAddr.address || ''
        const fullText = `${line}${matchedAddr.pincode ? ', ' + matchedAddr.pincode : ''}`.trim()

        if (matchedAddr.latitude && matchedAddr.longitude) {
          session.latitude = matchedAddr.latitude
          session.longitude = matchedAddr.longitude
          session.maps_url = matchedAddr.maps_url || `https://www.google.com/maps?q=${matchedAddr.latitude},${matchedAddr.longitude}`
        } else if (session.latitude && session.longitude) {
          try {
            await supabase.from('addresses').update({
              latitude: session.latitude,
              longitude: session.longitude,
            }).eq('id', matchedAddr.id)
          } catch (e) {}
        }

        await updateSessionState(supabase, session.id, 'ADDING_REMARKS', {
          selected_address_id: matchedAddr.id,
          address_mode: 'saved',
          delivery_address: fullText,
          pending_remarks: null,
        })
        session.selected_address_id = matchedAddr.id
        session.delivery_address = fullText
        session.pending_remarks = null

        return await promptAdditionalRemarks(phone, session, supabase)
      }
    }
  }

  // 3. Check if user selected a saved address from the List (ID: addr_sel_<UUID>)
  if (inputClean.startsWith('addr_sel_')) {
    const targetAddrId = inputClean.replace(/^addr_sel_/, '').trim()
    if (isUuid(targetAddrId)) {
      const { data: matchedAddr } = await supabase
        .from('addresses')
        .select('*')
        .eq('id', targetAddrId)
        .single()

      if (matchedAddr) {
        const label = matchedAddr.label || matchedAddr.title || 'Saved Address'
        const line = matchedAddr.address_line || matchedAddr.address_line1 || matchedAddr.address || ''
        const fullText = `${line}${matchedAddr.pincode ? ', ' + matchedAddr.pincode : ''}`.trim()

        return await sendWhatsAppButtonsMessage(
          phone,
          `📍 *CONFIRM DELIVERY ADDRESS*\n\nUse this address for your order?\n\n🏠 *${label}*\n${fullText}`,
          [
            { id: `addr_confirm_${matchedAddr.id}`, title: '✅ Use This Address' },
            { id: 'btn_add_new_address', title: '✏️ Add New Address' },
          ]
        )
      }
    }
  }

  // 4. Check if user confirmed NEW address (ID: btn_confirm_new_address)
  if (inputClean === 'btn_confirm_new_address') {
    const pendingAddress = session.pending_new_address || session.delivery_address
    if (!pendingAddress || pendingAddress.trim().length < 5) {
      await updateSessionState(supabase, session.id, 'ADDING_ADDRESS')
      return await sendWhatsAppTextMessage(phone, `📍 Please enter your complete delivery address:`)
    }

    const trimmedAddress = pendingAddress.trim()
    const pincodeMatch = trimmedAddress.match(/\b\d{6}\b/)
    const pincode = pincodeMatch ? pincodeMatch[0] : '682031'

    let realCustomerId = session.customer_id
    if (!isUuid(realCustomerId)) {
      const { data: cData } = await supabase.from('customers').select('id').eq('phone', phone).single()
      if (cData?.id && isUuid(cData.id)) realCustomerId = cData.id
    }

    let addressIdToSave: string | null = null

    if (isUuid(realCustomerId)) {
      // Check for exact existing match first to avoid duplicate insertion
      const { data: existingAddrs } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', realCustomerId)

      const existingMatch = existingAddrs?.find((a: any) => {
        const line = (a.address_line || a.address_line1 || a.address || '').toLowerCase()
        return line && (trimmedAddress.toLowerCase().includes(line) || line.includes(trimmedAddress.toLowerCase()))
      })

      if (existingMatch?.id && isUuid(existingMatch.id)) {
        addressIdToSave = existingMatch.id
      } else {
        try {
          const { data: directData } = await supabase
            .from('addresses')
            .insert([
              {
                customer_id: realCustomerId,
                label: 'Home',
                address_line: cleanAddressForDisplay(trimmedAddress),
                pincode: pincode,
                latitude: session.latitude || null,
                longitude: session.longitude || null,
                is_default: false,
              },
            ])
            .select('id')
            .single()

          if (directData?.id && isUuid(directData.id)) {
            addressIdToSave = directData.id
          }
        } catch (e) {}

        if (!addressIdToSave) {
          try {
            const { data: rpcAddr } = await supabase.rpc('upsert_address_sec', {
              p_customer_id: realCustomerId,
              p_address_line1: trimmedAddress,
              p_title: 'Home',
              p_city: 'Kochi',
              p_pincode: pincode,
            })
            const parsed = typeof rpcAddr === 'string' ? JSON.parse(rpcAddr) : rpcAddr
            if (parsed?.id && isUuid(parsed.id)) addressIdToSave = parsed.id
            else if (isUuid(rpcAddr)) addressIdToSave = rpcAddr
          } catch (e) {}
        }
      }
    }

    parseSessionLocation(session)
    if (addressIdToSave && session.latitude && session.longitude) {
      try {
        await supabase.from('addresses').update({
          latitude: session.latitude,
          longitude: session.longitude,
        }).eq('id', addressIdToSave)
      } catch (e) {}
    }

    await updateSessionState(supabase, session.id, 'ADDING_REMARKS', {
      selected_address_id: addressIdToSave,
      address_mode: 'new',
      delivery_address: trimmedAddress,
      pending_new_address: null,
      pending_remarks: null,
    })
    session.selected_address_id = addressIdToSave
    session.delivery_address = trimmedAddress
    session.pending_remarks = null

    return await promptAdditionalRemarks(phone, session, supabase)
  }

  // 5. If user typed text while in ADDING_ADDRESS or entered a raw address string
  const textToValidate = rawClean || inputClean
  if (textToValidate && !textToValidate.startsWith('btn_')) {
    return await handleAddingAddress(phone, textToValidate, session, session.customer_id, supabase)
  }

  return await sendWhatsAppTextMessage(phone, `📍 Please reply with your delivery address or choose an option above.`)
}

async function handleAddingAddress(phone: string, addressText: string, session: any, customerId: string, supabase: any) {
  const trimmedAddress = addressText.replace(/^Address[\s\n]*/i, '').trim()

  if (!trimmedAddress || trimmedAddress.length < 5 || isPinOnlyInput(trimmedAddress)) {
    await updateSessionState(supabase, session.id, 'ADDING_ADDRESS')
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ Address entry is invalid or incomplete.\n\nPlease reply with your complete delivery address including house name/number, street, area, city, and 6-digit pincode:\n\n*(PIN code alone is not sufficient for delivery)*`
    )
  }

  const lat = session?.latitude
  const lng = session?.longitude
  const gpsTag = lat && lng ? ` [GPS:${lat},${lng}]` : ''
  const fullDeliveryAddr = `${trimmedAddress}${gpsTag}`

  // Store as pending_new_address and ask for confirmation
  await updateSessionState(supabase, session.id, 'CONFIRMING_NEW_ADDRESS', {
    pending_new_address: trimmedAddress,
    delivery_address: fullDeliveryAddr,
  })

  return await sendWhatsAppButtonsMessage(
    phone,
    `📍 *ADDRESS RECEIVED*\n\n${trimmedAddress}\n\nIs this correct?`,
    [
      { id: 'btn_confirm_new_address', title: '✅ Use This Address' },
      { id: 'btn_edit_new_address', title: '✏️ Edit Address' },
    ]
  )
}

async function renderOrderReview(phone: string, session: any, addressId: string | null, supabase: any, fallbackAddressText?: string) {
  let addressText = fallbackAddressText || session?.delivery_address || 'Saved Delivery Address, Kochi'

  let locStatus = 'Not shared'
  if (session?.latitude && session?.longitude) {
    locStatus = 'Shared successfully'
  }

  if (addressId) {
    const { data: addr } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .single()

    if (addr) {
      const line = addr?.address_line || addr?.address_line1 || addr?.address
      if (line) {
        addressText = `${line}${addr.pincode ? `, ${addr.pincode}` : ''}`.trim()
      }
      if (addr.latitude && addr.longitude) {
        locStatus = 'Shared successfully'
      }
    }
  }

  const cleanAddr = cleanAddressForDisplay(addressText)

  let branchName = 'Bestiet Fresh'
  const branchId = session?.selected_branch_id
  if (branchId) {
    const { data: bData } = await supabase.from('branches').select('name').eq('id', branchId).single()
    if (bData?.name) branchName = bData.name
  }

  // Re-fetch current database inventory price_per_kg for each cart item to guarantee summary total == order total
  const today = getTodayDateIST()
  const rawCart = normalizeCart(session?.cart)
  let itemsTotal = 0
  const refreshedCart: any[] = []

  if (branchId) {
    const activeStockItems = await getBranchInventory(supabase, branchId, today)
    for (const item of rawCart) {
      const inv = activeStockItems.find((i: any) => i.product_id === item.product_id)
      let unitPrice = Number(item.unit_price || item.price_per_kg || 220)
      if (inv && inv.price_per_kg && Number(inv.price_per_kg) > 0) {
        unitPrice = Number(inv.price_per_kg)
      }
      const qty = Number(item.quantity_kg || item.quantity || 1.0)
      const subtotal = Math.round(unitPrice * qty * 100) / 100
      refreshedCart.push({
        ...item,
        unit_price: unitPrice,
        price_per_kg: unitPrice,
        subtotal,
      })
      itemsTotal += subtotal
    }
  } else {
    refreshedCart.push(...rawCart)
    itemsTotal = rawCart.reduce((sum: number, i: any) => sum + (Number(i.subtotal) || 0), 0)
  }

  // Update session cart with refreshed prices
  await updateSessionState(supabase, session.id, 'CONFIRMING_ORDER', {
    cart: refreshedCart,
  })

  let reviewText = `📋 *ORDER CONFIRMATION SUMMARY*\n\n`
  reviewText += `🏪 *Branch:* ${branchName}\n\n`

  refreshedCart.forEach((i: any, idx: number) => {
    reviewText += `${idx + 1}. *${i.product_name}* — ${i.quantity_kg}kg (${(i.cutting_type || 'whole').replace('_', ' ')})\n   ₹${i.subtotal}\n`
  })

  const deliveryFee = 30.00
  const grandTotal = Math.round((itemsTotal + deliveryFee) * 100) / 100

  reviewText += `-----------------------\n`
  reviewText += `Items Subtotal: ₹${itemsTotal}\n`
  reviewText += `Delivery Fee: ₹${deliveryFee}\n`
  reviewText += `*Grand Total: ₹${grandTotal}*\n\n`
  reviewText += `📍 *Delivery Address:*\n${cleanAddr}\n\n`
  reviewText += `📍 *Location:*\n${locStatus}\n\n`
  const remarksText = session?.pending_remarks ? session.pending_remarks : 'None'
  reviewText += `📝 *Remarks:*\n${remarksText}\n\n`
  reviewText += `💳 *Payment Method:* Cash on Delivery`

  return await sendWhatsAppButtonsMessage(phone, reviewText, [
    { id: 'btn_confirm_order', title: '✅ Confirm & Order' },
    { id: 'btn_cancel_order', title: '❌ Cancel Order' },
  ])
}

async function handleOrderReview(
  phone: string,
  userText: string,
  session: any,
  customerId: string,
  incomingMessageId: string | undefined,
  supabase: any
) {
  const normalizedInput = userText.toLowerCase().trim()
  const isCancel =
    normalizedInput === 'btn_cancel_order' ||
    normalizedInput.includes('cancel order') ||
    normalizedInput.includes('cancel') ||
    normalizedInput.includes('❌')

  if (isCancel) {
    await updateSessionState(supabase, session.id, 'MAIN_MENU', {
      cart: [],
      selected_branch_id: null,
      selected_address_id: null,
      pending_remarks: null,
      idempotency_key: null,
      latitude: null,
      longitude: null,
      maps_url: null,
    })
    return await sendWhatsAppTextMessage(phone, '❌ Order cancelled. Returned to main menu.')
  }

async function fallbackCreateOrderAtomic(
  supabase: any,
  {
    customerId,
    addressId,
    cart,
    branchId,
    customerRemarks,
    idempotencyKey,
    deliveryFee = 30,
    today,
  }: {
    customerId: string | null
    addressId: string | null
    cart: any[]
    branchId: string
    customerRemarks: string | null
    idempotencyKey: string
    deliveryFee: number
    today: string
  }
) {
  try {
    let subtotal = 0
    for (const item of cart) {
      const itemSubtotal = Math.round(Number(item.quantity_kg) * Number(item.unit_price || item.price_per_kg || 0) * 100) / 100
      subtotal += itemSubtotal
    }
    const totalAmount = Math.round((subtotal + deliveryFee) * 100) / 100

    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    const orderNumber = `BF-${today.replace(/-/g, '')}-${randomSuffix}`

    let customerPhone = null
    if (customerId) {
      const { data: cust } = await supabase.from('customers').select('phone').eq('id', customerId).single()
      if (cust) customerPhone = cust.phone
    }

    let deliveryAddressLabel = null
    if (addressId) {
      const { data: addr } = await supabase.from('addresses').select('address_line1, city, pincode').eq('id', addressId).single()
      if (addr) deliveryAddressLabel = `${addr.address_line1 || ''}, ${addr.city || ''} ${addr.pincode || ''}`.trim()
    }

    const { data: newOrder, error: oErr } = await supabase
      .from('orders')
      .insert([{
        order_number: orderNumber,
        customer_id: customerId,
        address_id: addressId,
        branch_id: branchId,
        subtotal: subtotal,
        delivery_charge: deliveryFee,
        total: totalAmount,
        total_amount: totalAmount,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'COD',
        customer_remarks: customerRemarks,
        idempotency_key: idempotencyKey,
        delivery_address: deliveryAddressLabel,
        business_date: today,
        customer_phone: customerPhone
      }])
      .select('id, order_number, total_amount')
      .single()

    if (oErr || !newOrder) {
      console.error('[FALLBACK ORDER INSERTION ERROR]:', oErr)
      return { success: false, error: oErr?.message || 'Order insertion failed' }
    }

    for (const item of cart) {
      const qty = Number(item.quantity_kg)
      const unitPrice = Number(item.unit_price || item.price_per_kg || 0)
      const itemSubtotal = Math.round(qty * unitPrice * 100) / 100

      await supabase.from('order_items').insert([{
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: qty,
        price_per_kg: unitPrice,
        cutting_type: item.cutting_type || 'whole',
        total: itemSubtotal
      }])

      const { data: invRow } = await supabase
        .from('inventory')
        .select('id, available_stock, sold_stock')
        .eq('product_id', item.product_id)
        .eq('branch_id', branchId)
        .eq('inventory_date', today)
        .single()

      if (invRow) {
        const newAvailable = Math.max(0, Number(invRow.available_stock || 0) - qty)
        const newSold = Number(invRow.sold_stock || 0) + qty
        const newStatus = newAvailable <= 0 ? 'out_of_stock' : 'available'

        await supabase
          .from('inventory')
          .update({
            available_stock: newAvailable,
            sold_stock: newSold,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', invRow.id)

        await supabase.from('inventory_movements').insert([{
          inventory_id: invRow.id,
          product_id: item.product_id,
          movement_type: 'SALE',
          quantity_change: -qty,
          reason: `Customer order ${newOrder.order_number} | Idempotency: ${idempotencyKey || ''}`,
          reference_id: newOrder.id
        }])
      }
    }

    return {
      success: true,
      order_id: newOrder.id,
      order_number: newOrder.order_number,
      total_amount: newOrder.total_amount
    }
  } catch (err: any) {
    console.error('[FALLBACK ORDER CATCH ERROR]:', err?.message || err)
    return { success: false, error: err?.message || 'Fallback execution failed' }
  }
}

  // 1. ALWAYS RELOAD THE LATEST CHAT SESSION FROM SUPABASE
  let { data: latestSession } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('customer_id', customerId)
    .single()

  if (!latestSession && session?.id) {
    const { data: byId } = await supabase.from('chat_sessions').select('*').eq('id', session.id).single()
    if (byId) latestSession = byId
  }

  const activeSession = latestSession || session
  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  let realCustomerId = customerId
  if (!isUuid(realCustomerId)) {
    const { data: cData } = await supabase.from('customers').select('id').eq('phone', phone).single()
    if (cData?.id && isUuid(cData.id)) {
      realCustomerId = cData.id
    }
  }

  let validAddressId: string | null = isUuid(activeSession.selected_address_id) ? activeSession.selected_address_id : null

  if (validAddressId && isUuid(realCustomerId)) {
    const { data: addrCheck } = await supabase
      .from('addresses')
      .select('id')
      .eq('id', validAddressId)
      .eq('customer_id', realCustomerId)
      .maybeSingle()

    if (!addrCheck) {
      validAddressId = null
    }
  }

  // 2. ADDRESS ID FALLBACK / RESOLUTION
  if (!validAddressId && isUuid(realCustomerId)) {
    const { data: customerAddrs } = await supabase
      .from('addresses')
      .select('id')
      .eq('customer_id', realCustomerId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (customerAddrs && customerAddrs.length > 0 && isUuid(customerAddrs[0].id)) {
      validAddressId = customerAddrs[0].id
    }

    const addrStringToUse = activeSession.delivery_address
    if (!validAddressId && addrStringToUse) {
      const trimmedAddr = addrStringToUse.trim()
      const pincodeMatch = trimmedAddr.match(/\b\d{6}\b/)
      const pincode = pincodeMatch ? pincodeMatch[0] : '682031'

      const { data: directData } = await supabase
        .from('addresses')
        .insert([
          {
            customer_id: realCustomerId,
            label: 'Home',
            address_line: trimmedAddr,
            pincode: pincode,
            latitude: activeSession.latitude || null,
            longitude: activeSession.longitude || null,
            is_default: true,
          },
        ])
        .select('id')
        .single()

      if (directData?.id && isUuid(directData.id)) {
        validAddressId = directData.id
      }
    }

    if (validAddressId) {
      await updateSessionState(supabase, activeSession.id, 'CONFIRMING_ORDER', {
        selected_address_id: validAddressId,
      })
    }
  }

  // 3. NEVER CALL create_order_atomic WITH NULL ADDRESS
  if (!validAddressId) {
    await updateSessionState(supabase, activeSession.id, 'SELECTING_ADDRESS')
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ Your delivery address could not be loaded.\nPlease reply with your full delivery address and 6-digit pincode (e.g., "Flat 4B, Marine Drive, Kochi 682031").`
    )
  }

  // 4. RELOAD EVERYTHING BEFORE ORDER (Cart, Branch, Address, Customer)
  const cart = normalizeCart(activeSession.cart)
  if (cart.length === 0) {
    await updateSessionState(supabase, activeSession.id, 'MAIN_MENU')
    return await sendWhatsAppTextMessage(phone, '⚠️ Cart is empty. Order could not be placed.')
  }

  const validBranchId = isUuid(activeSession.selected_branch_id) ? activeSession.selected_branch_id : null
  if (!validBranchId) {
    return await showBranchSelection(phone, activeSession, supabase)
  }

  // 5. PER-CHECKOUT UNIQUE IDEMPOTENCY KEY (Isolated per checkout attempt)
  const msgTag = incomingMessageId ? incomingMessageId.replace(/[^a-zA-Z0-9_-]/g, '_') : `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const stableIdempotencyKey = `wa_chk:${customerId}:${activeSession.id}:${msgTag}`
  await updateSessionState(supabase, activeSession.id, 'PROCESSING_ORDER')

  const today = getTodayDateIST()
  const validCustomerId = isUuid(customerId) ? customerId : null
  const customerRemarks = activeSession.pending_remarks || null

  parseSessionLocation(activeSession)
  if (validAddressId && activeSession.latitude && activeSession.longitude) {
    try {
      await supabase.from('addresses').update({
        latitude: activeSession.latitude,
        longitude: activeSession.longitude,
      }).eq('id', validAddressId)
    } catch (e) {}
  }

  console.log('[CHECKOUT DIAGNOSTIC LOG]:', JSON.stringify({
    business_date: today,
    selected_branch_id: validBranchId,
    selected_product_ids: cart.map((c: any) => c.product_id),
    requested_quantities: cart.map((c: any) => c.quantity_kg),
    idempotency_key: stableIdempotencyKey,
    latitude: activeSession.latitude,
    longitude: activeSession.longitude,
  }, null, 2))

  // 6. ENSURE INVENTORY IS ROLLED FORWARD FOR TODAY AND CALL CANONICAL PRODUCTION RPC
  await getBranchInventory(supabase, validBranchId, today)

  let deliveryFeeAmt = 30.00
  try {
    const { data: storeSettings } = await supabase.rpc('get_store_business_settings')
    if (storeSettings && storeSettings.standard_delivery_charge !== undefined && storeSettings.standard_delivery_charge !== null) {
      deliveryFeeAmt = Number(storeSettings.standard_delivery_charge)
    }
  } catch (e) {}

  const { data: result, error: orderErr } = await supabase.rpc('create_order_atomic', {
    p_customer_id: validCustomerId,
    p_address_id: validAddressId,
    p_items: cart,
    p_inventory_date: today,
    p_idempotency_key: stableIdempotencyKey,
    p_delivery_fee: deliveryFeeAmt,
    p_branch_id: validBranchId,
    p_customer_remarks: customerRemarks,
  })

  let resObj = typeof result === 'string' ? JSON.parse(result) : result

  // Fallback order placement if RPC fails due to missing columns or SQL procedure mismatch
  if ((orderErr || !resObj?.success) && !orderErr?.message?.includes('NO_INVENTORY') && !orderErr?.message?.includes('INSUFFICIENT_STOCK')) {
    console.warn('[ORDER PLACEMENT RECOVERY]: RPC failed with non-inventory error. Triggering fallback order placement using core verified columns...', orderErr)
    const fbRes = await fallbackCreateOrderAtomic(supabase, {
      customerId: validCustomerId,
      addressId: validAddressId,
      cart,
      branchId: validBranchId,
      customerRemarks,
      idempotencyKey: stableIdempotencyKey,
      deliveryFee: deliveryFeeAmt,
      today,
    })
    if (fbRes.success) {
      console.log('[ORDER PLACEMENT RECOVERY SUCCESSFUL]: Order created via fallback:', fbRes)
      resObj = fbRes
    }
  }

  // 7. RESET AND CLEAR CART ON FAILED ORDER AS DIRECTED BY USER
  if ((orderErr && !resObj?.success) || !resObj?.success) {
    const rawErrMsg = resObj?.error || orderErr?.message || 'Stock allocation failed'
    console.error('[CHECKOUT INVENTORY ERROR LOG]:', rawErrMsg)

    const normPhone = normalizePhoneNumber(phone)
    const productIdsStr = cart.map((c: any) => c.product_id).join(',') || 'none'
    console.log(`[NO_INVENTORY_FLOW]\ncustomer_phone=${normPhone}\nbranch_id=${validBranchId}\ncart_id=${activeSession.id}\nsession_id=${activeSession.id}\nproduct_ids=${productIdsStr}`)

    let reasonText = `The selected fish is currently unavailable or out of stock at this branch.`
    if (rawErrMsg.includes('NO_INVENTORY')) {
      reasonText = `The selected fish is currently unavailable at your selected branch for today.`
    } else if (rawErrMsg.includes('INSUFFICIENT_STOCK')) {
      reasonText = `${rawErrMsg.replace('INSUFFICIENT_STOCK:', '').trim()}`
    }

    // Call canonical atomic clear operation with DB verification
    const clearResult = await clearCustomerCart(supabase, phone, activeSession, validCustomerId, validBranchId)

    console.log(`[NO_INVENTORY_FLOW_COMPLETE]`)

    if (clearResult.success) {
      const friendlyMsg = `⚠️ *Order Could Not Be Completed*\n\n${reasonText}\n\n🗑️ Your cart has been cleared. Please select another fish from our menu.`
      return await sendWhatsAppButtonsMessage(
        phone,
        friendlyMsg,
        [
          { id: 'btn_main_menu', title: '🐟 Main Menu' },
        ]
      )
    } else {
      const failMsg = `⚠️ *Order Could Not Be Completed*\n\n${reasonText}\n\nWe could not reset your cart automatically due to a temporary issue.\nPlease tap 🗑️ Clear Cart to reset manually.`
      return await sendWhatsAppButtonsMessage(
        phone,
        failMsg,
        [
          { id: 'btn_clear_cart', title: '🗑️ Clear Cart' },
          { id: 'btn_main_menu', title: '🐟 Main Menu' },
        ]
      )
    }
  }

  // 8. UPDATE ORDER WITH GPS LOCATION COORDINATES AND MAPS URL IF SHARED
  if (resObj?.order_id && (activeSession.latitude || activeSession.longitude)) {
    try {
      const lat = activeSession.latitude
      const lng = activeSession.longitude
      const mapsUrl = activeSession.maps_url || `https://www.google.com/maps?q=${lat},${lng}`
      await supabase.from('orders').update({
        latitude: lat,
        longitude: lng,
        maps_url: mapsUrl
      }).eq('id', resObj.order_id)
    } catch (e) {
      console.error('[Order location update error]:', e)
    }
  }

  // 9. CLEAR CART & SESSION ONLY AFTER SUCCESSFUL RPC ORDER CREATION
  await updateSessionState(supabase, activeSession.id, 'MAIN_MENU', {
    cart: [],
    selected_branch_id: null,
    selected_address_id: null,
    pending_remarks: null,
    idempotency_key: null,
    latitude: null,
    longitude: null,
    maps_url: null,
  })

  const orderNumber = resObj?.order_number || resObj?.order_id?.slice(0, 8) || 'BF-SUCCESS'
  const totalAmount = resObj?.total_amount ?? 0
  const bName = activeSession.branch_name || 'Manvila Kazhakkoottam Branch'

  const confirmationText = `🎉 *Order Confirmed!*\n\nYour Bestiet Fresh order has been placed successfully.\n\nOrder:\n*#${orderNumber}*\n\nTotal:\n*₹${totalAmount}*\n\nBranch:\n*${bName}*\n\nPayment:\n*Cash on Delivery*\n\n**Please check the order status after sometime.**\n\nThank you for choosing Bestiet Fresh! 🐟💚`

  return await sendWhatsAppButtonsMessage(phone, confirmationText, [
    { id: 'btn_track_order', title: '📦 Track Order' },
    { id: 'btn_main_menu', title: '🐟 Menu' },
  ])
}

async function handleTrackOrder(phone: string, customerId: string, supabase: any) {
  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  let realCustomerId = customerId
  if (!isUuid(realCustomerId)) {
    const { data: cData } = await supabase.from('customers').select('id').eq('phone', phone).single()
    if (cData?.id && isUuid(cData.id)) {
      realCustomerId = cData.id
    }
  }

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*)), order_items(*, product:products(*)), branch:branches(name)')
    .eq('customer_id', realCustomerId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!recentOrders || recentOrders.length === 0) {
    return await sendWhatsAppButtonsMessage(phone, `📦 *No Active Orders*\nYou have no orders in your history yet.\nWould you like to order fresh fish today?`, [
      { id: 'btn_order_fish', title: '🛒 Order Fresh Fish' },
      { id: 'btn_main_menu', title: '🐟 Main Menu' },
    ])
  }

  let text = `📦 *YOUR LIVE ORDERS TRACKING*\n\n`
  recentOrders.forEach((ord: any, idx: number) => {
    const statusUpper = (ord.status || 'PENDING').toUpperCase()
    let statusEmoji = '⏳'
    if (statusUpper === 'ACCEPTED' || statusUpper === 'PREPARING' || statusUpper === 'PACKED') statusEmoji = '👨‍🍳'
    else if (statusUpper === 'OUT_FOR_DELIVERY' || statusUpper === 'DISPATCHED') statusEmoji = '🛵'
    else if (statusUpper === 'DELIVERED') statusEmoji = '✅'
    else if (statusUpper === 'CANCELLED') statusEmoji = '❌'

    const branchName = ord.branch?.name || 'Bestiet Fresh'
    const totalAmt = Number(ord.total_amount ?? ord.total ?? 0)
    const itemsList = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : Array.isArray(ord.order_items) ? ord.order_items : []

    text += `*Order #${ord.order_number || ord.id.slice(0, 8)}*\n`
    text += `🏪 Branch: *${branchName}*\n`
    text += `Status: ${statusEmoji} *${statusUpper.replace(/_/g, ' ')}*\n`
    text += `Total Amount: *₹${totalAmt}*\n`

    if (itemsList.length > 0) {
      text += `Fish Items:\n`
      itemsList.forEach((it: any) => {
        const pName = it.product?.name || 'Fresh Fish'
        const qty = Number(it.quantity_kg ?? it.quantity ?? 1)
        const cut = (it.cutting_type || 'whole').replace(/_/g, ' ')
        text += `  • ${pName} — ${qty}kg (${cut})\n`
      })
    }

    if (idx < recentOrders.length - 1) {
      text += `-----------------------\n`
    }
  })

  return await sendWhatsAppButtonsMessage(phone, text, [
    { id: 'btn_order_fish', title: '🛒 Order Fresh Fish' },
    { id: 'btn_main_menu', title: '🐟 Main Menu' },
  ])
}

async function handlePreviousOrders(phone: string, customerId: string, supabase: any) {
  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  let realCustomerId = customerId
  if (!isUuid(realCustomerId)) {
    const { data: cData } = await supabase.from('customers').select('id').eq('phone', phone).single()
    if (cData?.id && isUuid(cData.id)) {
      realCustomerId = cData.id
    }
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*)), order_items(*, product:products(*)), branch:branches(name)')
    .eq('customer_id', realCustomerId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!orders || orders.length === 0) {
    return await sendWhatsAppButtonsMessage(phone, `🔄 *No Previous Order History*\nYou have not placed any orders yet.\nWould you like to order fresh fish today?`, [
      { id: 'btn_order_fish', title: '🛒 Order Fresh Fish' },
      { id: 'btn_main_menu', title: '🐟 Main Menu' },
    ])
  }

  let text = `🔄 *YOUR PREVIOUS ORDER HISTORY*\n\n`
  orders.forEach((ord: any, idx: number) => {
    const statusUpper = (ord.status || 'PENDING').toUpperCase()
    const branchName = ord.branch?.name || 'Bestiet Fresh'
    const totalAmt = Number(ord.total_amount ?? ord.total ?? 0)
    const itemsList = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : Array.isArray(ord.order_items) ? ord.order_items : []

    text += `*#${ord.order_number || ord.id.slice(0, 8)}* — ₹${totalAmt} (${statusUpper})\n`
    text += `🏪 ${branchName}\n`
    if (itemsList.length > 0) {
      const itemsSummary = itemsList.map((it: any) => `${it.product?.name || 'Fish'} (${it.quantity_kg ?? it.quantity}kg)`).join(', ')
      text += `Items: ${itemsSummary}\n`
    }
    if (idx < orders.length - 1) {
      text += `-----------------------\n`
    }
  })

  return await sendWhatsAppButtonsMessage(phone, text, [
    { id: 'btn_order_fish', title: '🛒 Order Again' },
    { id: 'btn_main_menu', title: '🐟 Main Menu' },
  ])
}

async function updateSessionState(
  supabase: any,
  sessionOrId: any,
  state: BotState,
  extra: Record<string, any> = {}
) {
  if (!sessionOrId) return

  let sessionId = typeof sessionOrId === 'string' ? sessionOrId : sessionOrId?.id
  let customerId = typeof sessionOrId === 'object' ? sessionOrId?.customer_id : null

  if (typeof sessionOrId === 'object') {
    sessionOrId.state = state
    Object.assign(sessionOrId, extra)
  }

  const allowedColumns = [
    'state',
    'cart',
    'selected_branch_id',
    'selected_product_id',
    'selected_quantity',
    'selected_cutting_type',
    'selected_address_id',
    'delivery_address',
    'pending_remarks',
  ]

  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  // Extract raw UUID if sessionId has prefix like "sess_<UUID>"
  let extractedUuidFromSessionId: string | null = null
  if (typeof sessionId === 'string' && sessionId.startsWith('sess_')) {
    const rawUuid = sessionId.replace('sess_', '')
    if (isUuid(rawUuid)) {
      extractedUuidFromSessionId = rawUuid
    }
  }

  const dbPayload: Record<string, any> = { state, updated_at: new Date().toISOString() }
  for (const key of allowedColumns) {
    if (key in extra) {
      if ((key === 'selected_address_id' || key === 'selected_branch_id' || key === 'selected_product_id') && extra[key] !== null) {
        dbPayload[key] = isUuid(extra[key]) ? extra[key] : null
      } else {
        dbPayload[key] = extra[key]
      }
    }
  }

  // 1. Primary update by sessionId if valid UUID
  if (sessionId && isUuid(sessionId)) {
    const { error } = await supabase
      .from('chat_sessions')
      .update(dbPayload)
      .eq('id', sessionId)

    if (error) {
      console.warn('[updateSessionState by id warning]:', error.message)
    }
  }

  // 2. Fallback update by customer_id if session is referenced by customer_id or sess_ prefix
  const targetCustId = (customerId && isUuid(customerId)) ? customerId : extractedUuidFromSessionId
  if (targetCustId && isUuid(targetCustId)) {
    const { error } = await supabase
      .from('chat_sessions')
      .update(dbPayload)
      .eq('customer_id', targetCustId)

    if (error) {
      console.warn('[updateSessionState by customer_id warning]:', error.message)
    }
  }
}
