import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function inspectDb() {
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

  console.log('=== 1. BRANCHES ===')
  const { data: branches } = await supabase.from('branches').select('*')
  console.log(branches)

  console.log('\n=== 2. ALL INVENTORY RECORDS ===')
  const { data: inv } = await supabase.from('inventory').select('*, product:products(*)').order('branch_id')
  console.log(inv?.map(i => ({
    id: i.id,
    branch_id: i.branch_id,
    inventory_date: i.inventory_date || i.date || i.created_at,
    product_name: i.product?.name,
    product_id: i.product_id,
    available_stock: i.available_stock,
    price_per_kg: i.price_per_kg,
    created_at: i.created_at
  })))

  console.log('\n=== 3. ALL PRODUCTS ===')
  const { data: prods } = await supabase.from('products').select('*')
  console.log(prods)

  console.log('\n=== 4. TEST CANCEL_ORDER_ATOMIC RPC ===')
  const { data: cancelTest, error: cancelErr } = await supabase.rpc('cancel_order_atomic', { p_order_id: '00000000-0000-0000-0000-000000000000', p_reason: 'test' })
  console.log('cancel_order_atomic result:', { data: cancelTest, error: cancelErr?.message })

  console.log('\n=== 5. TEST CREATE_ORDER_ATOMIC RPC ===')
  const { data: createTest, error: createErr } = await supabase.rpc('create_order_atomic', {
    p_customer_id: '00000000-0000-0000-0000-000000000000',
    p_branch_id: 'b1111111-1111-1111-1111-111111111111',
    p_address_id: '00000000-0000-0000-0000-000000000000',
    p_items: [],
    p_payment_method: 'cod'
  })
  console.log('create_order_atomic result:', { data: createTest, error: createErr?.message })
}

inspectDb()
