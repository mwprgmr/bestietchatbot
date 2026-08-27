import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

async function updateBranchNames() {
  console.log('===========================================================')
  console.log('UPDATING BRANCH NAMES IN SUPABASE LIVE DATABASE')
  console.log('===========================================================')

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rhqoonbhwsffwojvndnb.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. Update Branch 1: b1111111-1111-1111-1111-111111111111 -> Manvila Kazhakkoottam Branch
  const { error: err1 } = await supabase
    .from('branches')
    .update({
      name: 'Manvila Kazhakkoottam Branch',
      location: 'Manvila, Kazhakkoottam',
    })
    .eq('id', 'b1111111-1111-1111-1111-111111111111')

  if (err1) {
    console.error('Error updating Branch 1:', err1.message)
  } else {
    console.log('✅ Branch 1 updated to "Manvila Kazhakkoottam Branch"')
  }

  // 2. Update Branch 2: b2222222-2222-2222-2222-222222222222 -> Peroorkada Branch
  const { error: err2 } = await supabase
    .from('branches')
    .update({
      name: 'Peroorkada Branch',
      location: 'Peroorkada, Trivandrum',
    })
    .eq('id', 'b2222222-2222-2222-2222-222222222222')

  if (err2) {
    console.error('Error updating Branch 2:', err2.message)
  } else {
    console.log('✅ Branch 2 updated to "Peroorkada Branch"')
  }

  // 3. Verify Database State
  const { data: branches } = await supabase.from('branches').select('*')
  console.log('\nCurrent Branches in Database:')
  console.log(branches)
}

updateBranchNames()
