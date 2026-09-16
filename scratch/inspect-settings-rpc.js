const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testSettingsRpc() {
  console.log('--- 1. Testing get_store_business_settings() ---')
  const { data: getData, error: getErr } = await supabase.rpc('get_store_business_settings')
  console.log('get_store_business_settings result:', { getData, getErr })

  console.log('--- 2. Testing update_store_business_settings() ---')
  const { data: updateData, error: updateErr } = await supabase.rpc('update_store_business_settings', {
    p_brand_name: 'BESTIET FRESH',
    p_tagline: 'Fresh Fish Delivered Fresh To Your Door',
    p_low_stock_threshold_kg: 5,
    p_delivery_charge: 30
  })
  console.log('update_store_business_settings result:', { updateData, updateErr })

  console.log('--- 3. Testing get_store_business_settings() again ---')
  const { data: getData2, error: getErr2 } = await supabase.rpc('get_store_business_settings')
  console.log('get_store_business_settings result 2:', { getData2, getErr2 })
}

testSettingsRpc()
