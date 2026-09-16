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

async function findAndFixNegativeStock() {
  console.log('Finding negative stock inventory rows...');
  const { data, error } = await supabase
    .from('inventory')
    .select('*, product:products(name), branch:branches(name)')
    .lt('available_stock', 0);

  if (error) {
    console.error('Error fetching inventory:', error);
    return;
  }

  console.log('Found negative stock rows:', data);

  if (data && data.length > 0) {
    for (const row of data) {
      console.log(`Fixing row ${row.id} for product ${row.product?.name} (Branch: ${row.branch?.name}). Setting available_stock = 0`);
      const { error: fixErr } = await supabase
        .from('inventory')
        .update({ available_stock: 0, status: 'OUT_OF_STOCK', updated_at: new Date().toISOString() })
        .eq('id', row.id);

      if (fixErr) console.error('Fix error:', fixErr);
      else console.log(`Fixed row ${row.id} successfully!`);
    }
  }
}

findAndFixNegativeStock();
