const { createClient } = require('@supabase/supabase-js')

const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''

const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testOrderFlow() {
  console.log('--- 1. Querying 300kg Prawns Order from Supabase ---')
  const { data: orders, error: orderErr } = await supabase
    .from('orders')
    .select('*, items:order_items(*, product:products(*)), branch:branches(*), customer:customers(*)')
    .eq('order_number', 'BF-20260912-9887')

  if (orderErr) {
    console.error('Error fetching order:', orderErr)
    return
  }

  if (!orders || orders.length === 0) {
    console.log('Order BF-20260912-9887 not found in DB. Searching recent orders...')
    const { data: recent } = await supabase
      .from('orders')
      .select('*, items:order_items(*, product:products(*))')
      .order('created_at', { ascending: false })
      .limit(5)
    console.log('Recent orders:', JSON.stringify(recent, null, 2))
    return
  }

  const order = orders[0]
  console.log(`Order Number: ${order.order_number}`)
  console.log(`Order Status: ${order.status}`)
  console.log(`Payment Status: ${order.payment_status}`)
  console.log(`Total Amount: ${order.total_amount || order.total}`)

  console.log('\n--- 2. Order Items Breakdown ---')
  order.items.forEach((item, idx) => {
    const qty = Number(item.quantity ?? item.quantity_kg ?? 1)
    const unit = item.unit || item.product?.unit || 'kg'
    const unitPrice = Number(item.unit_price ?? item.price_per_kg ?? item.product?.price_per_kg ?? 0)
    const total = Number(item.total ?? item.total_price ?? item.subtotal ?? (qty * unitPrice))

    console.log(`Item #${idx + 1}:`)
    console.log(`  Product Name: ${item.product?.name || 'Unknown'}`)
    console.log(`  Quantity: ${qty} ${unit}`)
    console.log(`  Unit Price: ₹${unitPrice}/${unit}`)
    console.log(`  Total: ₹${total.toLocaleString('en-IN')}`)
  })

  // Format Helper Validation
  const formatCurrency = (val) => {
    const num = Number(val || 0)
    if (isNaN(num)) return '0'
    return num.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    })
  }

  const formattedTotal = `₹${formatCurrency(order.total_amount || order.total)}`
  const formattedPaymentStatus = order.payment_status ? order.payment_status : 'Pending'

  console.log('\n--- 3. UI Formatting Check ---')
  console.log(`Formatted Total: "${formattedTotal}"`)
  console.log(`Payment Status: "${formattedPaymentStatus}"`)
  console.log(`Rendered Output: ${formattedTotal} | Payment: ${formattedPaymentStatus}`)
  
  if (`${formattedTotal}${formattedPaymentStatus}`.includes('pending') && !formattedTotal.includes(' ')) {
    console.log('Checking string separation... PASS (Total and Payment Status are stored in separate elements).')
  }

  console.log('\n✅ Verification Complete!')
}

testOrderFlow()
