const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testCustomerPhone() {
  console.log('--- 1. Querying orders for BF-20260914-8819 ---')
  const { data: orderData, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_number, customer_id, customer_phone, branch_id, status, subtotal, delivery_charge, total, payment_status, payment_method, delivery_address, customer_remarks, business_date, created_at, updated_at')
    .eq('order_number', 'BF-20260914-8819')

  console.log('Order BF-20260914-8819:', orderData, orderErr)

  console.log('--- 2. Querying recent orders with customer_phone ---')
  const { data: recentOrders, error: recentErr } = await supabase
    .from('orders')
    .select('id, order_number, customer_id, customer_phone, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('Recent Orders:', recentOrders, recentErr)
}

testCustomerPhone()
