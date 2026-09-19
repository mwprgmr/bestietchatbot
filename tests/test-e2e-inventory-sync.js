const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testE2EInventorySync() {
  console.log('--- RUNNING E2E INVENTORY SYNC & STOCK DEDUCTION TEST ---');

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const branchId = 'b1111111-1111-1111-1111-111111111111'; // Marine Drive

  // 1. Fetch Kilimeen product
  const { data: products } = await supabase.from('products').select('*').ilike('name', '%kilimeen%');
  if (!products || products.length === 0) {
    console.error('❌ Kilimeen product not found!');
    process.exit(1);
  }
  const kilimeen = products[0];
  console.log(`✅ Found Kilimeen product ID: ${kilimeen.id}`);

  // 2. Set test inventory for Kilimeen today = 50kg
  const { error: upsertErr } = await supabase.from('inventory').upsert(
    {
      branch_id: branchId,
      product_id: kilimeen.id,
      inventory_date: todayStr,
      opening_stock: 50,
      available_stock: 50,
      sold_stock: 0,
      damaged_stock: 0,
      price_per_kg: 340,
      status: 'AVAILABLE',
      updated_at: new Date().toISOString()
    },
    { onConflict: 'branch_id,product_id,inventory_date' }
  );

  if (upsertErr) {
    console.error('❌ Upsert inventory error:', upsertErr.message);
    process.exit(1);
  }
  console.log(`✅ Set Kilimeen inventory to 50kg for today (${todayStr})`);

  // 3. Verify store inventory query
  const { data: invRows } = await supabase
    .from('inventory')
    .select('*')
    .eq('branch_id', branchId)
    .lte('inventory_date', todayStr)
    .order('inventory_date', { ascending: false });

  const todayInv = (invRows || []).find(i => i.product_id === kilimeen.id && i.inventory_date === todayStr);
  const fetchedStock = todayInv ? Number(todayInv.available_stock) : 0;

  if (fetchedStock !== 50) {
    console.error(`❌ Inventory fetch failed: expected 50kg, got ${fetchedStock}kg`);
    process.exit(1);
  }
  console.log(`✅ Storefront inventory query correctly returns ${fetchedStock}kg for Kilimeen`);

  // 4. Test placing order for 5kg via create_order_atomic
  const { data: custData } = await supabase.from('customers').select('id').limit(1);
  const custId = custData[0].id;
  const orderItems = [
    {
      product_id: kilimeen.id,
      product_name: kilimeen.name,
      quantity_kg: 5,
      weight_kg: 5,
      quantity: 1,
      price_per_kg: 340,
      cleaning_option: 'Whole'
    }
  ];

  const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_order_atomic', {
    p_customer_id: custId,
    p_address_id: null,
    p_items: orderItems,
    p_inventory_date: todayStr,
    p_idempotency_key: `e2e_test_${Date.now()}`,
    p_delivery_fee: 35,
    p_branch_id: branchId,
    p_customer_remarks: 'E2E Inventory Sync Test Order'
  });

  if (rpcErr || !rpcRes?.success) {
    console.error('❌ Order placement failed:', rpcErr || rpcRes);
    process.exit(1);
  }

  console.log(`✅ Placed test order #${rpcRes.order_number} for 5kg of Kilimeen!`);

  // 5. Verify stock was reduced from 50kg to 45kg
  const { data: afterInv } = await supabase
    .from('inventory')
    .select('available_stock, sold_stock, status')
    .eq('product_id', kilimeen.id)
    .eq('branch_id', branchId)
    .eq('inventory_date', todayStr)
    .single();

  console.log('Kilimeen inventory after 5kg purchase:', afterInv);

  if (Number(afterInv.available_stock) !== 45) {
    console.error(`❌ Stock deduction failed: expected 45kg, got ${afterInv.available_stock}kg`);
    process.exit(1);
  }
  if (Number(afterInv.sold_stock) !== 5) {
    console.error(`❌ Sold stock tracking failed: expected 5kg, got ${afterInv.sold_stock}kg`);
    process.exit(1);
  }

  console.log('✅ Stock deduction verified! Available stock reduced 50kg -> 45kg, sold_stock = 5kg');

  // 6. Test out-of-stock rejection
  let outErr = null;
  let outOfStockRes = null;
  try {
    const res = await supabase.rpc('create_order_atomic', {
      p_customer_id: custId,
      p_address_id: null,
      p_items: [
        {
          product_id: kilimeen.id,
          product_name: kilimeen.name,
          quantity_kg: 100, // Requesting 100kg when only 45kg available
          weight_kg: 100,
          quantity: 1,
          price_per_kg: 340,
          cleaning_option: 'Whole'
        }
      ],
      p_inventory_date: todayStr,
      p_idempotency_key: `e2e_test_out_${Date.now()}`,
      p_delivery_fee: 35,
      p_branch_id: branchId,
      p_customer_remarks: 'E2E Out of Stock Test'
    });
    outOfStockRes = res.data;
    outErr = res.error;
  } catch (e) {
    outErr = e;
  }

  if (outErr || outOfStockRes?.error || (outOfStockRes && !outOfStockRes.success)) {
    console.log('✅ Over-buying correctly rejected by RPC with message:', outErr?.message || outOfStockRes?.error);
  } else {
    console.error('❌ Over-buying was NOT rejected as expected!');
    process.exit(1);
  }

  // Restore Kilimeen stock to 150kg
  await supabase.from('inventory').update({
    opening_stock: 150,
    available_stock: 150,
    sold_stock: 0,
    damaged_stock: 0,
    status: 'AVAILABLE'
  }).eq('product_id', kilimeen.id).eq('inventory_date', todayStr).eq('branch_id', branchId);

  console.log('✅ Restored Kilimeen inventory to 150kg available for today.');
  console.log('🎉 ALL INVENTORY SYNC & STOCK REDUCTION TESTS PASSED SUCCESSFULLY!');
}

testE2EInventorySync();
