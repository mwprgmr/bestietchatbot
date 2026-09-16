const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function testAdmin() {
  console.log('--- 1. Querying profiles table ---')
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*')
  console.log('Profiles:', profiles, pErr)

  console.log('--- 2. Querying admin_branch_assignments table ---')
  const { data: assignments, error: aErr } = await supabase.from('admin_branch_assignments').select('*')
  console.log('Assignments:', assignments, aErr)
}

testAdmin()
