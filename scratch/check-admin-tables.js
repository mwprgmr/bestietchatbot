const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const serviceKeyMatch = envText.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)
const SUPABASE_SERVICE_ROLE_KEY = serviceKeyMatch ? serviceKeyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function checkTables() {
  console.log('--- BRANCHES ---')
  const { data: branches, error: bErr } = await supabase.from('branches').select('*')
  console.log('branches:', branches, 'error:', bErr)

  console.log('--- ADMIN BRANCH ASSIGNMENTS ---')
  const { data: assignments, error: aErr } = await supabase.from('admin_branch_assignments').select('*')
  console.log('assignments:', assignments, 'error:', aErr)

  console.log('--- SUPER ADMIN USERS ---')
  const { data: superAdmins, error: sErr } = await supabase.from('super_admin_users').select('*')
  console.log('superAdmins:', superAdmins, 'error:', sErr)
}

checkTables()
