import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { processWhatsAppMessage } from '../lib/whatsapp/state-machine'

async function testSavedAddressSelection() {
  console.log('===========================================================')
  console.log('TESTING SAVED ADDRESS SELECTION IN WHATSAPP CHATBOT')
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

  const testPhone = '919999999999'

  // 1. Get or create customer and a saved address
  const { data: customer } = await supabase
    .from('customers')
    .upsert({ phone: testPhone, name: 'Test Address Customer' }, { onConflict: 'phone' })
    .select('id')
    .single()

  if (!customer?.id) {
    console.error('Failed to create test customer')
    return
  }

  // Insert a saved address for this customer
  const { data: address } = await supabase
    .from('addresses')
    .insert([
      {
        customer_id: customer.id,
        label: 'Address',
        address_line: 'Rose family mathira po kadakkal kollam 691536, Kochi 691536',
        pincode: '691536',
        is_default: true,
      },
    ])
    .select('id, address_line')
    .single()

  const savedAddressId = address?.id
  console.log(`Created saved address ID: ${savedAddressId}`)

  // 2. Set active chat session in SELECTING_ADDRESS state with items in cart
  const { data: session } = await supabase
    .from('chat_sessions')
    .upsert(
      {
        phone_number: testPhone,
        customer_id: customer.id,
        state: 'SELECTING_ADDRESS',
        selected_branch_id: 'b1111111-1111-1111-1111-111111111111',
        cart: [
          {
            product_id: 'p1111111-1111-1111-1111-111111111111',
            product_name: 'Ayala',
            quantity_kg: 1.0,
            unit_price: 350,
            cutting_type: 'whole',
            subtotal: 350,
          },
        ],
      },
      { onConflict: 'phone_number' }
    )
    .select('id')
    .single()

  console.log('Session set up in SELECTING_ADDRESS state.')

  // 3. Test Case A: User sends the savedAddressId (WhatsApp list selection payload)
  console.log('\n--- Test Case A: Simulating List Item Click with Address UUID ---')
  const resA: any = await processWhatsAppMessage({
    from: testPhone,
    messageId: 'msg_test_a',
    type: 'list_reply',
    text: savedAddressId,
    listId: savedAddressId,
  })

  const textA = typeof resA === 'string' ? resA : JSON.stringify(resA)
  console.log('Bot Response A:\n', textA)

  const isSuccessA = textA.includes('ORDER CONFIRMATION SUMMARY') && !textA.includes('Please include your 6-digit pincode')
  console.log('Test Case A Result:', isSuccessA ? '🎉 PASS (Order summary displayed without error!)' : '❌ FAIL')

  // Reset session state for Test Case B
  await supabase
    .from('chat_sessions')
    .update({ state: 'SELECTING_ADDRESS', selected_address_id: null })
    .eq('id', session?.id)

  // 4. Test Case B: User sends quoted text "Address\nRose family mathira..."
  console.log('\n--- Test Case B: Simulating Quoted Text Response "Address\\nRose family..." ---')
  const resB: any = await processWhatsAppMessage({
    from: testPhone,
    messageId: 'msg_test_b',
    type: 'text',
    text: 'Address\nRose family mathira po kadakkal kollam 691536, Kochi 691536',
  })

  const textB = typeof resB === 'string' ? resB : JSON.stringify(resB)
  console.log('Bot Response B:\n', textB)

  const isSuccessB = textB.includes('ORDER CONFIRMATION SUMMARY') && !textB.includes('Please include your 6-digit pincode')
  console.log('Test Case B Result:', isSuccessB ? '🎉 PASS (Order summary displayed without error!)' : '❌ FAIL')

  console.log('\n===========================================================')
  console.log('OVERALL SAVED ADDRESS TEST RESULT:', (isSuccessA && isSuccessB) ? '🎉 PASS (ALL FIXED!)' : '❌ FAIL')
  console.log('===========================================================')
}

testSavedAddressSelection()
