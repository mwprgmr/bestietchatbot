import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testAddressVariations() {
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

  // Test address_line
  const { data: d1, error: e1 } = await supabase.from('addresses').insert([{
    customer_id: customerId,
    title: 'Home',
    address_line: 'Flat 4B, Marine Drive, Kochi 682031',
    city: 'Kochi',
    pincode: '682031',
    is_default: true,
  }]).select('*')
  console.log('Insert with address_line:', d1, e1)

  // Test address
  if (e1) {
    const { data: d2, error: e2 } = await supabase.from('addresses').insert([{
      customer_id: customerId,
      title: 'Home',
      address: 'Flat 4B, Marine Drive, Kochi 682031',
      city: 'Kochi',
      pincode: '682031',
      is_default: true,
    }]).select('*')
    console.log('Insert with address:', d2, e2)
  }
}

testAddressVariations()
