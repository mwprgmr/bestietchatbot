const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

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

async function testInsert() {
  console.log('Testing inserting product...')
  const { data: prodData, error: prodErr } = await supabase
    .from('products')
    .insert([{ name: 'Test Fish ' + Date.now(), category: 'Fish', unit: 'kg' }])

  console.log('Product Insert Result:', { prodData, prodErr })

  console.log('Testing inserting customer...')
  const { data: custData, error: custErr } = await supabase
    .from('customers')
    .insert([{ phone: '1555' + Math.floor(Math.random() * 1000000), name: 'Test' }])

  console.log('Customer Insert Result:', { custData, custErr })
}

testInsert()
