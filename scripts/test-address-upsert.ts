import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testAddressUpsert() {
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const customerId = 'e2be5329-75e0-4f5e-86c3-e138fc4a8271'

  console.log('1. Trying RPC upsert_address_sec...')
  const { data: rpcData, error: rpcErr } = await supabase.rpc('upsert_address_sec', {
    p_customer_id: customerId,
    p_address_line1: 'Flat 4B, Marine Drive, Kochi 682031',
    p_title: 'Home',
    p_city: 'Kochi',
    p_pincode: '682031',
  })
  console.log('RPC Data:', rpcData, 'RPC Error:', rpcErr)

  console.log('2. Trying direct insert into addresses table...')
  const { data: directData, error: directErr } = await supabase
    .from('addresses')
    .insert([
      {
        customer_id: customerId,
        title: 'Home',
        address_line1: 'Flat 4B, Marine Drive, Kochi 682031',
        city: 'Kochi',
        pincode: '682031',
        is_default: true,
      },
    ])
    .select('*')
    .single()
  console.log('Direct Data:', directData, 'Direct Error:', directErr)
}

testAddressUpsert()
