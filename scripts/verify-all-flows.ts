import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testCheckoutAddressFlow() {
  console.log('===========================================================')
  console.log('TESTING WHATSAPP CHECKOUT & ADDRESS FLOW (EXACT USER SCENARIO)')
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
  )

  const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'
  const today = new Date().toISOString().split('T')[0]

  // Seed Ayala product in Fort Kochi inventory for today
  const { data: prods } = await supabase.from('products').select('*')
  const ayala = prods?.find((p: any) => p.name.toLowerCase().includes('ayala')) || prods?.[0]

  if (ayala) {
    await supabase.from('inventory').upsert([
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
    console.log(`Seeded inventory for ${ayala.name} at Fort Kochi Branch for ${today}`)
  }

  const { processWhatsAppMessage } = require('../lib/whatsapp/state-machine')
  const testPhone = '+919999999999'

  // Step 1: Send "Hi"
  console.log('\n--- Step 1: Send "Hi" ---')
  const step1 = await processWhatsAppMessage({
    from: testPhone,
    text: 'Hi',
    messageId: `msg_${Date.now()}_1`,
  })
  console.log('Step 1 Output:', step1?.text?.slice(0, 50))

  // Step 2: Send "btn_order_fish"
  console.log('\n--- Step 2: Click "Order Fresh Fish" ---')
  const step2 = await processWhatsAppMessage({
    from: testPhone,
    text: 'btn_order_fish',
    buttonId: 'btn_order_fish',
    messageId: `msg_${Date.now()}_2`,
  })
  console.log('Step 2 Output:', step2?.text?.slice(0, 50))

  // Step 3: Select Fort Kochi Branch
  console.log('\n--- Step 3: Select "Fort Kochi Branch" ---')
  const step3 = await processWhatsAppMessage({
    from: testPhone,
    text: FORT_KOCHI_ID,
    listId: FORT_KOCHI_ID,
    messageId: `msg_${Date.now()}_3`,
  })
  console.log('Step 3 Output:', step3?.text?.slice(0, 60))

  // Step 4: Select Fish ("ayala")
  console.log('\n--- Step 4: Select Fish "ayala" ---')
  const step4 = await processWhatsAppMessage({
    from: testPhone,
    text: 'ayala',
    messageId: `msg_${Date.now()}_4`,
  })
  console.log('Step 4 Output:', step4?.text?.slice(0, 60))

  // Step 5: Select Quantity "qty_1.0"
  console.log('\n--- Step 5: Select Quantity "1.0 kg" ---')
  const step5 = await processWhatsAppMessage({
    from: testPhone,
    text: 'qty_1.0',
    buttonId: 'qty_1.0',
    messageId: `msg_${Date.now()}_5`,
  })
  console.log('Step 5 Output:', step5?.text?.slice(0, 60))

  // Step 6: Select Cutting Style "cut_curry"
  console.log('\n--- Step 6: Select Cutting Style "Curry Cut" ---')
  const step6 = await processWhatsAppMessage({
    from: testPhone,
    text: 'cut_curry',
    buttonId: 'cut_curry',
    messageId: `msg_${Date.now()}_6`,
  })
  console.log('Step 6 Output:', step6?.text?.slice(0, 80))

  // Step 7: Click "btn_checkout"
  console.log('\n--- Step 7: Click "Proceed Checkout" ---')
  const step7 = await processWhatsAppMessage({
    from: testPhone,
    text: 'btn_checkout',
    buttonId: 'btn_checkout',
    messageId: `msg_${Date.now()}_7`,
  })
  console.log('Step 7 Output:', step7?.text?.slice(0, 80))

  // Step 8: Send Address Text: "Flat 4B, Marine Drive, Kochi 682031"
  console.log('\n--- Step 8: Send Address "Flat 4B, Marine Drive, Kochi 682031" ---')
  const step8 = await processWhatsAppMessage({
    from: testPhone,
    text: 'Flat 4B, Marine Drive, Kochi 682031',
    messageId: `msg_${Date.now()}_8`,
  })
  console.log('\nStep 8 Output (FULL RESPONSE):')
  console.log(step8?.text)

  const isWelcome = (step8?.text || '').includes('Welcome to Bestiet Fresh')
  const isSummary = (step8?.text || '').includes('ORDER CONFIRMATION SUMMARY')

  console.log('\n===========================================================')
  console.log('TEST RESULT:')
  console.log('Returned Welcome Menu?', isWelcome ? 'FAIL (INCORRECT)' : 'NO (CORRECT)')
  console.log('Returned Order Confirmation Summary?', isSummary ? 'SUCCESS (PASS!)' : 'FAIL')
  console.log('===========================================================')
}

testCheckoutAddressFlow()
