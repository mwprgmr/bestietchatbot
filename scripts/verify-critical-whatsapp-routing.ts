import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { processWhatsAppMessage } from '../lib/whatsapp/state-machine'

async function verifyCriticalWhatsAppRouting() {
  console.log('===========================================================')
  console.log('EXHAUSTIVE VERIFICATION OF WHATSAPP ROUTING & NEW BRANCH NAMES')
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

  // Clean up any old test session
  const { data: testCust } = await supabase.from('customers').select('id').eq('phone', testPhone).single()
  if (testCust?.id) {
    await supabase.from('chat_sessions').delete().eq('customer_id', testCust.id)
  }

  // 1. New customer -> main menu
  console.log('\n--- 1. New Customer Greetings ("Hi") ---')
  const r1: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_1_${Date.now()}`, type: 'text', text: 'Hi' })
  const t1 = typeof r1 === 'string' ? r1 : JSON.stringify(r1)
  const pass1 = t1.includes('Welcome to Bestiet Fresh')
  console.log('Step 1 (Main Menu):', pass1 ? '🎉 PASS' : '❌ FAIL')

  // 2. Select branch -> branch inventory (Manvila Kazhakkoottam)
  console.log('\n--- 2. Select Branch (Manvila Kazhakkoottam) ---')
  const r2: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_2_${Date.now()}`, type: 'list_reply', listId: MANVILA_BRANCH_ID, text: 'Manvila Kazhakkoottam Branch' })
  const t2 = typeof r2 === 'string' ? r2 : JSON.stringify(r2)
  const pass2 = t2.includes('Fresh Fish Catalogue') && (t2.includes('Manvila') || t2.includes('Kazhakkoottam'))
  console.log('Step 2 (Branch Inventory - Manvila Kazhakkoottam):', pass2 ? '🎉 PASS' : '❌ FAIL')

  // Find active product ID from Manvila Kazhakkoottam inventory
  const { data: invList } = await supabase
    .from('inventory')
    .select('*, product:products(*)')
    .eq('branch_id', MANVILA_BRANCH_ID)
    .gt('available_stock', 0)
    .limit(1)

  const firstFish = invList?.[0]
  const targetFishId = firstFish?.product_id || firstFish?.id || 'ayala'
  const targetFishName = firstFish?.product?.name || 'ayala'
  console.log(`Using active fish item for testing: ${targetFishName} (ID: ${targetFishId})`)

  // 3. Select fish -> quantity
  console.log(`\n--- 3. Select Fish ("${targetFishName}") ---`)
  const r3: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_3_${Date.now()}`, type: 'list_reply', listId: targetFishId, text: targetFishName })
  const t3 = typeof r3 === 'string' ? r3 : JSON.stringify(r3)
  const pass3 = t3.includes('Choose quantity') || t3.includes('Selected:') || t3.includes('Select Cutting Preference')
  console.log('Step 3 (Select Quantity):', pass3 ? '🎉 PASS' : '❌ FAIL')

  // 4. Select quantity -> cutting
  console.log('\n--- 4. Select Quantity ("qty_1.0") ---')
  const r4: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_4_${Date.now()}`, type: 'button_reply', buttonId: 'qty_1.0', text: '1.0 kg' })
  const t4 = typeof r4 === 'string' ? r4 : JSON.stringify(r4)
  const pass4 = t4.includes('Select Cutting Preference')
  console.log('Step 4 (Select Cutting):', pass4 ? '🎉 PASS' : '❌ FAIL')

  // 5. Add to cart
  console.log('\n--- 5. Select Cutting ("cut_curry") ---')
  const r5: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_5_${Date.now()}`, type: 'button_reply', buttonId: 'cut_curry', text: 'Curry Cut' })
  const t5 = typeof r5 === 'string' ? r5 : JSON.stringify(r5)
  const pass5 = t5.includes('Item Added to Cart')
  console.log('Step 5 (Item Added to Cart):', pass5 ? '🎉 PASS' : '❌ FAIL')

  // 6. Send Hi with active cart
  console.log('\n--- 6. Send "Hi" with Active Cart ---')
  const r6: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_6_${Date.now()}`, type: 'text', text: 'Hi' })
  const t6 = typeof r6 === 'string' ? r6 : JSON.stringify(r6)
  const pass6 = t6.includes('You have an active cart') && t6.includes('btn_checkout') && t6.includes('btn_clear_cart')
  console.log('Step 6 (Active Cart Prompt):', pass6 ? '🎉 PASS' : '❌ FAIL')

  // 7. Click Proceed Checkout (btn_checkout)
  console.log('\n--- 7. Click Proceed Checkout (btn_checkout) ---')
  const r7: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_7_${Date.now()}`, type: 'button_reply', buttonId: 'btn_checkout', text: 'Proceed Checkout' })
  const t7 = typeof r7 === 'string' ? r7 : JSON.stringify(r7)
  const pass7 = !t7.includes('Item "btn_checkout" not found') && (t7.includes('Delivery Address') || t7.includes('ORDER CONFIRMATION SUMMARY'))
  console.log('Step 7 (btn_checkout No Item Not Found Error):', pass7 ? '🎉 PASS' : '❌ FAIL')

  // 8. Enter address
  console.log('\n--- 8. Enter Delivery Address ---')
  const r8: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_8_${Date.now()}`, type: 'text', text: 'Flat 4B, Manvila, Kazhakkoottam 695581' })
  const t8 = typeof r8 === 'string' ? r8 : JSON.stringify(r8)
  const pass8 = t8.includes('ORDER CONFIRMATION SUMMARY')
  console.log('Step 8 (Address Accepted & Review Screen):', pass8 ? '🎉 PASS' : '❌ FAIL')

  // 9. Confirm order (btn_confirm_order)
  console.log('\n--- 9. Confirm Order (btn_confirm_order) ---')
  const r9: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_9_${Date.now()}`, type: 'button_reply', buttonId: 'btn_confirm_order', text: 'Confirm & Order' })
  const t9 = typeof r9 === 'string' ? r9 : JSON.stringify(r9)
  const pass9 = t9.includes('CONGRATULATIONS') || t9.includes('ORDER PLACED')
  console.log('Step 9 (Order Created Successfully):', pass9 ? '🎉 PASS' : '❌ FAIL')

  // 10. Clear Cart & Resume Test with Peroorkada Branch
  console.log('\n--- 10. Testing Clear Cart & Resume Action with Peroorkada Branch ---')
  await processWhatsAppMessage({ from: testPhone, messageId: `msg_10a_${Date.now()}`, type: 'list_reply', listId: PEROORKADA_BRANCH_ID, text: 'Peroorkada Branch' })
  await processWhatsAppMessage({ from: testPhone, messageId: `msg_10b_${Date.now()}`, type: 'list_reply', listId: targetFishId, text: targetFishName })
  await processWhatsAppMessage({ from: testPhone, messageId: `msg_10c_${Date.now()}`, type: 'button_reply', buttonId: 'qty_1.0', text: '1.0 kg' })
  await processWhatsAppMessage({ from: testPhone, messageId: `msg_10d_${Date.now()}`, type: 'button_reply', buttonId: 'cut_curry', text: 'Curry Cut' })

  // Click btn_clear_cart
  console.log('Clicking "btn_clear_cart"...')
  const r11: any = await processWhatsAppMessage({ from: testPhone, messageId: `msg_11_${Date.now()}`, type: 'button_reply', buttonId: 'btn_clear_cart', text: 'Clear Cart & Resume' })
  const t11 = typeof r11 === 'string' ? r11 : JSON.stringify(r11)

  const pass11 = !t11.includes('Item "btn_clear_cart" not found') && t11.includes('Cart Cleared') && t11.includes('Peroorkada')
  console.log('Step 11 (btn_clear_cart Clears Cart & Resumes Peroorkada Branch):', pass11 ? '🎉 PASS' : '❌ FAIL')

  const overallPass = pass1 && pass2 && pass3 && pass4 && pass5 && pass6 && pass7 && pass8 && pass9 && pass11

  console.log('\n===========================================================')
  console.log('NEW BRANCH NAMES ROUTING TEST RESULT:', overallPass ? '🎉 PASS (MANVILA & PEROORKADA ACTIVE!)' : '❌ FAIL')
  console.log('===========================================================')
}

verifyCriticalWhatsAppRouting()
