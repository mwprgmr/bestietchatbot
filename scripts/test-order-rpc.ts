import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testRpc() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const parts = line.split('=')
      if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        if (key && val) {
          process.env[key] = val
        }
      }
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. Get or create test customer
  const { data: customer } = await supabase
    .from('customers')
    .upsert([{ phone: '919999999999', name: 'Test Customer' }], { onConflict: 'phone' })
    .select()
    .single()

  console.log('Test Customer:', customer?.id)

  // 2. Get test address
  const { data: address } = await supabase
    .from('addresses')
    .insert([{
      customer_id: customer.id,
      label: 'Home',
      address_line: 'Flat 4B, Marine Drive, Kochi 682031',
      pincode: '682031'
    }])
    .select()
    .single()

  console.log('Test Address:', address?.id)

  // 3. Get fish product from inventory for Manvila Kazhakkoottam
  const branchId = 'b1111111-1111-1111-1111-111111111111'
  const { data: inv } = await supabase
    .from('inventory')
    .select('*')
    .eq('branch_id', branchId)
    .gt('available_stock', 0)
    .limit(1)
    .single()

  console.log('Test Inventory Item:', inv?.id, inv?.product_id)

  const items = [
    {
      product_id: inv.product_id,
      quantity_kg: 1,
      cutting_type: 'curry_cut',
      unit_price: inv.price_per_kg,
      subtotal: inv.price_per_kg
    }
  ]

  const today = new Date().toISOString().split('T')[0]

  console.log('\nTesting create_order_atomic RPC with PostgreSQL parameter signature...')
  const { data: orderData, error: orderErr } = await supabase.rpc('create_order_atomic', {
    p_customer_id: customer.id,
    p_branch_id: branchId,
    p_address_id: address.id,
    p_items: items,
    p_customer_remarks: 'None',
    p_delivery_fee: 30,
    p_idempotency_key: `test-idem-${Date.now()}`,
    p_inventory_date: today
  })

  if (orderErr) {
    console.error('❌ create_order_atomic ERROR:', orderErr)
  } else {
    console.log('🎉 create_order_atomic SUCCESS:', orderData)

    const orderId = orderData.order_id || orderData.id || (typeof orderData === 'string' ? orderData : null) || orderData?.o_order_id
    console.log('\nTesting cancel_order_atomic RPC for order:', orderId)
    const { data: cancelData, error: cancelErr } = await supabase.rpc('cancel_order_atomic', {
      p_order_id: orderId,
      p_reason: 'Automated RPC Test Cancellation'
    })

    if (cancelErr) {
      console.error('❌ cancel_order_atomic ERROR:', cancelErr)
    } else {
      console.log('🎉 cancel_order_atomic SUCCESS:', cancelData)
    }
  }
}

testRpc()
