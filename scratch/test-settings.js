const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function runTest() {
  console.log('--- TEST 1: Read settings via service_role ---')
  const { data: d1, error: e1 } = await supabaseAdmin.rpc('get_store_business_settings')
  console.log('Result 1:', { d1, e1 })

  console.log('\n--- TEST 2: Update settings via update_store_business_settings ---')
  const { data: d2, error: e2 } = await supabaseAdmin.rpc('update_store_business_settings', {
    p_brand_name: 'BESTIET FRESH',
    p_tagline: 'Fresh Fish Delivered Fresh To Your Door',
    p_low_stock_threshold_kg: 2,
    p_delivery_charge: 30
  })
  console.log('Result 2:', { d2, e2 })

  console.log('\n--- TEST 3: Read settings again ---')
  const { data: d3, error: e3 } = await supabaseAdmin.rpc('get_store_business_settings')
  console.log('Result 3:', { d3, e3 })
}

runTest()
