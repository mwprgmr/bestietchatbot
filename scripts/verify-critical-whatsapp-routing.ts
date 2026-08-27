import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { processWhatsAppMessage, normalizeWhatsAppAction } from '../lib/whatsapp/state-machine'

async function verifyCriticalWhatsAppRouting() {
  console.log('===========================================================')
  console.log('EXHAUSTIVE VERIFICATION OF CENTRALIZED ACTION ROUTER & BOT')
  console.log('===========================================================')

  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const parts = line.split('=')
      if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        if (key && val && !process.env[key]) {
          process.env[key] = val
        }
      }
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const testPhone = '919895000001'
  const MANVILA_BRANCH_ID = 'b1111111-1111-1111-1111-111111111111'
  const PEROORKADA_BRANCH_ID = 'b2222222-2222-2222-2222-222222222222'

  // --- PART 1: ACTION NORMALIZER UNIT TESTS ---
  console.log('\n--- PART 1: Testing normalizeWhatsAppAction Unit Logic ---')
  const a1 = normalizeWhatsAppAction({ from: testPhone, messageId: 'm1', type: 'button_reply', buttonId: 'btn_order_fish', text: '🛒 Order Fresh Fish' })
  const a2 = normalizeWhatsAppAction({ from: testPhone, messageId: 'm2', type: 'button_reply', buttonId: 'order_fish', text: 'Order Fresh Fish' })
  const a3 = normalizeWhatsAppAction({ from: testPhone, messageId: 'm3', type: 'button_reply', buttonId: 'btn_track_order', text: '📦 Track Order' })
  const a4 = normalizeWhatsAppAction({ from: testPhone, messageId: 'm4', type: 'button_reply', buttonId: 'btn_previous_orders', text: '🔄 Previous Orders' })
  const a5 = normalizeWhatsAppAction({ from: testPhone, messageId: 'm5', type: 'button_reply', buttonId: 'btn_checkout', text: '🚀 Proceed Checkout' })
  const a6 = normalizeWhatsAppAction({ from: testPhone, messageId: 'm6', type: 'button_reply', buttonId: 'btn_clear_cart', text: '🗑️ Clear Cart & Resume' })

  console.log('Action 1 (btn_order_fish + 🛒 Order Fresh Fish):', a1 === 'ORDER_FISH' ? '🎉 ORDER_FISH' : `❌ ${a1}`)
  console.log('Action 2 (order_fish + Order Fresh Fish):', a2 === 'ORDER_FISH' ? '🎉 ORDER_FISH' : `❌ ${a2}`)
  console.log('Action 3 (btn_track_order + 📦 Track Order):', a3 === 'TRACK_ORDER' ? '🎉 TRACK_ORDER' : `❌ ${a3}`)
  console.log('Action 4 (btn_previous_orders + 🔄 Previous Orders):', a4 === 'PREVIOUS_ORDERS' ? '🎉 PREVIOUS_ORDERS' : `❌ ${a4}`)
  console.log('Action 5 (btn_checkout + 🚀 Proceed Checkout):', a5 === 'CHECKOUT' ? '🎉 CHECKOUT' : `❌ ${a5}`)
  console.log('Action 6 (btn_clear_cart + 🗑️ Clear Cart & Resume):', a6 === 'CLEAR_CART' ? '🎉 CLEAR_CART' : `❌ ${a6}`)

  const normPass = a1 === 'ORDER_FISH' && a2 === 'ORDER_FISH' && a3 === 'TRACK_ORDER' && a4 === 'PREVIOUS_ORDERS' && a5 === 'CHECKOUT' && a6 === 'CLEAR_CART'

  // --- PART 2: INTEGRATION WORKFLOW TESTS ---
  console.log('\n--- PART 2: Testing Complete WhatsApp Message Processing ---')
  // Clean up test customer session
  const { data: testCust } = await supabase.from('customers').select('id').eq('phone', testPhone).single()
  if (testCust?.id) {
    await supabase.from('chat_sessions').delete().eq('customer_id', testCust.id)
  }

  // 1. Send "Hi" -> Welcome Menu
  console.log('\nStep 1: Send "Hi"')
  const r1: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_1_${Date.now()}`, type: 'text', text: 'Hi' })
  const t1 = typeof r1 === 'string' ? r1 : JSON.stringify(r1)
  const pass1 = t1.includes('Welcome to Bestiet Fresh')
  console.log('Step 1 (Welcome Menu):', pass1 ? '🎉 PASS' : '❌ FAIL')

  // 2. Click "🛒 Order Fresh Fish" (btn_order_fish) -> Branch Selection
  console.log('\nStep 2: Click "🛒 Order Fresh Fish" (btn_order_fish)')
  const r2: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_2_${Date.now()}`, type: 'button_reply', buttonId: 'btn_order_fish', text: '🛒 Order Fresh Fish' })
  const t2 = typeof r2 === 'string' ? r2 : JSON.stringify(r2)
  const pass2 = !t2.includes('option is no longer active') && (t2.includes('select a branch') || t2.includes('Available Branches') || t2.includes('Fresh Fish Catalogue'))
  console.log('Step 2 (Order Fresh Fish Routed cleanly!):', pass2 ? '🎉 PASS' : '❌ FAIL')

  // 3. Select Manvila Kazhakkoottam Branch
  console.log('\nStep 3: Select Branch (b1111111-1111-1111-1111-111111111111)')
  const r3: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_3_${Date.now()}`, type: 'list_reply', listId: MANVILA_BRANCH_ID, text: 'Manvila Kazhakkoottam Branch' })
  const t3 = typeof r3 === 'string' ? r3 : JSON.stringify(r3)
  const pass3 = t3.includes('Fresh Fish Catalogue') && (t3.includes('Manvila') || t3.includes('Kazhakkoottam'))
  console.log('Step 3 (Manvila Kazhakkoottam Inventory):', pass3 ? '🎉 PASS' : '❌ FAIL')

  // Query active product ID
  const { data: invList } = await supabase
    .from('inventory')
    .select('*, product:products(*)')
    .eq('branch_id', MANVILA_BRANCH_ID)
    .gt('available_stock', 0)
    .limit(1)

  const firstFish = invList?.[0]
  const targetFishId = firstFish?.product_id || firstFish?.id || 'fish_choora'
  const targetFishName = firstFish?.product?.name || 'choora'
  console.log(`Using fish for test: ${targetFishName} (ID: ${targetFishId})`)

  // 4. Select Fish
  console.log(`\nStep 4: Select Fish ("${targetFishName}")`)
  const r4: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_4_${Date.now()}`, type: 'list_reply', listId: targetFishId, text: targetFishName })
  const t4 = typeof r4 === 'string' ? r4 : JSON.stringify(r4)
  const pass4 = t4.includes('Choose quantity') || t4.includes('Selected:') || t4.includes('Select Cutting Preference')
  console.log('Step 4 (Fish Quantity Selection):', pass4 ? '🎉 PASS' : '❌ FAIL')

  // 5. Select Quantity
  console.log('\nStep 5: Select Quantity ("qty_1.0")')
  const r5: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_5_${Date.now()}`, type: 'button_reply', buttonId: 'qty_1.0', text: '1.0 kg' })
  const t5 = typeof r5 === 'string' ? r5 : JSON.stringify(r5)
  const pass5 = t5.includes('Select Cutting Preference')
  console.log('Step 5 (Cutting Preference):', pass5 ? '🎉 PASS' : '❌ FAIL')

  // 6. Select Cutting & Add to Cart
  console.log('\nStep 6: Select Cutting ("cut_curry")')
  const r6: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_6_${Date.now()}`, type: 'button_reply', buttonId: 'cut_curry', text: 'Curry Cut' })
  const t6 = typeof r6 === 'string' ? r6 : JSON.stringify(r6)
  const pass6 = t6.includes('Item Added to Cart')
  console.log('Step 6 (Item Added to Cart):', pass6 ? '🎉 PASS' : '❌ FAIL')

  // 7. Click Proceed Checkout (btn_checkout)
  console.log('\nStep 7: Click Proceed Checkout (btn_checkout)')
  const r7: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_7_${Date.now()}`, type: 'button_reply', buttonId: 'btn_checkout', text: '🚀 Proceed Checkout' })
  const t7 = typeof r7 === 'string' ? r7 : JSON.stringify(r7)
  const pass7 = !t7.includes('Item "btn_checkout" not found') && (t7.includes('Delivery Address') || t7.includes('ORDER CONFIRMATION SUMMARY'))
  console.log('Step 7 (Proceed Checkout No Item Not Found Error):', pass7 ? '🎉 PASS' : '❌ FAIL')

  // 8. Enter Address Text
  console.log('\nStep 8: Enter Delivery Address')
  const r8: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_8_${Date.now()}`, type: 'text', text: 'Flat 4B, Manvila, Kazhakkoottam 695581' })
  const t8 = typeof r8 === 'string' ? r8 : JSON.stringify(r8)
  const pass8 = t8.includes('ORDER CONFIRMATION SUMMARY')
  console.log('Step 8 (Address Accepted & Review Screen):', pass8 ? '🎉 PASS' : '❌ FAIL')

  // 9. Confirm Order
  console.log('\nStep 9: Confirm Order (btn_confirm_order)')
  const r9: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_9_${Date.now()}`, type: 'button_reply', buttonId: 'btn_confirm_order', text: 'Confirm & Order' })
  const t9 = typeof r9 === 'string' ? r9 : JSON.stringify(r9)
  const pass9 = t9.includes('CONGRATULATIONS') || t9.includes('ORDER PLACED')
  console.log('Step 9 (Order Created Successfully):', pass9 ? '🎉 PASS' : '❌ FAIL')

  // 10. Clear Cart & Resume with Peroorkada Branch
  console.log('\nStep 10: Clear Cart & Resume Action')
  await processWhatsAppMessage({ from: testPhone, messageId: `msg_10a_${Date.now()}`, type: 'list_reply', listId: PEROORKADA_BRANCH_ID, text: 'Peroorkada Branch' })
  await processWhatsAppMessage({ from: testPhone, messageId: `msg_10b_${Date.now()}`, type: 'list_reply', listId: targetFishId, text: targetFishName })
  await processWhatsAppMessage({ from: testPhone, messageId: `msg_10c_${Date.now()}`, type: 'button_reply', buttonId: 'qty_1.0', text: '1.0 kg' })
  await processWhatsAppMessage({ from: testPhone, messageId: `msg_10d_${Date.now()}`, type: 'button_reply', buttonId: 'cut_curry', text: 'Curry Cut' })

  const r10: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_10e_${Date.now()}`, type: 'button_reply', buttonId: 'btn_clear_cart', text: '🗑️ Clear Cart & Resume' })
  const t10 = typeof r10 === 'string' ? r10 : JSON.stringify(r10)
  const pass10 = !t10.includes('Item "btn_clear_cart" not found') && (t10.includes('Cart Cleared') || t10.includes('Fresh Fish Catalogue')) && (t10.includes('Peroorkada') || t10.includes('Branch'))
  console.log('Step 10 (btn_clear_cart Clears Cart & Resumes Peroorkada Branch):', pass10 ? '🎉 PASS' : '❌ FAIL')

  const overallPass = normPass && pass1 && pass2 && pass3 && pass4 && pass5 && pass6 && pass7 && pass8 && pass9 && pass10

  console.log('\n===========================================================')
  console.log('FINAL WHATSAPP ROUTING TEST RESULT:', overallPass ? '🎉 ALL TESTS PASSED SUCCESSFULLY!' : '❌ FAIL')
  console.log('===========================================================')
}

verifyCriticalWhatsAppRouting()
