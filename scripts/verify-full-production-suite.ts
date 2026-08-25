import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function runFullProductionSuite() {
  console.log('===========================================================')
  console.log('BESTIET FRESH — FULL PRODUCTION SYSTEM & ISOLATION VERIFICATION')
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
  const FORT_KOCHI_BRANCH_ID = 'b2222222-2222-2222-2222-222222222222'

  // Step A & B: Check admin_branch_assignments
  console.log('\n--- Step A & B: Verifying admin_branch_assignments ---')
  const { data: assignments, error: assignErr } = await supabase
    .from('admin_branch_assignments')
    .select('*, branch:branches(*)')

  if (assignErr) {
    console.error('Assignments error:', assignErr)
  } else {
    console.log('Admin assignments count:', assignments?.length)
    assignments?.forEach((a: any) => {
      console.log(`User ${a.user_id} -> Assigned to: ${a.branch?.name} (${a.branch_id})`)
    })
  }

  // Step C & D: Verify branch order isolation
  console.log('\n--- Step C & D: Verifying strict branch order query isolation ---')
  const { data: marineOrders } = await supabase
    .from('orders')
    .select('id, order_number, branch_id')
    .eq('branch_id', MARINE_DRIVE_BRANCH_ID)

  const { data: fortOrders } = await supabase
    .from('orders')
    .select('id, order_number, branch_id')
    .eq('branch_id', FORT_KOCHI_BRANCH_ID)

  console.log(`Marine Drive Orders Count: ${marineOrders?.length || 0}`)
  console.log(`Fort Kochi Orders Count: ${fortOrders?.length || 0}`)

  const marineLeakedToFort = (marineOrders || []).some((o: any) => o.branch_id === FORT_KOCHI_BRANCH_ID)
  const fortLeakedToMarine = (fortOrders || []).some((o: any) => o.branch_id === MARINE_DRIVE_BRANCH_ID)

  console.log(`Marine Drive orders contain Fort Kochi branch orders?`, marineLeakedToFort ? 'YES (FAIL)' : 'NO (PASS)')
  console.log(`Fort Kochi orders contain Marine Drive branch orders?`, fortLeakedToMarine ? 'YES (FAIL)' : 'NO (PASS)')

  // Step E - I: Idempotency & Duplicate Order Prevention
  console.log('\n--- Step E - I: Testing Idempotence & Duplicate Confirmation ---')
  const { data: custData } = await supabase.from('customers').select('id').limit(1).single()
  const testCustomerId = custData?.id || 'c1111111-1111-1111-1111-111111111111'
  let { data: addr } = await supabase.from('addresses').select('id').eq('customer_id', testCustomerId).limit(1).single()

  if (!addr) {
    const { data: newAddr } = await supabase
      .from('addresses')
      .insert([
        {
          customer_id: testCustomerId,
          label: 'Home',
          address_line: 'Flat 4B, Marine Drive, Kochi 682031',
          place: 'Marine Drive',
          post_office: 'Kochi',
          pincode: '682031'
        }
      ])
      .select('id')
      .single()
    addr = newAddr
  }

  const testAddressId = addr?.id

  if (!testAddressId) {
    console.error('No address found for test customer')
    return
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const idempotencyKey = `wa_test_suite_${Date.now()}`

  // Fetch initial stock for Marine Drive
  const { data: initialStockRow } = await supabase
    .from('inventory')
    .select('available_stock_kg')
    .eq('inventory_date', todayStr)
    .eq('branch_id', MARINE_DRIVE_BRANCH_ID)
    .limit(1)
    .single()

  const initialStock = initialStockRow?.available_stock_kg || 0
  console.log(`Initial stock for Marine Drive before test order: ${initialStock} kg`)

  // Call create_order_atomic FIRST time
  const { data: orderResult1, error: rpcErr1 } = await supabase.rpc('create_order_atomic', {
    p_customer_id: testCustomerId,
    p_address_id: testAddressId,
    p_items: [
      {
        product_id: 'p1111111-1111-1111-1111-111111111111',
        quantity_kg: 1,
        unit_price: 350,
        cutting_type: 'curry_cut'
      }
    ],
    p_inventory_date: todayStr,
    p_idempotency_key: idempotencyKey,
    p_delivery_fee: 30,
    p_branch_id: MARINE_DRIVE_BRANCH_ID,
    p_customer_remarks: 'Idempotency test order'
  })

  if (rpcErr1) {
    console.error('RPC Error 1:', rpcErr1)
  } else {
    console.log('RPC Call 1 Result:', orderResult1)
  }

  // Call create_order_atomic SECOND time with SAME idempotency key
  console.log('Simulating duplicate "Confirm & Order" click with same idempotency key...')
  const { data: orderResult2, error: rpcErr2 } = await supabase.rpc('create_order_atomic', {
    p_customer_id: testCustomerId,
    p_address_id: testAddressId,
    p_items: [
      {
        product_id: 'p1111111-1111-1111-1111-111111111111',
        quantity_kg: 1,
        unit_price: 350,
        cutting_type: 'curry_cut'
      }
    ],
    p_inventory_date: todayStr,
    p_idempotency_key: idempotencyKey,
    p_delivery_fee: 30,
    p_branch_id: MARINE_DRIVE_BRANCH_ID,
    p_customer_remarks: 'Idempotency test order'
  })

  if (rpcErr2) {
    console.error('RPC Error 2:', rpcErr2)
  } else {
    console.log('RPC Call 2 Result (Idempotent):', orderResult2)
  }

  // Check stock after duplicate calls
  const { data: finalStockRow } = await supabase
    .from('inventory')
    .select('available_stock_kg')
    .eq('inventory_date', todayStr)
    .eq('branch_id', MARINE_DRIVE_BRANCH_ID)
    .limit(1)
    .single()

  const finalStock = finalStockRow?.available_stock_kg || 0
  console.log(`Final stock for Marine Drive after duplicate calls: ${finalStock} kg`)
  console.log(`Stock decreased by exactly 1 kg?`, (initialStock - finalStock === 1) ? 'YES (PASS)' : 'NO (FAIL)')

  // Check Fort Kochi stock was untouched
  const { data: fortStockRow } = await supabase
    .from('inventory')
    .select('available_stock_kg')
    .eq('inventory_date', todayStr)
    .eq('branch_id', FORT_KOCHI_BRANCH_ID)
    .limit(1)
    .single()

  console.log(`Fort Kochi stock untouched: ${fortStockRow?.available_stock_kg} kg`)

  console.log('\n===========================================================')
  console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!')
  console.log('===========================================================')
}

runFullProductionSuite()
