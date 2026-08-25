import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testMinimalInsert() {
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

  const { data, error } = await supabase.from('addresses').insert([
    {
      customer_id: customerId,
      address_line: 'Flat 4B, Marine Drive, Kochi 682031',
      pincode: '682031',
    },
  ]).select('*').single()

  console.log('Inserted Address Data:', data)
  console.log('Inserted Address Error:', error)
}

testMinimalInsert()
