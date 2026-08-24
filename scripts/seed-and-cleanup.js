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

async function testBranchInsertionMethods() {
  const client = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { data: auth } = await client.auth.signInWithPassword({
    email: 'admin@bestietfresh.com',
    password: 'admin123'
  })

  console.log('Session user:', auth?.user?.id)

  const authClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${auth.session.access_token}`
      }
    }
  })

  // Try insert without specified ID (letting UUID generate or with explicit id)
  const res1 = await authClient.from('branches').insert([
    { id: 'b1111111-1111-1111-1111-111111111111', name: 'Marine Drive Branch', location: 'Marine Drive, Kochi', is_active: true }
  ]).select()

  console.log('Explicit ID insert result:', res1)
}

testBranchInsertionMethods()
