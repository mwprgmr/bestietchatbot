import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendWhatsAppTextMessage,
  sendWhatsAppButtonsMessage,
  sendWhatsAppListMessage,
} from './client'
import { IncomingMessagePayload, BotState } from './types'
import { normalizePhoneNumber } from './phone-utils'

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
      product_name: item.product_name || item.name || 'Fish',
      quantity_kg: qty,
      quantity: qty,
      unit_price: price,
      cutting_type: item.cutting_type || item.cut_type || 'whole',
      subtotal,
    }
  })
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
  | 'PRODUCT_SELECTION'
  | 'QUANTITY_SELECTION'
  | 'CUT_SELECTION'
  | 'ADDRESS_SELECTION'
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

  // 10. BRANCH_SELECTION
  const isBranchId = cleanId === 'b1111111-1111-1111-1111-111111111111' || cleanId === 'b2222222-2222-2222-2222-222222222222' || cleanId.startsWith('btn_branch_')
  const isAddressContext = currentState === 'SELECTING_ADDRESS' || currentState === 'ADDING_ADDRESS' || isLikelyAddressText(rawText)
  const isBranchTitle = (combined.includes('manvila') || combined.includes('kazhakkoottam') || combined.includes('peroorkada')) && !isAddressContext
  if (isBranchId || isBranchTitle) {
    return 'BRANCH_SELECTION'
  }

  // 11. QUANTITY_SELECTION
  if (cleanId.startsWith('qty_')) {
    return 'QUANTITY_SELECTION'
  }

  // 12. CUT_SELECTION
  if (cleanId.startsWith('cut_')) {
    return 'CUT_SELECTION'
  }

  // 13. ADDRESS_SELECTION
  if (cleanId.startsWith('addr_') || (isAddressContext && !isBranchId)) {
    return 'ADDRESS_SELECTION'
  }

  // 14. PRODUCT_SELECTION (Only IDs starting with fish_ or matching UUIDs)
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

  // Normalize session cart for backward compatibility
  session.cart = normalizeCart(session.cart)

  const buttonOrListId = (payload.buttonId || payload.listId || '').trim()
  const rawText = (payload.text || '').trim()
  const userText = buttonOrListId || rawText

  // Save User Incoming Message to chat_messages Table
  if (session?.id && (rawText || buttonOrListId)) {
    try {
      await supabase.from('chat_messages').insert([{
        session_id: session.id,
        customer_id: customer.id,
        phone: phone,
        sender: 'user',
        text: rawText || buttonOrListId,
      }])
    } catch (e: any) {
      console.warn('[chat_messages insert user warning]:', e?.message)
    }
  }

  const hasActiveCart = Array.isArray(session.cart) && session.cart.length > 0 && !!session.selected_branch_id
  const currentState: BotState = session.state || 'MAIN_MENU'

  // Centralized Action Normalizer Execution
  const action = normalizeWhatsAppAction(payload, session, currentState)

  let botResponse: any = null

  // -------------------------------------------------------------
  // CENTRALIZED INTERACTION ACTION DISPATCHER
  // -------------------------------------------------------------
  switch (action) {
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

    case 'ORDER_FISH':
      if (session?.selected_branch_id) {
        await updateSessionState(supabase, session.id, 'SELECTING_FISH')
        botResponse = await showDailyFishMenu(phone, session, supabase, session.selected_branch_id)
      } else {
        await updateSessionState(supabase, session.id, 'SELECTING_BRANCH')
        botResponse = await showBranchSelection(phone, session, supabase)
      }
      break

    case 'ADD_MORE':
      await updateSessionState(supabase, session.id, 'SELECTING_FISH')
      botResponse = await showDailyFishMenu(phone, session, supabase)
      break

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
      break

    case 'MAIN_MENU':
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
      break

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

async function getOrRollForwardBranchInventory(supabase: any, branchId: string, targetDate?: string) {
  const today = targetDate || new Date().toISOString().split('T')[0]

  // Query ALL inventory records for this branch <= today ordered by inventory_date DESC, created_at DESC
  const { data: allItems } = await supabase
    .from('inventory')
    .select('*, product:products(*)')
    .eq('branch_id', branchId)
    .lte('inventory_date', today)
    .order('inventory_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (!allItems || allItems.length === 0) {
    return []
  }

  // Deduplicate by product_id keeping only the newest record for each product with available_stock > 0 and product.active !== false
  const productMap = new Map<string, any>()
  for (const item of allItems) {
    const avail = Number(item.available_stock ?? item.opening_stock ?? 0)
    const isProductActive = item.product ? item.product.active !== false : true
    if (!productMap.has(item.product_id) && avail > 0 && isProductActive) {
      productMap.set(item.product_id, item)
    }
  }

  const activeItems: any[] = Array.from(productMap.values())

  // Ensure carried-forward entries exist for today in DB so future atomic updates hit today's row cleanly
  for (const item of activeItems) {
    if (item.inventory_date !== today) {
      try {
        const avail = Number(item.available_stock ?? item.opening_stock ?? 0)
        const { data: created } = await supabase
          .from('inventory')
          .insert([
            {
              product_id: item.product_id,
              branch_id: branchId,
              inventory_date: today,
              price_per_kg: item.price_per_kg,
              opening_stock: avail,
              available_stock: avail,
              available_stock_kg: avail,
              low_stock_threshold: item.low_stock_threshold || 2,
            },
          ])
          .select('*, product:products(*)')
          .single()

        if (created) {
          productMap.set(item.product_id, created)
        }
      } catch (e) {}
    }
  }

  return Array.from(productMap.values())
}

async function showBranchSelection(phone: string, session: any, supabase: any) {
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const today = new Date().toISOString().split('T')[0]

  const rows = await Promise.all(
    (branches || []).map(async (b: any) => {
      const invItems = await getOrRollForwardBranchInventory(supabase, b.id, today)
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

  await updateSessionState(supabase, session.id, 'SELECTING_FISH', {
    selected_branch_id: selectedBranchId,
  })

  return await showDailyFishMenu(phone, session, supabase, selectedBranchId)
}

async function showDailyFishMenu(phone: string, session: any, supabase: any, branchIdOverride?: string) {
  const today = new Date().toISOString().split('T')[0]
  const branchId = branchIdOverride || session?.selected_branch_id

  if (!branchId) {
    return await showBranchSelection(phone, session, supabase)
  }

  let branchName = 'Bestiet Fresh'
  const { data: bData } = await supabase.from('branches').select('name').eq('id', branchId).single()
  if (bData?.name) branchName = bData.name

  // Query Active Inventory with automatic carry forward
  const activeStockItems = await getOrRollForwardBranchInventory(supabase, branchId, today)

  if (activeStockItems.length === 0) {
    await updateSessionState(supabase, session.id, 'SELECTING_BRANCH')
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ *Stock Update — ${branchName}*\nOur fresh catch for today is sold out or being prepared at this branch. Please select another branch!`
    )
  }

  const rows = activeStockItems.map((inv: any) => ({
    id: inv.product_id,
    title: inv.product?.name || 'Fresh Fish',
    description: `₹${inv.price_per_kg}/kg | ${inv.available_stock}kg left`,
  }))

  await updateSessionState(supabase, session.id, 'SELECTING_FISH', {
    selected_branch_id: branchId,
  })

  return await sendWhatsAppListMessage(
    phone,
    `🐟 *Fresh Fish Catalogue — ${branchName}*\nSelect a fish to choose quantity & cut:`,
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
  const today = new Date().toISOString().split('T')[0]
  const branchId = session?.selected_branch_id

  if (!branchId) {
    return await showBranchSelection(phone, session, supabase)
  }

  const inventoryItems = await getOrRollForwardBranchInventory(supabase, branchId, today)

  const selectedInv = (inventoryItems || []).find((inv: any) => {
    const isIdMatch = inv.product_id === cleanInput || inv.id === cleanInput
    const pName = (inv.product?.name || '').toLowerCase().trim()
    const inp = cleanInput.toLowerCase().trim()
    const isNameMatch = pName === inp
    const isPartialMatch = pName.includes(inp) || inp.includes(pName)
    return isIdMatch || isNameMatch || isPartialMatch
  })

  if (!selectedInv) {
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ Item "${cleanInput}" not found in today's menu for this branch. Please select a fish from the list.`
    )
  }

  const availableStock = Number(selectedInv.available_stock ?? selectedInv.opening_stock ?? 0)

  if (availableStock <= 0) {
    return await sendWhatsAppTextMessage(
      phone,
      `❌ Sorry, ${selectedInv.product?.name || 'that item'} is currently out of stock at this branch. Please select another fish from the menu.`
    )
  }

  await updateSessionState(supabase, session.id, 'SELECTING_QUANTITY', {
    selected_product_id: selectedInv.product_id,
  })

  return await sendWhatsAppButtonsMessage(
    phone,
    `⚖️ *Selected: ${selectedInv.product?.name || 'Fish'}*\nPrice: ₹${selectedInv.price_per_kg}/kg\nAvailable at branch: ${availableStock}kg\n\nChoose quantity below or reply with your custom quantity in kg (e.g. 1.5, 2.5):`,
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
  const today = new Date().toISOString().split('T')[0]
  const branchId = session?.selected_branch_id

  if (!branchId || !productId) {
    return await showBranchSelection(phone, session, supabase)
  }

  const inventoryItems = await getOrRollForwardBranchInventory(supabase, branchId, today)
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
  const today = new Date().toISOString().split('T')[0]
  const branchId = session.selected_branch_id

  if (!branchId || !productId) {
    return await showBranchSelection(phone, session, supabase)
  }

  const inventoryItems = await getOrRollForwardBranchInventory(supabase, branchId, today)
  const inv = inventoryItems.find((i: any) => i.product_id === productId)

  if (!inv) {
    await updateSessionState(supabase, session.id, 'MAIN_MENU')
    return await sendWhatsAppTextMessage(phone, '⚠️ Product session expired. Please start order again.')
  }

  const unitPrice = Number(inv.price_per_kg)
  const subtotal = Math.round(unitPrice * qty * 100) / 100

  const currentCart = normalizeCart(session.cart)
  currentCart.push({
    product_id: productId,
    product_name: inv.product?.name || 'Fish',
    quantity_kg: qty,
    quantity: qty,
    cutting_type: cutType,
    unit_price: unitPrice,
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

async function handleClearCartAction(phone: string, session: any, supabase: any) {
  const branchId = session?.selected_branch_id

  await updateSessionState(supabase, session.id, 'SELECTING_FISH', {
    cart: [],
    selected_product_id: null,
    selected_quantity: null,
    selected_cutting_type: null,
    selected_address_id: null,
    delivery_address: null,
    pending_remarks: null,
    idempotency_key: null,
    selected_branch_id: branchId, // Preserve selected branch!
  })

  await sendWhatsAppTextMessage(
    phone,
    `🗑️ *Cart Cleared!*\nYour cart has been reset. You can now select fresh fish from the same branch:`
  )

  if (branchId) {
    return await showDailyFishMenu(phone, session, supabase, branchId)
  } else {
    return await showBranchSelection(phone, session, supabase)
  }
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
  const activeStock = await getOrRollForwardBranchInventory(supabase, branchId, today)

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

  let selectedAddrId = isUuid(session?.selected_address_id) ? session.selected_address_id : null
  let deliveryAddrText = session?.delivery_address || null

  if (!selectedAddrId && isUuid(realCustomerId)) {
    const { data: customerAddrs } = await supabase
      .from('addresses')
      .select('*')
      .eq('customer_id', realCustomerId)
      .order('created_at', { ascending: false })

    if (customerAddrs && customerAddrs.length > 0) {
      if (customerAddrs.length === 1) {
        const addr = customerAddrs[0]
        selectedAddrId = addr.id
        const line = addr.address_line || addr.address_line1 || addr.address || ''
        deliveryAddrText = `${line}${addr.pincode ? ', ' + addr.pincode : ''}`.trim()
        await updateSessionState(supabase, session.id, 'CONFIRMING_ORDER', {
          selected_address_id: selectedAddrId,
          delivery_address: deliveryAddrText,
        })
      } else {
        const rows = customerAddrs.map((addr: any) => ({
          id: addr.id,
          title: addr.title || 'Address',
          description: `${addr.address_line1 || addr.address_line || addr.address || ''}, ${addr.city || 'Kochi'} ${addr.pincode || ''}`,
        }))
        rows.push({ id: 'addr_new', title: '+ Add New Address', description: 'Enter a new delivery address' })

        await updateSessionState(supabase, session.id, 'SELECTING_ADDRESS')

        return await sendWhatsAppListMessage(
          phone,
          `🏡 *Select Delivery Address*\nChoose your saved address for fresh delivery:`,
          'Select Address',
          [
            {
              title: 'Saved Delivery Addresses',
              rows,
            },
          ]
        )
      }
    }
  }

  if (!selectedAddrId && !deliveryAddrText) {
    await updateSessionState(supabase, session.id, 'SELECTING_ADDRESS')
    return await sendWhatsAppTextMessage(
      phone,
      `📍 *Delivery Address Required*\nPlease reply with your full delivery address and 6-digit pincode (e.g., "Flat 4B, Marine Drive, Kochi 682031"):`
    )
  }

  // 3. Render Order Summary
  await updateSessionState(supabase, session.id, 'CONFIRMING_ORDER', {
    selected_address_id: selectedAddrId,
    delivery_address: deliveryAddrText,
  })
  return await renderOrderReview(phone, session, selectedAddrId, supabase, deliveryAddrText)
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

  // 1. Check if user selected "+ Add New Address" list row or button
  if (inputClean === 'addr_new' || inputClean.toLowerCase().includes('add new address') || rawClean.toLowerCase().includes('add new address')) {
    await updateSessionState(supabase, session.id, 'ADDING_ADDRESS')
    return await sendWhatsAppTextMessage(
      phone,
      `📍 Please reply with your full delivery address and 6-digit pincode (e.g., "Flat 4B, Marine Drive, Kochi 682031"):`
    )
  }

  // 2. Check if userText or rawText is a direct UUID of a saved address
  const targetId = isUuid(inputClean) ? inputClean : isUuid(rawClean) ? rawClean : null

  if (targetId) {
    const { data: matchedAddr } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', targetId)
      .single()

    if (matchedAddr) {
      const line = matchedAddr.address_line || matchedAddr.address_line1 || matchedAddr.address || ''
      const fullText = `${line}${matchedAddr.pincode ? ', ' + matchedAddr.pincode : ''}`.trim()
      await updateSessionState(supabase, session.id, 'CONFIRMING_ORDER', {
        selected_address_id: matchedAddr.id,
        delivery_address: fullText,
      })
      return await renderOrderReview(phone, session, matchedAddr.id, supabase, fullText)
    }
  }

  // 3. Query saved addresses for this customer to check if text matches a saved address row
  let realCustomerId = session.customer_id
  if (!isUuid(realCustomerId)) {
    const { data: cData } = await supabase.from('customers').select('id').eq('phone', phone).single()
    if (cData?.id && isUuid(cData.id)) {
      realCustomerId = cData.id
    }
  }

  if (isUuid(realCustomerId)) {
    const { data: customerAddrs } = await supabase
      .from('addresses')
      .select('*')
      .eq('customer_id', realCustomerId)

    if (customerAddrs && customerAddrs.length > 0) {
      const addressSearchText = rawClean.replace(/^Address[\s\n]*/i, '').trim().toLowerCase()
      const inputSearchText = inputClean.replace(/^Address[\s\n]*/i, '').trim().toLowerCase()

      const matched = customerAddrs.find((a: any) => {
        if (a.id === inputClean || a.id === rawClean) return true
        const line = (a.address_line || a.address_line1 || a.address || '').toLowerCase()
        const pin = (a.pincode || '').toLowerCase()
        if (line && (addressSearchText.includes(line) || line.includes(addressSearchText))) return true
        if (line && (inputSearchText.includes(line) || line.includes(inputSearchText))) return true
        if (pin && addressSearchText.includes(pin) && addressSearchText.length > 8) return true
        return false
      })

      if (matched) {
        const line = matched.address_line || matched.address_line1 || matched.address || ''
        const fullText = `${line}${matched.pincode ? ', ' + matched.pincode : ''}`.trim()
        await updateSessionState(supabase, session.id, 'CONFIRMING_ORDER', {
          selected_address_id: matched.id,
          delivery_address: fullText,
        })
        return await renderOrderReview(phone, session, matched.id, supabase, fullText)
      }
    }
  }

  // 4. Fallback: treat user text as a newly entered address string
  return await handleAddingAddress(phone, rawClean || inputClean, session, realCustomerId, supabase)
}

async function handleAddingAddress(phone: string, addressText: string, session: any, customerId: string, supabase: any) {
  // Strip leading "Address\n" or "Address " prefix if present from WhatsApp quotes
  const trimmedAddress = addressText.replace(/^Address[\s\n]*/i, '').trim()

  // Validate 6-digit pincode
  const pincodeMatch = trimmedAddress.match(/\b\d{6}\b/)
  if (!pincodeMatch) {
    await updateSessionState(supabase, session.id, 'SELECTING_ADDRESS')
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ Please include your 6-digit pincode in the delivery address (e.g., "Flat 4B, Marine Drive, Kochi 682031").`
    )
  }

  const pincode = pincodeMatch[0]
  let addressIdToSave: string | null = null
  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  let realCustomerId = customerId
  if (!isUuid(realCustomerId)) {
    const { data: cData } = await supabase.from('customers').select('id').eq('phone', phone).single()
    if (cData?.id && isUuid(cData.id)) {
      realCustomerId = cData.id
    }
  }

  if (isUuid(realCustomerId)) {
    // Check if exact address already exists for this customer to prevent duplicate insertion
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
      // 1. Direct insert using actual database schema columns (address_line, label, pincode)
      try {
        const { data: directData } = await supabase
          .from('addresses')
          .insert([
            {
              customer_id: realCustomerId,
              label: 'Home',
              address_line: trimmedAddress,
              pincode: pincode,
              is_default: true,
            },
          ])
          .select('id')
          .single()

        if (directData?.id && isUuid(directData.id)) {
          addressIdToSave = directData.id
        }
      } catch (e) {}

      // 2. Try SECURITY DEFINER helper upsert_address_sec RPC fallback
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
          if (parsed?.id && isUuid(parsed.id)) {
            addressIdToSave = parsed.id
          } else if (isUuid(rpcAddr)) {
            addressIdToSave = rpcAddr
          }
        } catch (e) {}
      }

      // 3. Fallback: select most recent address for this customer
      if (!addressIdToSave) {
        const { data: latestAddrs } = await supabase
          .from('addresses')
          .select('id')
          .eq('customer_id', realCustomerId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (latestAddrs && latestAddrs.length > 0 && isUuid(latestAddrs[0].id)) {
          addressIdToSave = latestAddrs[0].id
        }
      }
    }
  }

  // Save selected_address_id and transition to CONFIRMING_ORDER
  await updateSessionState(supabase, session.id, 'CONFIRMING_ORDER', {
    selected_address_id: addressIdToSave,
    delivery_address: trimmedAddress,
  })

  // Display Order Confirmation Summary immediately
  return await renderOrderReview(phone, session, addressIdToSave, supabase, trimmedAddress)
}

async function renderOrderReview(phone: string, session: any, addressId: string | null, supabase: any, fallbackAddressText?: string) {
  let addressText = fallbackAddressText || session?.delivery_address || 'Saved Delivery Address, Kochi'

  if (addressId) {
    const { data: addr } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .single()

    const line = addr?.address_line || addr?.address_line1 || addr?.address
    if (line) {
      addressText = `${line}, ${addr.pincode || ''}`.trim()
    }
  }

  let branchName = 'Bestiet Fresh'
  const branchId = session?.selected_branch_id
  if (branchId) {
    const { data: bData } = await supabase.from('branches').select('name').eq('id', branchId).single()
    if (bData?.name) branchName = bData.name
  }

  const cart = normalizeCart(session?.cart)
  let itemsTotal = 0
  let reviewText = `📋 *ORDER CONFIRMATION SUMMARY*\n\n`
  reviewText += `🏪 *Branch:* ${branchName}\n\n`

  cart.forEach((i: any, idx: number) => {
    reviewText += `${idx + 1}. *${i.product_name}* — ${i.quantity_kg}kg (${i.cutting_type.replace('_', ' ')})\n   ₹${i.subtotal}\n`
    itemsTotal += i.subtotal
  })

  const deliveryFee = 30.00
  const grandTotal = itemsTotal + deliveryFee

  reviewText += `-----------------------\n`
  reviewText += `Items Subtotal: ₹${itemsTotal}\n`
  reviewText += `Delivery Fee: ₹${deliveryFee}\n`
  reviewText += `*Grand Total: ₹${grandTotal}*\n\n`
  reviewText += `📍 *Delivery Address:*\n${addressText}\n`
  if (session?.pending_remarks) {
    reviewText += `📝 *Order Remarks:* ${session.pending_remarks}\n`
  }
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
    })
    return await sendWhatsAppTextMessage(phone, '❌ Order cancelled. Returned to main menu.')
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

  // 2. ADDRESS ID FALLBACK / RESOLUTION
  if (!validAddressId && isUuid(realCustomerId)) {
    // A. Check if an address already exists in DB for this customer
    const { data: customerAddrs } = await supabase
      .from('addresses')
      .select('id')
      .eq('customer_id', realCustomerId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (customerAddrs && customerAddrs.length > 0 && isUuid(customerAddrs[0].id)) {
      validAddressId = customerAddrs[0].id
    }

    // B. If still null, create address from delivery_address text
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

  // 5. STABLE IDEMPOTENCY KEY (Deterministic per session & branch)
  const stableIdempotencyKey = `wa:${customerId}:${activeSession.id}:${activeSession.selected_branch_id}`
  await updateSessionState(supabase, activeSession.id, 'PROCESSING_ORDER')

  const today = new Date().toISOString().split('T')[0]
  const validCustomerId = isUuid(customerId) ? customerId : null
  const customerRemarks = activeSession.pending_remarks || null

  // 6. CALL CANONICAL PRODUCTION RPC (using Service Role client)
  const { data: result, error: orderErr } = await supabase.rpc('create_order_atomic', {
    p_customer_id: validCustomerId,
    p_address_id: validAddressId,
    p_items: cart,
    p_inventory_date: today,
    p_idempotency_key: stableIdempotencyKey,
    p_delivery_fee: 30.00,
    p_branch_id: validBranchId,
    p_customer_remarks: customerRemarks,
  })

  const resObj = typeof result === 'string' ? JSON.parse(result) : result

  // 7. CART MUST NOT BE CLEARED ON FAILURE
  if (orderErr || !resObj?.success) {
    const errMsg = resObj?.error || orderErr?.message || 'Stock allocation failed'
    // Preserve cart, branch, address on error
    await updateSessionState(supabase, activeSession.id, 'CONFIRMING_ORDER')
    return await sendWhatsAppButtonsMessage(
      phone,
      `🚫 *Order Placement Failed*\nReason: ${errMsg}\n\nYour cart is preserved. Would you like to retry or cancel?`,
      [
        { id: 'btn_confirm_order', title: '🔁 Retry Order' },
        { id: 'btn_cancel_order', title: '❌ Cancel Order' },
      ]
    )
  }

  // 8. CLEAR CART & SESSION ONLY AFTER SUCCESSFUL RPC ORDER CREATION
  await updateSessionState(supabase, activeSession.id, 'MAIN_MENU', {
    cart: [],
    selected_branch_id: null,
    selected_address_id: null,
    pending_remarks: null,
  })

  const orderNumber = resObj?.order_number || resObj?.order_id?.slice(0, 8) || 'BF-SUCCESS'
  const totalAmount = resObj?.total_amount ?? 0

  const confirmationText = `🎉 *CONGRATULATIONS! ORDER PLACED!* 🎉\n\nOrder Number: *#${orderNumber}*\nTotal Amount: *₹${totalAmount}*\n\nYour fresh fish order is being prepared and will be delivered shortly!\nThank you for choosing Bestiet Fresh! 🐟💚`

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

  const sessionId = typeof sessionOrId === 'string' ? sessionOrId : sessionOrId?.id
  const customerId = typeof sessionOrId === 'object' ? sessionOrId?.customer_id : null

  if (typeof sessionOrId === 'object') {
    sessionOrId.state = state
    Object.assign(sessionOrId, extra)
  }

  const allowedColumns = [
    'state',
    'selected_branch_id',
    'selected_product_id',
    'selected_quantity',
    'selected_cutting_type',
    'selected_address_id',
    'delivery_address',
    'cart',
  ]

  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

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

  if (sessionId && isUuid(sessionId)) {
    const { error } = await supabase
      .from('chat_sessions')
      .update(dbPayload)
      .eq('id', sessionId)

    if (error) {
      console.warn('[updateSessionState warning]:', error.message)
    }
  } else if (customerId && isUuid(customerId)) {
    const { error } = await supabase
      .from('chat_sessions')
      .update(dbPayload)
      .eq('customer_id', customerId)

    if (error) {
      console.warn('[updateSessionState customer_id warning]:', error.message)
    }
  }
}
