const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      process.env[key] = val;
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSchemaAndOrders() {
  console.log('--- INSPECTING ORDERS & ORDER_ITEMS IN SUPABASE ---');

  // Fetch recent orders with items and product details
  const { data: orders, error: ordErr } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      branch:branches(*),
      items:order_items(*, product:products(*))
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  if (ordErr) {
    console.error('Error fetching orders:', ordErr);
    return;
  }

  console.log(`Fetched ${orders.length} recent orders.`);

  orders.forEach((ord) => {
    console.log(`\n========================================`);
    console.log(`Order ID: ${ord.id} | Number: ${ord.order_number}`);
    console.log(`Date: ${ord.business_date || ord.created_at} | Branch: ${ord.branch?.name}`);
    console.log(`Total: ₹${ord.total_amount || ord.total} | Status: ${ord.status} | Payment: ${ord.payment_status}`);
    console.log(`Customer: ${ord.customer?.name} (${ord.customer?.phone})`);
    console.log(`Items count: ${ord.items ? ord.items.length : 0}`);

    if (ord.items && ord.items.length > 0) {
      ord.items.forEach((item, idx) => {
        console.log(`  Item #${idx + 1}:`);
        console.log(`    Item ID: ${item.id}`);
        console.log(`    Product Name: ${item.product?.name}`);
        console.log(`    Product unit/unit_type: ${item.product?.unit || item.product?.unit_type || 'N/A'}`);
        console.log(`    Product package_size: ${item.product?.package_size || 'N/A'}`);
        console.log(`    item.quantity_kg: ${item.quantity_kg}`);
        console.log(`    item.quantity: ${item.quantity}`);
        console.log(`    item.unit_price: ${item.unit_price}`);
        console.log(`    item.subtotal: ${item.subtotal}`);
        console.log(`    item.cutting_type: ${item.cutting_type}`);
      });
    }
  });
}

inspectSchemaAndOrders();
