const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_d9xF1syTEtklAKHf32WlAw_lC55l4UG'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testLogin(email, password) {
  console.log(`\n========================================`)
  console.log(`Testing Login: ${email}`)
  console.log(`========================================`)

  // 1. Call signInWithPassword ONLY
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error || !data?.user) {
    console.error(`❌ Authentication Failed:`, error?.message)
    return
  }

  console.log(`✅ Authentication Successful! User ID: ${data.user.id}`)

  // 2. Check Super Admin
  const { data: superAdmin } = await supabase
    .from('super_admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (superAdmin) {
    console.log(`✅ Role: SUPER ADMIN (Access Granted to /super-admin/dashboard)`)
    return
  }

  // 3. Check Branch Assignment
  const { data: assignment } = await supabase
    .from('admin_branch_assignments')
    .select('branch_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!assignment?.branch_id) {
    console.error(`❌ Authorization Failed: No branch assigned in admin_branch_assignments`)
    return
  }

  // 4. Check Branch Details
  const { data: branch } = await supabase
    .from('branches')
    .select('name, is_active')
    .eq('id', assignment.branch_id)
    .maybeSingle()

  console.log(`✅ Role: BRANCH ADMIN`)
  console.log(`✅ Assigned Branch ID: ${assignment.branch_id}`)
  console.log(`✅ Assigned Branch Name: ${branch?.name || 'Unknown'}`)
  console.log(`✅ Redirect Target: /admin/dashboard`)
}

async function main() {
  await testLogin('manvila@bestietfresh.com', 'BestietFresh2026!')
  await testLogin('peroorkada@bestietfresh.com', 'BestietFresh2026!')
  await testLogin('admin@bestietfresh.com', 'BestietFresh2026!')
}

main()
