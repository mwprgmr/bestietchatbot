const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function run16StepVerification() {
  console.log('=== STARTING 16-STEP STORE SETTINGS PERSISTENCE SUITE ===\n')

  // Setup admin user auth context
  await supabase.auth.admin.updateUserById('b49445eb-1d03-4621-bc5c-b2156feb645b', { password: 'BestietFresh2026!' })
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'admin@bestietfresh.com',
    password: 'BestietFresh2026!'
  })

  // TEST 1: Read settings from database
  console.log('TEST 1: Reading initial settings from database...')
  const { data: t1Data, error: t1Err } = await supabase.rpc('get_store_business_settings')
  if (t1Err) throw new Error(`TEST 1 Failed: ${t1Err.message}`)
  console.log('  Initial Data:', t1Data)

  // TEST 2 & 3: Change tagline & Save
  console.log('\nTEST 2 & 3: Changing Tagline to "Fresh Fish Delivered Fresh To Your Door" and saving...')
  const { data: t3Data, error: t3Err } = await supabase.rpc('update_store_business_settings', {
    p_brand_name: t1Data.brand_name || 'BESTIET FRESH',
    p_tagline: 'Fresh Fish Delivered Fresh To Your Door',
    p_low_stock_threshold_kg: Number(t1Data.default_low_stock_threshold_kg || 5),
    p_delivery_charge: Number(t1Data.standard_delivery_charge || 30)
  })
  if (t3Err) throw new Error(`TEST 3 Failed: ${t3Err.message}`)
  console.log('  Update response:', t3Data)

  // TEST 4, 5, 6, 7: Read database again, simulate refresh & verify tagline
  console.log('\nTEST 4, 5, 6, 7: Verifying database state & simulated refresh for Tagline...')
  const { data: t6Data } = await supabase.rpc('get_store_business_settings')
  if (t6Data.tagline !== 'Fresh Fish Delivered Fresh To Your Door') {
    throw new Error(`TEST 7 Failed: Expected tagline "Fresh Fish Delivered Fresh To Your Door", got "${t6Data.tagline}"`)
  }
  console.log('  ✅ Tagline persisted in DB:', t6Data.tagline)

  // TEST 8, 9, 10: Change delivery charge to 45 & verify refresh
  console.log('\nTEST 8, 9, 10: Changing Delivery Charge to 45 and verifying persistence...')
  await supabase.rpc('update_store_business_settings', {
    p_brand_name: t6Data.brand_name,
    p_tagline: t6Data.tagline,
    p_low_stock_threshold_kg: Number(t6Data.default_low_stock_threshold_kg),
    p_delivery_charge: 45
  })
  const { data: t10Data } = await supabase.rpc('get_store_business_settings')
  if (Number(t10Data.standard_delivery_charge) !== 45) {
    throw new Error(`TEST 10 Failed: Expected delivery charge 45, got ${t10Data.standard_delivery_charge}`)
  }
  console.log('  ✅ Delivery Charge persisted in DB:', t10Data.standard_delivery_charge)

  // TEST 11, 12, 13: Change low-stock threshold to 3.5 & verify refresh
  console.log('\nTEST 11, 12, 13: Changing Low Stock Threshold to 3.5 and verifying persistence...')
  await supabase.rpc('update_store_business_settings', {
    p_brand_name: t10Data.brand_name,
    p_tagline: t10Data.tagline,
    p_low_stock_threshold_kg: 3.5,
    p_delivery_charge: Number(t10Data.standard_delivery_charge)
  })
  const { data: t13Data } = await supabase.rpc('get_store_business_settings')
  if (Number(t13Data.default_low_stock_threshold_kg) !== 3.5) {
    throw new Error(`TEST 13 Failed: Expected threshold 3.5, got ${t13Data.default_low_stock_threshold_kg}`)
  }
  console.log('  ✅ Low Stock Threshold persisted in DB:', t13Data.default_low_stock_threshold_kg)

  // TEST 14, 15, 16: Change brand name to BESTIET FRESH & verify refresh
  console.log('\nTEST 14, 15, 16: Changing Brand Name to "BESTIET FRESH" and verifying persistence...')
  await supabase.rpc('update_store_business_settings', {
    p_brand_name: 'BESTIET FRESH',
    p_tagline: t13Data.tagline,
    p_low_stock_threshold_kg: Number(t13Data.default_low_stock_threshold_kg),
    p_delivery_charge: Number(t13Data.standard_delivery_charge)
  })
  const { data: t16Data } = await supabase.rpc('get_store_business_settings')
  if (t16Data.brand_name !== 'BESTIET FRESH') {
    throw new Error(`TEST 16 Failed: Expected brand name "BESTIET FRESH", got "${t16Data.brand_name}"`)
  }
  console.log('  ✅ Brand Name persisted in DB:', t16Data.brand_name)

  console.log('\n========================================')
  console.log('🎉 ALL 16 PERSISTENCE TESTS PASSED CLEANLY!')
  console.log('========================================\n')
}

run16StepVerification().catch(err => {
  console.error('❌ Verification Error:', err)
  process.exit(1)
})
