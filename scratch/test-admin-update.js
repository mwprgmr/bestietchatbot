const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testAdminUpdate() {
  console.log('--- 1. Updating admin password to standard dev password ---')
  const { data: updatedUser, error: updatePassErr } = await supabase.auth.admin.updateUserById(
    'b49445eb-1d03-4621-bc5c-b2156feb645b',
    { password: 'BestietFresh2026!' }
  )
  if (updatePassErr) {
    console.error('Password update error:', updatePassErr)
  }

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@bestietfresh.com',
    password: 'BestietFresh2026!'
  })

  if (authErr) {
    console.error('Auth error:', authErr)
    return
  }

  console.log('Signed in successfully as:', authData.user.email)

  console.log('--- 2. Reading current settings ---')
  const { data: readData1, error: readErr1 } = await supabase.rpc('get_store_business_settings')
  console.log('Initial settings from DB:', readData1, readErr1)

  console.log('--- 3. Calling update_store_business_settings RPC ---')
  const { data: updateData, error: updateErr } = await supabase.rpc('update_store_business_settings', {
    p_brand_name: 'BESTIET FRESH',
    p_tagline: 'Fresh Fish Delivered Fresh To Your Door',
    p_low_stock_threshold_kg: 2,
    p_delivery_charge: 30
  })
  console.log('Update RPC response:', updateData, updateErr)

  console.log('--- 4. Verifying database state with get_store_business_settings ---')
  const { data: readData2, error: readErr2 } = await supabase.rpc('get_store_business_settings')
  console.log('Updated settings from DB:', readData2, readErr2)
}

testAdminUpdate()
