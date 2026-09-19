const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testStockDecreaseReflection() {
  console.log('--- RUNNING STOCK DECREASE REFLECTION TEST ---');

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const branchId = 'b1111111-1111-1111-1111-111111111111'; // Marine Drive

  // 1. Fetch Kilimeen product ID
  const { data: products } = await supabase.from('products').select('id, name').ilike('name', '%kilimeen%');
  if (!products || products.length === 0) {
    console.error('❌ Kilimeen product not found');
    process.exit(1);
  }
  const kilimeenId = products[0].id;

  // Helper to query storefront mapped stock logic
  async function getStorefrontStock() {
    const { data: rawProducts } = await supabase.from('products').select('*').eq('id', kilimeenId);
    const { data: rawInventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('branch_id', branchId)
      .lte('inventory_date', todayStr)
      .order('inventory_date', { ascending: false });

    const p = rawProducts[0];
    const todayInv = (rawInventory || []).find(i => i.product_id === p.id && i.inventory_date === todayStr);
    const fallbackInv = (rawInventory || []).find(i => i.product_id === p.id);
    const invMatch = todayInv || fallbackInv;

    return invMatch && invMatch.available_stock !== undefined && invMatch.available_stock !== null
      ? Math.max(0, Number(invMatch.available_stock))
      : 0;
  }

  // STEP 1: Set Kilimeen initial stock to 100kg for today
  await supabase.from('inventory').upsert({
    branch_id: branchId,
    product_id: kilimeenId,
    inventory_date: todayStr,
    opening_stock: 100,
    available_stock: 100,
    sold_stock: 0,
    damaged_stock: 0,
    price_per_kg: 340,
    status: 'AVAILABLE',
    updated_at: new Date().toISOString()
  }, { onConflict: 'branch_id,product_id,inventory_date' });

  const stock1 = await getStorefrontStock();
  console.log(`Step 1: Admin set stock to 100kg -> Storefront stock = ${stock1}kg`);
  if (stock1 !== 100) {
    console.error(`❌ Expected 100kg, got ${stock1}kg`);
    process.exit(1);
  }

  // STEP 2: Admin decreases stock by 80kg (100 -> 20kg)
  const { data: invRow } = await supabase.from('inventory').select('id').eq('product_id', kilimeenId).eq('inventory_date', todayStr).eq('branch_id', branchId).single();

  const { error: adjErr1 } = await supabase.from('inventory').update({
    available_stock: 20,
    damaged_stock: 80,
    status: 'AVAILABLE',
    updated_at: new Date().toISOString()
  }).eq('id', invRow.id);

  if (adjErr1) {
    console.error('❌ Update stock error:', adjErr1.message);
    process.exit(1);
  }

  const stock2 = await getStorefrontStock();
  console.log(`Step 2: Admin decreased stock by 80kg (100 -> 20) -> Storefront stock = ${stock2}kg`);
  if (stock2 !== 20) {
    console.error(`❌ Expected 20kg, got ${stock2}kg`);
    process.exit(1);
  }
  console.log('✅ Storefront correctly reflects decreased stock (20kg)!');

  // STEP 3: Admin decreases stock to 0kg (20 -> 0kg)
  const { error: adjErr2 } = await supabase.from('inventory').update({
    available_stock: 0,
    damaged_stock: 100,
    status: 'out_of_stock',
    updated_at: new Date().toISOString()
  }).eq('id', invRow.id);

  if (adjErr2) {
    console.error('❌ Update stock error:', adjErr2.message);
    process.exit(1);
  }

  const stock3 = await getStorefrontStock();
  console.log(`Step 3: Admin decreased stock to 0kg -> Storefront stock = ${stock3}kg`);
  if (stock3 !== 0) {
    console.error(`❌ Expected 0kg, got ${stock3}kg`);
    process.exit(1);
  }
  console.log('✅ Storefront correctly reflects 0kg stock (Out of Stock)!');

  // STEP 4: Restore Kilimeen stock to 150kg for today
  await supabase.from('inventory').update({
    opening_stock: 150,
    available_stock: 150,
    sold_stock: 0,
    damaged_stock: 0,
    status: 'AVAILABLE',
    updated_at: new Date().toISOString()
  }).eq('id', invRow.id);

  console.log('✅ Restored Kilimeen stock to 150kg available for today.');
  console.log('🎉 LIVE STOCK DECREASE REFLECTION TEST PASSED SUCCESSFULLY!');
}

testStockDecreaseReflection();
