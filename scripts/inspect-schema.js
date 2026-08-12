const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const parts = line.split('=')
    if (parts.length >= 2 && !line.startsWith('#')) {
      const key = parts[0].trim()
      const val = parts.slice(1).join('=').trim()
      if (key && val && !process.env[key]) {
        process.env[key] = val
      }
    }
  })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function inspectSchema() {
  console.log('--- Inspecting Products Schema ---')
  const { data: prodData, error: prodErr } = await supabase.from('products').select('*').limit(1)
  console.log('Products sample:', prodData, prodErr)

  console.log('--- Inspecting Profiles Schema ---')
  const { data: profData, error: profErr } = await supabase.from('profiles').select('*').limit(1)
  console.log('Profiles sample:', profData, profErr)

  console.log('--- Inspecting Customers Schema ---')
  const { data: custData, error: custErr } = await supabase.from('customers').select('*').limit(1)
  console.log('Customers sample:', custData, custErr)

  console.log('--- Inspecting Chat Sessions Schema ---')
  const { data: sessData, error: sessErr } = await supabase.from('chat_sessions').select('*').limit(1)
  console.log('Sessions sample:', sessData, sessErr)
}

inspectSchema()
