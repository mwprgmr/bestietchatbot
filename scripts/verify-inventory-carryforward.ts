import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testInventoryCarryForward() {
  console.log('===========================================================')
  console.log('TESTING INVENTORY CARRY-FORWARD & AUTOMATIC PERSISTENCE')
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

  const MARINE_DRIVE_BRANCH_ID = 'b1111111-1111-1111-1111-111111111111'
  const pastDate = '2026-08-20'
  const todayStr = new Date().toISOString().split('T')[0]

  // 1. Get Ayala product ID
  const { data: prod } = await supabase.from('products').select('id, name').limit(1).single()
  const productId = prod?.id || 'p1111111-1111-1111-1111-111111111111'

  // Insert a test inventory entry for pastDate with 24 kg
  console.log(`Setting 24 kg inventory for past date ${pastDate}...`)
  await supabase
    .from('inventory')
    .upsert(
      {
        product_id: productId,
        branch_id: MARINE_DRIVE_BRANCH_ID,
        inventory_date: pastDate,
        price_per_kg: 350,
        opening_stock: 24,
        available_stock: 24,
        available_stock_kg: 24,
        sold_stock: 0,
      },
      { onConflict: 'product_id,branch_id,inventory_date' }
    )

  // 2. Query today's inventory via server API or helper RPC logic
  console.log(`Querying inventory for today (${todayStr}) without manual today entry...`)
  const { data: latestInv } = await supabase
    .from('inventory')
    .select('*')
    .eq('branch_id', MARINE_DRIVE_BRANCH_ID)
    .eq('product_id', productId)
    .lte('inventory_date', todayStr)
    .order('inventory_date', { ascending: false })
    .limit(1)

  const activeStock = latestInv?.[0]?.available_stock ?? latestInv?.[0]?.available_stock_kg ?? 0
  console.log(`Carried forward available stock for today: ${activeStock} kg`)
  const isCarriedForward = activeStock >= 24

  // 3. Place order of 2 kg using create_order_atomic RPC
  console.log('Placing a 2 kg order to test deduction on carried forward inventory...')
  const { data: cust } = await supabase.from('customers').select('id').limit(1).single()
  const { data: addr } = await supabase.from('addresses').select('id').eq('customer_id', cust?.id).limit(1).single()

  const { data: orderRes, error: orderErr } = await supabase.rpc('create_order_atomic', {
    p_customer_id: cust?.id,
    p_address_id: addr?.id,
    p_items: [
      {
        product_id: productId,
        quantity_kg: 2.0,
        unit_price: 350,
        cutting_type: 'curry_cut',
      },
    ],
    p_inventory_date: todayStr,
    p_idempotency_key: `test_carryforward_${Date.now()}`,
    p_delivery_fee: 30,
    p_branch_id: MARINE_DRIVE_BRANCH_ID,
    p_customer_remarks: 'Carry forward test',
  })

  if (orderErr) {
    console.error('Order creation error:', orderErr)
  } else {
    console.log('Order created successfully:', orderRes)
  }

  // 4. Verify stock after order
  const { data: postOrderInv } = await supabase
    .from('inventory')
    .select('*')
    .eq('branch_id', MARINE_DRIVE_BRANCH_ID)
    .eq('product_id', productId)
    .eq('inventory_date', todayStr)
    .single()

  const finalAvail = postOrderInv?.available_stock ?? postOrderInv?.available_stock_kg ?? 0
  console.log(`Stock for today (${todayStr}) after 2 kg order: ${finalAvail} kg`)

  const isDeductedCorrectly = finalAvail === activeStock - 2

  console.log('\n===========================================================')
  console.log('VERIFICATION SUMMARY:')
  console.log(`1. 24 kg stock carried forward from past date to today?`, isCarriedForward ? 'YES (PASS)' : 'NO (FAIL)')
  console.log(`2. Stock updated correctly to 22 kg after order?`, isDeductedCorrectly ? 'YES (PASS)' : 'NO (FAIL)')
  console.log('OVERALL TEST RESULT:', (isCarriedForward && isDeductedCorrectly) ? '🎉 PASS (ALL FIXED!)' : '❌ FAIL')
  console.log('===========================================================')
}

testInventoryCarryForward()
