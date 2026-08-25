import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function debugSession() {
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

  const testPhone = '+919876543210'
  const { data: cust } = await supabase.from('customers').select('*').eq('phone', testPhone).single()
  console.log('Customer in DB:', cust)

  if (cust) {
    const { data: sess } = await supabase.from('chat_sessions').select('*').eq('customer_id', cust.id).single()
    console.log('Session in DB:', sess)

    const { data: addrs } = await supabase.from('addresses').select('*').eq('customer_id', cust.id)
    console.log('Addresses in DB for customer:', addrs)
  }
}

debugSession()
