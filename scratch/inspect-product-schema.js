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

async function inspectColumns() {
  console.log('--- PRODUCTS SAMPLE ROWS ---');
  const { data: prods } = await supabase.from('products').select('*').limit(5);
  console.log(prods);

  console.log('\n--- ORDER_ITEMS SAMPLE ROWS ---');
  const { data: items } = await supabase.from('order_items').select('*').limit(5);
  console.log(items);

  console.log('\n--- ORDERS SAMPLE ROWS ---');
  const { data: ords } = await supabase.from('orders').select('*').limit(5);
  console.log(ords);
}

inspectColumns();
