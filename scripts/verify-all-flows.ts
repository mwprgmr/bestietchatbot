import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testExactUserCheckoutFlow() {
  console.log('===========================================================')
  console.log('TESTING EXACT USER CHECKOUT FLOW & BRANCH ISOLATION')
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

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co',
    serviceRoleKey
  )

  const MARINE_DRIVE_ID = 'b1111111-1111-1111-1111-111111111111'
  const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'
  const today = new Date().toISOString().split('T')[0]

  // Seed Ayala product in both branches
  const { data: prods } = await supabase.from('products').select('*')
  const ayala = prods?.find((p: any) => p.name.toLowerCase().includes('ayala')) || prods?.[0]

  if (!ayala) {
    console.error('No product found for test!')
    return
  }

  // Delete old test inventory for today to start fresh at 50kg
  await supabase.from('inventory').delete().eq('product_id', ayala.id).eq('inventory_date', today)

  // Seed 50kg in Marine Drive Branch
  await supabase.from('inventory').insert([
    {
      product_id: ayala.id,
      branch_id: MARINE_DRIVE_ID,
      inventory_date: today,
      price_per_kg: 220,
      opening_stock: 50,
      available_stock: 50,
      low_stock_threshold: 2,
    },
  ])

  // Seed 50kg in Fort Kochi Branch
  await supabase.from('inventory').insert([
    {
      product_id: ayala.id,
      branch_id: FORT_KOCHI_ID,
      inventory_date: today,
      price_per_kg: 220,
      opening_stock: 50,
      available_stock: 50,
      low_stock_threshold: 2,
    },
  ])

  // Reset test customer session
  const testPhone = '919876543210'
  const { data: cust } = await supabase.from('customers').select('id').eq('phone', testPhone).single()
  if (cust?.id) {
    await supabase.from('chat_sessions').delete().eq('customer_id', cust.id)
  }

  console.log(`Freshly seeded inventory for ${ayala.name}: 50kg Marine Drive, 50kg Fort Kochi.`)

  const { processWhatsAppMessage } = require('../lib/whatsapp/state-machine')

  // Step 1: Send "Hi"
  console.log('\n--- Step 1: Send "Hi" ---')
  await processWhatsAppMessage({
    from: testPhone,
    text: 'Hi',
    messageId: `msg_${Date.now()}_1`,
  })

  // Step 2: Send "btn_order_fish"
  console.log('\n--- Step 2: Click "Order Fresh Fish" ---')
  await processWhatsAppMessage({
    from: testPhone,
    text: 'btn_order_fish',
    buttonId: 'btn_order_fish',
    messageId: `msg_${Date.now()}_2`,
  })

  // Step 3: Select Marine Drive Branch
  console.log('\n--- Step 3: Select "Marine Drive Branch" ---')
  await processWhatsAppMessage({
    from: testPhone,
    text: MARINE_DRIVE_ID,
    listId: MARINE_DRIVE_ID,
    messageId: `msg_${Date.now()}_3`,
  })

  // Step 4: Select Fish ("ayala")
  console.log('\n--- Step 4: Select Fish "ayala" ---')
  await processWhatsAppMessage({
    from: testPhone,
    text: 'ayala',
    messageId: `msg_${Date.now()}_4`,
  })

  // Step 5: Select Quantity "qty_1.0"
  console.log('\n--- Step 5: Select Quantity "1.0 kg" ---')
  await processWhatsAppMessage({
    from: testPhone,
    text: 'qty_1.0',
    buttonId: 'qty_1.0',
    messageId: `msg_${Date.now()}_5`,
  })

  // Step 6: Select Cutting Style "cut_curry"
  console.log('\n--- Step 6: Select Cutting Style "Curry Cut" ---')
  await processWhatsAppMessage({
    from: testPhone,
    text: 'cut_curry',
    buttonId: 'cut_curry',
    messageId: `msg_${Date.now()}_6`,
  })

  // Step 7: Click "btn_checkout"
  console.log('\n--- Step 7: Click "Proceed Checkout" ---')
  await processWhatsAppMessage({
    from: testPhone,
    text: 'btn_checkout',
    buttonId: 'btn_checkout',
    messageId: `msg_${Date.now()}_7`,
  })

  // Step 8: Send Address Text: "Flat 4B, Marine Drive, Kochi 682031"
  console.log('\n--- Step 8: Send Address "Flat 4B, Marine Drive, Kochi 682031" ---')
  const step8 = await processWhatsAppMessage({
    from: testPhone,
    text: 'Flat 4B, Marine Drive, Kochi 682031',
    messageId: `msg_${Date.now()}_8`,
  })
  console.log('Step 8 Summary Rendered:', (step8?.text || '').includes('ORDER CONFIRMATION SUMMARY'))

  // Step 9: Click "btn_confirm_order" -> Invokes create_order_atomic using service_role
  console.log('\n--- Step 9: Click "Confirm & Order" ---')
  const step9 = await processWhatsAppMessage({
    from: testPhone,
    text: 'btn_confirm_order',
    buttonId: 'btn_confirm_order',
    messageId: `msg_${Date.now()}_9`,
  })

  console.log('\nStep 9 Output (CONFIRMATION MESSAGE):')
  console.log(step9?.text)

  const isOrderPlaced = (step9?.text || '').includes('CONGRATULATIONS! ORDER PLACED!')

  // Verify inventory deduction for Marine Drive Branch & Fort Kochi Branch
  const { data: marineInv } = await supabase
    .from('inventory')
    .select('available_stock')
    .eq('product_id', ayala.id)
    .eq('branch_id', MARINE_DRIVE_ID)
    .eq('inventory_date', today)
    .single()

  const { data: fortInv } = await supabase
    .from('inventory')
    .select('available_stock')
    .eq('product_id', ayala.id)
    .eq('branch_id', FORT_KOCHI_ID)
    .eq('inventory_date', today)
    .single()

  console.log('\n--- INVENTORY DEDUCTION VERIFICATION ---')
  console.log('Marine Drive Available Stock:', marineInv?.available_stock, '(Expected: 49)')
  console.log('Fort Kochi Available Stock:', fortInv?.available_stock, '(Expected: 50)')

  const marineDeducted = Number(marineInv?.available_stock) === 49
  const fortUnchanged = Number(fortInv?.available_stock) === 50

  console.log('\n===========================================================')
  console.log('TEST RESULT:')
  console.log('Order Placed Successfully?', isOrderPlaced ? 'YES' : 'NO')
  console.log('Marine Drive Stock Deducted by 1kg?', marineDeducted ? 'YES' : 'NO')
  console.log('Fort Kochi Stock Unchanged?', fortUnchanged ? 'YES' : 'NO')
  console.log('OVERALL TEST:', (isOrderPlaced && marineDeducted && fortUnchanged) ? '🎉 PASS (100% SUCCESS!)' : '❌ FAIL')
  console.log('===========================================================')
}

testExactUserCheckoutFlow()
