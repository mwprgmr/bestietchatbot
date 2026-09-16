const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function inspectRPC() {
  const { data, error } = await supabase.rpc('get_store_business_settings')
  console.log('get_store_business_settings data:', data)

  // Querypg_proc for function definitions using Postgres direct / rest or check migrations in repo
}

inspectRPC()
