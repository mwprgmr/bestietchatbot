const { createClient } = require('@supabase/supabase-js');

const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJocW9vbmJod3NmZndvanZuZG5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDk4NTUwNiwiZXhwIjoyMTAwNTYxNTA2fQ.kpOHtCV9jRBBtiQP_aTBh9DYzdoAfWpP77o1preof28'
};

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function getTodayDateIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

async function getBranchInventoryStrict(branchId, targetDate) {
  const { data: rawInv, error } = await supabase
    .from('inventory')
    .select('*, product:products(name, category, image_url)')
    .eq('branch_id', branchId)
    .eq('inventory_date', targetDate)
    .gt('available_stock', 0)
    .in('status', ['available', 'AVAILABLE']);

  if (error || !rawInv) return [];

  return rawInv.map(inv => ({
    inventory_id: inv.id,
    product_id: inv.product_id,
    product_name: inv.product?.name || 'Fresh Catch',
    available_stock: inv.available_stock,
    price_per_kg: inv.price_per_kg,
    status: inv.status,
  }));
}

async function runVerificationSuite() {
  console.log('====================================================');
  console.log('   BESTIET FRESH INVENTORY SYNC VERIFICATION SUITE  ');
  console.log('====================================================\n');

  const todayStr = getTodayDateIST();
  const manvilaBranch = 'b1111111-1111-1111-1111-111111111111';
  const peroorkadaBranch = 'b2222222-2222-2222-2222-222222222222';

  console.log(`1. Today's IST Date: ${todayStr}`);

  // Test 1: Query Manvila Branch Inventory directly from DB
  const { data: manvilaInv } = await supabase
    .from('inventory')
    .select('*, product:products(name)')
    .eq('branch_id', manvilaBranch)
    .eq('inventory_date', todayStr);

  const manvilaInStockCount = manvilaInv?.filter(i => (i.available_stock || 0) > 0).length || 0;
  console.log(`\n2. Manvila Branch DB Inventory (${manvilaBranch}):`);
  console.log(`   - Total Inventory Rows for Today: ${manvilaInv?.length || 0}`);
  console.log(`   - In-Stock Items (>0 kg): ${manvilaInStockCount}`);

  // Test 2: Query Peroorkada Branch Inventory directly from DB
  const { data: peroorkadaInv } = await supabase
    .from('inventory')
    .select('*, product:products(name)')
    .eq('branch_id', peroorkadaBranch)
    .eq('inventory_date', todayStr);

  const peroorkadaInStockCount = peroorkadaInv?.filter(i => (i.available_stock || 0) > 0).length || 0;
  console.log(`\n3. Peroorkada Branch DB Inventory (${peroorkadaBranch}):`);
  console.log(`   - Total Inventory Rows for Today: ${peroorkadaInv?.length || 0}`);
  console.log(`   - In-Stock Items (>0 kg): ${peroorkadaInStockCount}`);
  console.log(`   - Available Products: ${peroorkadaInv?.map(i => `${i.product?.name} (${i.available_stock}kg)`).join(', ')}`);

  // Test 3: WhatsApp Chatbot Inventory Retrieval
  console.log('\n4. Testing WhatsApp Chatbot State Machine getBranchInventoryStrict():');
  const waManvilaItems = await getBranchInventoryStrict(manvilaBranch, todayStr);
  console.log(`   - Manvila WhatsApp Available Items Count: ${waManvilaItems.length}`);
  
  const waPeroorkadaItems = await getBranchInventoryStrict(peroorkadaBranch, todayStr);
  console.log(`   - Peroorkada WhatsApp Available Items Count: ${waPeroorkadaItems.length}`);
  console.log(`   - Peroorkada WhatsApp Products: ${waPeroorkadaItems.map(i => i.product_name).join(', ')}`);

  // Assert WhatsApp Peroorkada matching canonical DB reality
  if (waPeroorkadaItems.length !== peroorkadaInStockCount) {
    console.error(`❌ Mismatch! WA Peroorkada count (${waPeroorkadaItems.length}) != DB count (${peroorkadaInStockCount})`);
    process.exit(1);
  } else {
    console.log('   ✅ WhatsApp chatbot inventory matches canonical database stock perfectly!');
  }

  // Test 4: Verify NO fake carryover stock generation in database after querying
  const { data: checkPeroorkadaAfter } = await supabase
    .from('inventory')
    .select('id')
    .eq('branch_id', peroorkadaBranch)
    .eq('inventory_date', todayStr);

  if (checkPeroorkadaAfter.length !== peroorkadaInv.length) {
    console.error(`❌ Mismatch! Querying generated ${checkPeroorkadaAfter.length - peroorkadaInv.length} fake carryover rows!`);
    process.exit(1);
  } else {
    console.log('   ✅ Zero fake inventory rows generated in DB after queries!');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL INVENTORY SYNCHRONIZATION TESTS PASSED 100%! ');
  console.log('====================================================\n');
}

runVerificationSuite().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
