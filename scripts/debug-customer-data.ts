import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function inspectCustomerData() {
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
  const { data: sess } = await supabase.from('chat_sessions').select('*').eq('customer_id', customerId).single()
  console.log('Session for customer e2be5329...:', sess)

  const { data: addrs } = await supabase.from('addresses').select('*').eq('customer_id', customerId)
  console.log('Addresses for customer e2be5329...:', addrs)
}

inspectCustomerData()
