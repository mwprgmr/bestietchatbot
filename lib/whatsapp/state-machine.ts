import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendWhatsAppTextMessage,
  sendWhatsAppButtonsMessage,
  sendWhatsAppListMessage,
} from './client'
import { IncomingMessagePayload, BotState, ChatSessionData } from './types'
import { normalizePhoneNumber } from './phone-utils'

export async function processWhatsAppMessage(payload: IncomingMessagePayload) {
  const supabase = createAdminClient()
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

  const buttonOrListId = (payload.buttonId || payload.listId || '').trim()
  const rawText = (payload.text || '').trim()
  const userText = buttonOrListId || rawText
  const cleanGlobal = `${buttonOrListId} ${rawText}`.toLowerCase().trim()

  const isConfirmIntent =
    userText === 'btn_confirm_order' ||
    payload.buttonId === 'btn_confirm_order' ||
    cleanGlobal.includes('btn_confirm_order') ||
    cleanGlobal.includes('confirm') ||
    cleanGlobal.includes('✅')

  const isCancelIntent =
    userText === 'btn_cancel_order' ||
    payload.buttonId === 'btn_cancel_order' ||
    cleanGlobal.includes('btn_cancel_order') ||
    (cleanGlobal.includes('cancel') && cleanGlobal.includes('order'))

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

  let botResponse: any = null

  // Global Navigation Overrides
  if (isConfirmIntent) {
    await updateSessionState(supabase, session, 'ORDER_REVIEW')
    botResponse = await handleOrderReview(phone, userText, session, customer.id, payload.messageId, supabase)
  } else if (isCancelIntent) {
    await updateSessionState(supabase, session, 'MAIN_MENU', { cart: [] })
    botResponse = await sendWhatsAppTextMessage(phone, '❌ Order cancelled. Returned to main menu.')
  } else if (['hi', 'hello', 'start', 'menu', 'main_menu', 'btn_main_menu'].some((cmd) => cleanGlobal.includes(cmd))) {
    await updateSessionState(supabase, session, 'MAIN_MENU')
    botResponse = await handleMainMenu(phone)
  } else if (userText === 'cancel_flow') {
    await updateSessionState(supabase, session, 'MAIN_MENU', { cart: [] })
    botResponse = await sendWhatsAppTextMessage(phone, '❌ Order cancelled. Returned to main menu.')
  } else {
    // Router based on Current State
    const currentState: BotState = session.state || 'MAIN_MENU'

    switch (currentState) {
      case 'MAIN_MENU':
        botResponse = await handleMainMenuRouter(phone, userText, session, supabase)
        break

      case 'SELECTING_BRANCH':
        botResponse = await handleBranchSelection(phone, userText, session, supabase)
        break

      case 'SELECTING_FISH':
        botResponse = await handleFishSelection(phone, userText, session, supabase)
        break

      case 'SELECTING_QUANTITY':
        botResponse = await handleQuantitySelection(phone, userText, session, supabase)
        break

      case 'SELECTING_CUT':
        botResponse = await handleCutSelection(phone, userText, session, supabase)
        break

      case 'CART':
        botResponse = await handleCartRouter(phone, userText, session, supabase)
        break

      case 'SELECTING_ADDRESS':
        botResponse = await handleAddressSelection(phone, userText, session, supabase)
        break

      case 'ADDING_ADDRESS':
        botResponse = await handleAddingAddress(phone, userText, session, customer.id, supabase)
        break

      case 'ADDING_REMARKS':
        botResponse = await handleAddingRemarks(phone, userText, session, supabase)
        break

      case 'ORDER_REVIEW':
      case 'CONFIRMING_ORDER':
        botResponse = await handleOrderReview(phone, userText, session, customer.id, payload.messageId, supabase)
        break

      case 'TRACK_ORDER':
        botResponse = await handleTrackOrder(phone, customer.id, supabase)
        break

      case 'PREVIOUS_ORDERS':
        botResponse = await handlePreviousOrders(phone, customer.id, supabase)
        break

      default:
        await updateSessionState(supabase, session.id, 'MAIN_MENU')
        botResponse = await handleMainMenu(phone)
        break
    }
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
  if (userText === 'btn_order_fish' || userText.toLowerCase().includes('order')) {
    return await showBranchSelection(phone, session, supabase)
  }
  if (userText === 'btn_track_order' || userText.toLowerCase().includes('track')) {
    await updateSessionState(supabase, session, 'TRACK_ORDER')
    return await handleTrackOrder(phone, session.customer_id, supabase)
  }
  if (userText === 'btn_previous_orders' || userText.toLowerCase().includes('previous')) {
    await updateSessionState(supabase, session, 'PREVIOUS_ORDERS')
    return await handlePreviousOrders(phone, session.customer_id, supabase)
  }

  return await handleMainMenu(phone)
}

async function showBranchSelection(phone: string, session: any, supabase: any) {
  const MARINE_DRIVE_ID = 'b1111111-1111-1111-1111-111111111111'
  const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'

  const activeBranches = [
    { id: MARINE_DRIVE_ID, name: 'Marine Drive Branch', location: 'Marine Drive, Kochi' },
    { id: FORT_KOCHI_ID, name: 'Fort Kochi Branch', location: 'Fort Kochi, Kochi' }
  ]

  const today = new Date().toISOString().split('T')[0]
  const { data: invCounts } = await supabase
    .from('inventory')
    .select('branch_id, product_id')
    .eq('inventory_date', today)
    .gt('available_stock', 0)

  const rows = activeBranches.map((b: any) => {
    const count = invCounts ? invCounts.filter((i: any) => i.branch_id === b.id || (!i.branch_id && b.id === MARINE_DRIVE_ID)).length : 0
    return {
      id: b.id,
      title: b.name,
      description: `${count} fish varieties available today`,
    }
  })

  await updateSessionState(supabase, session, 'SELECTING_BRANCH')

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
  const { data: branches } = await supabase.from('branches').select('*')

  const matchedBranch = branches?.find((b: any) => {
    const isId = b.id === cleanInput
    const isName = b.name.toLowerCase().includes(cleanInput) || cleanInput.includes(b.name.toLowerCase())
    return isId || isName
  })

  const branchIdToSave = matchedBranch?.id || (cleanInput.includes('fort') ? 'b2222222-2222-2222-2222-222222222222' : 'b1111111-1111-1111-1111-111111111111')

  await updateSessionState(supabase, session, 'SELECTING_FISH', {
    selected_branch_id: branchIdToSave,
  })

  return await showDailyFishMenu(phone, session, supabase, branchIdToSave)
}

async function showDailyFishMenu(phone: string, session: any, supabase: any, branchIdOverride?: string) {
  const today = new Date().toISOString().split('T')[0]
  const branchId = branchIdOverride || session?.selected_branch_id || 'b1111111-1111-1111-1111-111111111111'

  // Fetch branch details
  let branchName = 'Bestiet Fresh'
  const { data: bData } = await supabase.from('branches').select('name').eq('id', branchId).single()
  if (bData?.name) branchName = bData.name

  // Query Today's Inventory strictly for selected Branch
  const MARINE_DRIVE_ID = 'b1111111-1111-1111-1111-111111111111'
  const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'
  const targetBranchId = branchId === FORT_KOCHI_ID ? FORT_KOCHI_ID : MARINE_DRIVE_ID

  const { data: inventoryItems } = await supabase
    .from('inventory')
    .select('*, product:products(*)')
    .eq('inventory_date', today)
    .eq('branch_id', targetBranchId)
    .gt('available_stock', 0)

  // Filter out any items with 0 or negative available stock
  const activeStockItems = (inventoryItems || []).filter(
    (inv: any) => Number(inv.available_stock || 0) > 0
  )

  if (activeStockItems.length === 0) {
    await updateSessionState(supabase, session, 'MAIN_MENU')
    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ *Stock Update — ${branchName}*\nOur fresh catch for today is sold out or being prepared at this branch. Please check back shortly or try selecting another branch!`
    )
  }

  const rows = activeStockItems.map((inv: any) => ({
    id: inv.product_id,
    title: inv.product?.name || 'Fresh Fish',
    description: `₹${inv.price_per_kg}/kg | ${inv.available_stock}kg left`,
  }))

  await updateSessionState(supabase, session, 'SELECTING_FISH')

  return await sendWhatsAppListMessage(
    phone,
    `🐟 *${branchName} — Today's Fresh Catch*\nSelect the fish you'd like to order:`,
    'Select Fish',
    [
      {
        title: 'Fresh Catch Available Today',
        rows,
      },
    ]
  )
}

async function handleFishSelection(phone: string, userInput: string, session: any, supabase: any) {
  const today = new Date().toISOString().split('T')[0]
  const cleanInput = userInput.trim()
  const branchId = session?.selected_branch_id || 'b1111111-1111-1111-1111-111111111111'
  const MARINE_DRIVE_ID = 'b1111111-1111-1111-1111-111111111111'
  const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'
  const targetBranchId = branchId === FORT_KOCHI_ID ? FORT_KOCHI_ID : MARINE_DRIVE_ID

  // Query Today's Active Inventory for Selected Branch
  const { data: inventoryItems } = await supabase
    .from('inventory')
    .select('*, product:products(*)')
    .eq('inventory_date', today)
    .eq('branch_id', targetBranchId)

  // Flexible matching by product_id UUID OR case-insensitive product name / partial text
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

  // Check remaining available stock accurately
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
  const branchId = session?.selected_branch_id || 'b1111111-1111-1111-1111-111111111111'

  const { data: inv } = await supabase
    .from('inventory')
    .select('*, product:products(*)')
    .eq('product_id', productId)
    .eq('inventory_date', today)
    .eq('branch_id', branchId)
    .single()

  const availableStock = inv ? Number(inv.available_stock || 0) : 999
  const productName = inv?.product?.name || 'this fish'

  // Calculate total quantity of this fish already in cart
  const currentCart = Array.isArray(session.cart) ? session.cart : []
  const existingCartQty = currentCart
    .filter((cartItem: any) => cartItem.product_id === productId)
    .reduce((sum: number, cartItem: any) => sum + Number(cartItem.quantity_kg || 0), 0)

  const totalProposedQty = existingCartQty + qty

  // Prevent adding if combined total exceeds current inventory
  if (inv && totalProposedQty > availableStock) {
    const remainingAllowed = Math.max(0, availableStock - existingCartQty)

    if (remainingAllowed <= 0) {
      return await sendWhatsAppTextMessage(
        phone,
        `⚠️ Cannot add more ${productName}. You already have the maximum available stock (${availableStock}kg) in your cart!`
      )
    }

    return await sendWhatsAppTextMessage(
      phone,
      `⚠️ Only ${availableStock}kg available in total! You already have ${existingCartQty}kg in your cart. You can only add up to ${remainingAllowed}kg more.`
    )
  }

  await updateSessionState(supabase, session.id, 'SELECTING_CUT', {
    selected_quantity: qty,
  })

  return await sendWhatsAppButtonsMessage(
    phone,
    `🔪 *Selected: ${qty} kg*\nSelect Cutting Style:\nHow would you like your fish prepared?`,
    [
      { id: 'cut_whole', title: 'Whole (Uncut)' },
      { id: 'cut_curry_cut', title: 'Curry Cut 🍛' },
      { id: 'cut_fry_cut', title: 'Fry Cut 🍳' },
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

  const { data: inv } = await supabase
    .from('inventory')
    .select('*, product:products(*)')
    .eq('product_id', productId)
    .eq('inventory_date', today)
    .single()

  if (!inv) {
    await updateSessionState(supabase, session.id, 'MAIN_MENU')
    return await sendWhatsAppTextMessage(phone, '⚠️ Product session expired. Please start order again.')
  }

  const unitPrice = Number(inv.price_per_kg)
  const subtotal = Math.round(unitPrice * qty * 100) / 100

  const currentCart = Array.isArray(session.cart) ? [...session.cart] : []
  currentCart.push({
    product_id: productId,
    product_name: inv.product?.name || 'Fish',
    quantity_kg: qty,
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

async function handleCartRouter(phone: string, userText: string, session: any, supabase: any) {
  if (userText === 'btn_add_more') {
    return await showDailyFishMenu(phone, session.id, supabase)
  }
  if (userText === 'btn_clear_cart') {
    await updateSessionState(supabase, session.id, 'MAIN_MENU', { cart: [] })
    return await sendWhatsAppTextMessage(phone, '🗑️ Cart cleared. Returned to main menu.')
  }

  if (userText === 'btn_checkout' || userText.toLowerCase().includes('checkout')) {
    const { data: addresses } = await supabase
      .from('addresses')
      .select('*')
      .eq('customer_id', session.customer_id)

    if (!addresses || addresses.length === 0) {
      await updateSessionState(supabase, session.id, 'ADDING_ADDRESS')
      return await sendWhatsAppTextMessage(
        phone,
        `📍 *Delivery Address Required*\nPlease reply with your full delivery address and pincode (e.g., "Flat 4B, Marine Drive, Kochi 682031"):`
      )
    }

    const rows = addresses.map((addr: any) => ({
      id: addr.id,
      title: addr.title || 'Address',
      description: `${addr.address_line1}, ${addr.city} ${addr.pincode || ''}`,
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

  return await handleMainMenu(phone)
}

async function handleAddressSelection(phone: string, userText: string, session: any, supabase: any) {
  if (userText === 'addr_new') {
    await updateSessionState(supabase, session, 'ADDING_ADDRESS')
    return await sendWhatsAppTextMessage(
      phone,
      `📍 Please reply with your full delivery address and pincode:`
    )
  }

  return await promptOrderRemarks(phone, session, userText, supabase)
}

async function handleAddingAddress(phone: string, addressText: string, session: any, customerId: string, supabase: any) {
  const trimmedAddress = addressText.trim()
  let newAddr: any = null
  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  if (isUuid(customerId)) {
    // 1. Direct insert
    const { data: directData, error: directErr } = await supabase
      .from('addresses')
      .insert([
        {
          customer_id: customerId,
          title: 'Home',
          address_line1: trimmedAddress,
          city: 'Kochi',
          is_default: true,
        },
      ])
      .select()
      .single()

    if (directErr) {
      console.warn('[Address Direct Insert Warning, attempting RPC]:', directErr.message)
      // 2. RPC SECURITY DEFINER fallback
      const { data: rpcData, error: rpcErr } = await supabase.rpc('upsert_address_sec', {
        p_customer_id: customerId,
        p_address_line1: trimmedAddress,
        p_title: 'Home',
        p_city: 'Kochi',
      })

      if (rpcErr) {
        console.warn('[Address RPC Warning, using fallback memory address]:', rpcErr.message)
        newAddr = {
          id: null,
          address_line1: trimmedAddress,
          city: 'Kochi',
        }
      } else {
        newAddr = rpcData
      }
    } else {
      newAddr = directData
    }
  } else {
    newAddr = {
      id: null,
      address_line1: trimmedAddress,
      city: 'Kochi',
    }
  }

  const addressIdToSave = newAddr?.id && isUuid(newAddr.id) ? newAddr.id : null
  return await promptOrderRemarks(phone, session, addressIdToSave, supabase, trimmedAddress)
}

async function promptOrderRemarks(phone: string, session: any, addressId: string | null, supabase: any, fallbackAddressText?: string) {
  await updateSessionState(supabase, session, 'ADDING_REMARKS', {
    selected_address_id: addressId,
  })

  return await sendWhatsAppButtonsMessage(
    phone,
    `📝 *Special Instructions / Remarks*\nWould you like to add any special instructions or remarks for your order?\n(e.g., "Clean cut required", "Deliver before 5 PM")\n\nReply with your remarks, or click below to skip:`,
    [
      { id: 'btn_skip_remarks', title: '⏩ Skip Remarks' },
    ]
  )
}

async function handleAddingRemarks(phone: string, remarksInput: string, session: any, supabase: any) {
  const clean = remarksInput.trim()
  const isSkip = clean === 'btn_skip_remarks' || clean.toLowerCase() === 'skip' || clean.toLowerCase() === 'none'

  const finalRemarks = isSkip ? null : clean

  await updateSessionState(supabase, session, 'ORDER_REVIEW', {
    pending_remarks: finalRemarks,
  })

  return await renderOrderReview(phone, session, session?.selected_address_id || null, supabase)
}

async function renderOrderReview(phone: string, session: any, addressId: string | null, supabase: any, fallbackAddressText?: string) {
  let addressText = fallbackAddressText || 'Saved Delivery Address, Kochi'

  if (addressId) {
    const { data: addr } = await supabase
      .from('addresses')
      .select('*')
      .eq('id', addressId)
      .single()

    if (addr?.address_line1) {
      addressText = `${addr.address_line1}, ${addr.city || 'Kochi'}`
    }
  }

  let branchName = 'Marine Drive Branch'
  const branchId = session?.selected_branch_id
  if (branchId) {
    const { data: bData } = await supabase.from('branches').select('name').eq('id', branchId).single()
    if (bData?.name) branchName = bData.name
  }

  const cart = session?.cart || []
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
  idempotencyKey: string | undefined,
  supabase: any
) {
  const normalizedInput = userText.toLowerCase().trim()
  const isCancel =
    normalizedInput === 'btn_cancel_order' ||
    normalizedInput.includes('cancel order') ||
    normalizedInput.includes('cancel') ||
    normalizedInput.includes('❌')

  const isConfirm =
    normalizedInput === 'btn_confirm_order' ||
    normalizedInput.includes('confirm & order') ||
    normalizedInput.includes('confirm') ||
    normalizedInput.includes('order') ||
    normalizedInput.includes('✅') ||
    session.state === 'ORDER_REVIEW' ||
    session.state === 'CONFIRMING_ORDER'

  if (isCancel) {
    await updateSessionState(supabase, session.id, 'MAIN_MENU', { cart: [] })
    return await sendWhatsAppTextMessage(phone, '❌ Order cancelled. Returned to main menu.')
  }

  if (isConfirm) {
    const cart = session.cart || []
    if (cart.length === 0) {
      await updateSessionState(supabase, session.id, 'MAIN_MENU')
      return await sendWhatsAppTextMessage(phone, '⚠️ Cart is empty. Order could not be placed.')
    }

    const today = new Date().toISOString().split('T')[0]
    const rawAddressId = session.selected_address_id
    const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

    const validAddressId = isUuid(rawAddressId) ? rawAddressId : null
    const validCustomerId = isUuid(customerId) ? customerId : null
    const validBranchId = isUuid(session.selected_branch_id) ? session.selected_branch_id : 'b1111111-1111-1111-1111-111111111111'
    const customerRemarks = session.pending_remarks || null

    // Call Atomic RPC Order Placement Function
    const { data: result, error: orderErr } = await supabase.rpc('create_order_atomic', {
      p_customer_id: validCustomerId,
      p_address_id: validAddressId,
      p_items: cart,
      p_inventory_date: today,
      p_idempotency_key: idempotencyKey || `sim_${Date.now()}`,
      p_branch_id: validBranchId,
      p_customer_remarks: customerRemarks,
    })

    const resObj = typeof result === 'string' ? JSON.parse(result) : result

    if (orderErr || !resObj?.success) {
      const errMsg = resObj?.error || orderErr?.message || 'Stock allocation failed'
      await updateSessionState(supabase, session.id, 'MAIN_MENU', { cart: [] })
      return await sendWhatsAppTextMessage(
        phone,
        `🚫 *Order Placement Failed*\nReason: ${errMsg}\n\nYour cart has been cleared. Please try again.`
      )
    }

    await updateSessionState(supabase, session.id, 'MAIN_MENU', { cart: [], selected_branch_id: null, pending_remarks: null })

    const orderNumber = resObj?.order_number || resObj?.order_id?.slice(0, 8) || 'BF-SUCCESS'
    const totalAmount = resObj?.total_amount ?? 0

    const confirmationText = `🎉 *CONGRATULATIONS! ORDER PLACED!* 🎉\n\nOrder Number: *#${orderNumber}*\nTotal Amount: *₹${totalAmount}*\n\nYour fresh fish order is being prepared and will be delivered shortly!\nThank you for choosing Bestiet Fresh! 🐟💚`

    return await sendWhatsAppButtonsMessage(phone, confirmationText, [
      { id: 'btn_track_order', title: '📦 Track Order' },
      { id: 'btn_main_menu', title: '🐟 Menu' },
    ])
  }

  return await sendWhatsAppTextMessage(phone, 'Please click "Confirm & Order" or "Cancel Order".')
}

async function handleTrackOrder(phone: string, customerId: string, supabase: any) {
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*))')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!recentOrders || recentOrders.length === 0) {
    return await sendWhatsAppTextMessage(phone, '📦 You have no active orders to track.')
  }

  let text = `📦 *Your Active Orders*\n\n`
  recentOrders.forEach((ord: any) => {
    text += `*Order #${ord.order_number}*\n`
    text += `Status: *${ord.status}*\n`
    text += `Total: ₹${ord.total_amount}\n`
    text += `-----------------------\n`
  })

  return await sendWhatsAppButtonsMessage(phone, text, [
    { id: 'btn_main_menu', title: '🐟 Main Menu' },
  ])
}

async function handlePreviousOrders(phone: string, customerId: string, supabase: any) {
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!orders || orders.length === 0) {
    return await sendWhatsAppTextMessage(phone, '🔄 No previous order history found.')
  }

  let text = `🔄 *Your Previous Orders*\n\n`
  orders.forEach((ord: any) => {
    text += `• *#${ord.order_number}* — ₹${ord.total_amount} (${ord.status})\n`
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

  const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

  if (sessionId && isUuid(sessionId)) {
    const { error } = await supabase
      .from('chat_sessions')
      .update({
        state,
        ...extra,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (error) {
      console.warn('[updateSessionState warning]:', error.message)
    }
  } else if (customerId && isUuid(customerId)) {
    const { error } = await supabase
      .from('chat_sessions')
      .update({
        state,
        ...extra,
        updated_at: new Date().toISOString(),
      })
      .eq('customer_id', customerId)

    if (error) {
      console.warn('[updateSessionState customer_id warning]:', error.message)
    }
  }
}
