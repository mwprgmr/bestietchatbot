import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testAdminBranchOrderAccess() {
  console.log('===========================================================')
  console.log('TESTING ADMIN BRANCH ORDER ACCESS & TARGET ORDER BF-20260825-6583')
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
  const TARGET_ORDER_NUM = 'BF-20260825-6583'

  // 1. Verify admin_branch_assignments in database
  console.log('\n--- Step 1: Checking admin_branch_assignments ---')
  const { data: assignments, error: assignErr } = await supabase
    .from('admin_branch_assignments')
    .select('*, branch:branches(*)')

  if (assignErr) {
    console.error('Error fetching admin_branch_assignments:', assignErr)
  } else {
    console.log('Assignments:', assignments)
  }

  // 2. Query Orders for Marine Drive Admin Branch
  console.log('\n--- Step 2: Querying Orders for Marine Drive Branch Admin ---')
  const { data: marineOrders, error: marineErr } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      address:addresses(*),
      branch:branches(*),
      items:order_items(*, product:products(*))
    `)
    .eq('branch_id', MARINE_DRIVE_BRANCH_ID)
    .order('created_at', { ascending: false })

  if (marineErr) {
    console.error('Marine Drive Orders Error:', marineErr)
  }

  const targetMarineOrder = (marineOrders || []).find((o: any) => o.order_number === TARGET_ORDER_NUM)
  console.log(`Marine Drive Orders Count: ${marineOrders?.length || 0}`)
  console.log(`Target Order ${TARGET_ORDER_NUM} Found in Marine Drive?`, !!targetMarineOrder)
  if (targetMarineOrder) {
    console.log('Order Details:')
    console.log(`- Order Number: ${targetMarineOrder.order_number}`)
    console.log(`- Branch Name: ${targetMarineOrder.branch?.name || 'Marine Drive Branch'}`)
    console.log(`- Status: ${targetMarineOrder.status}`)
    console.log(`- Total Amount: ₹${targetMarineOrder.total_amount || targetMarineOrder.total}`)
    console.log(`- Items Count: ${targetMarineOrder.items?.length || 0}`)
  }

  // 3. Query Orders for Fort Kochi Admin Branch
  console.log('\n--- Step 3: Querying Orders for Fort Kochi Branch Admin ---')
  const { data: fortOrders, error: fortErr } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      address:addresses(*),
      branch:branches(*),
      items:order_items(*, product:products(*))
    `)
    .eq('branch_id', FORT_KOCHI_BRANCH_ID)
    .order('created_at', { ascending: false })

  if (fortErr) {
    console.error('Fort Kochi Orders Error:', fortErr)
  }

  const targetFortOrder = (fortOrders || []).find((o: any) => o.order_number === TARGET_ORDER_NUM)
  console.log(`Fort Kochi Orders Count: ${fortOrders?.length || 0}`)
  console.log(`Target Order ${TARGET_ORDER_NUM} Hidden from Fort Kochi?`, !targetFortOrder)

  const isMarineVisible = !!targetMarineOrder
  const isFortHidden = !targetFortOrder
  const isCorrectAmount = targetMarineOrder?.total_amount === 3308 || targetMarineOrder?.total === 3308

  console.log('\n===========================================================')
  console.log('VERIFICATION SUMMARY:')
  console.log(`1. Target Order ${TARGET_ORDER_NUM} Visible to Marine Drive Admin?`, isMarineVisible ? 'YES' : 'NO')
  console.log(`2. Target Order ${TARGET_ORDER_NUM} Hidden from Fort Kochi Admin?`, isFortHidden ? 'YES' : 'NO')
  console.log(`3. Total Amount matches ₹3308?`, isCorrectAmount ? 'YES' : 'NO')
  console.log('OVERALL TEST RESULT:', (isMarineVisible && isFortHidden && isCorrectAmount) ? '🎉 PASS (SUCCESS!)' : '❌ FAIL')
  console.log('===========================================================')
}

testAdminBranchOrderAccess()
