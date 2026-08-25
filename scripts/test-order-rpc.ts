import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testFinalOrderPermission() {
  console.log('===========================================================')
  console.log('VERIFYING CREATE_ORDER_ATOMIC PERMISSION WITH SERVICE ROLE')
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

  const FORT_KOCHI_ID = 'b2222222-2222-2222-2222-222222222222'
  const today = new Date().toISOString().split('T')[0]

  // 1. Get Product
  const { data: prods } = await supabase.from('products').select('*').limit(1)
  const product = prods?.[0]

  // 2. Get Customer
  const { data: custs } = await supabase.from('customers').select('*').limit(1)
  const customer = custs?.[0]

  // 3. Ensure Inventory
  await supabase.from('inventory').upsert([
    {
      product_id: product.id,
      branch_id: FORT_KOCHI_ID,
      inventory_date: today,
      price_per_kg: 220,
      opening_stock: 50,
      available_stock: 50,
      low_stock_threshold: 2,
    },
  ])

  // 4. Create address using SECURITY DEFINER helper RPC
  const { data: addrJson, error: addrErr } = await supabase.rpc('upsert_address_sec', {
    p_customer_id: customer.id,
    p_address_line1: 'Flat 4B, Marine Drive, Kochi 682031',
    p_title: 'Home',
    p_city: 'Kochi',
    p_pincode: '682031',
  })

  console.log('upsert_address_sec output:', addrJson, addrErr)
  const addressId = addrJson?.id || null

  console.log('Parameters:')
  console.log('- Customer ID:', customer.id)
  console.log('- Address ID:', addressId)
  console.log('- Branch ID:', FORT_KOCHI_ID)

  // 5. Invoke create_order_atomic RPC
  const items = [
    {
      product_id: product.id,
      product_name: product.name,
      quantity_kg: 1.0,
      quantity: 1.0,
      unit_price: 220,
      cutting_type: 'curry_cut',
      subtotal: 220,
    },
  ]

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_order_atomic', {
    p_customer_id: customer.id,
    p_address_id: addressId,
    p_items: items,
    p_inventory_date: today,
    p_idempotency_key: `perm_test_${Date.now()}`,
    p_delivery_fee: 30.0,
    p_branch_id: FORT_KOCHI_ID,
    p_customer_remarks: 'Permission fix test',
  })

  console.log('\nRPC Result:')
  console.log('Data:', rpcRes)
  console.log('Error:', rpcErr)

  if (rpcRes?.success && !rpcErr) {
    console.log('\n🎉 SUCCESS: Order created atomically with zero permission errors!')
  } else {
    console.error('\n❌ FAILED:', rpcErr || rpcRes)
  }
}

testFinalOrderPermission()
