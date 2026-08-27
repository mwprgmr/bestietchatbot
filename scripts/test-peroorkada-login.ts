import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function testPeroorkadaLogin() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach((line) => {
      const parts = line.split('=')
      if (parts.length >= 2 && !line.startsWith('#')) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        if (key && val) {
          process.env[key] = val
        }
      }
    })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  const supabase = createClient(supabaseUrl, anonKey)

  console.log('Testing sign in for peroorkada@bestietfresh.com...')
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'peroorkada@bestietfresh.com',
    password: 'admin123',
  })

  if (error) {
    console.error('❌ LOGIN FAILED:', error.message)
  } else {
    console.log('🎉 LOGIN SUCCESSFUL!')
    console.log('Authenticated User ID:', data.user?.id)
    console.log('Email:', data.user?.email)
  }
}

testPeroorkadaLogin()
