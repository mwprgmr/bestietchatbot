const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const keyMatch = envText.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)/)
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function runAuthTests() {
  console.log('==================================================')
  console.log('BESTIET FRESH — AUTHENTICATION SYSTEM VALIDATION')
  console.log('==================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`)
      passed++
    } else {
      console.log(`❌ [FAIL] ${message}`)
      failed++
    }
  }

  // --- TEST 1: Manvila Branch Admin Login ---
  console.log('--- TEST 1: Manvila Branch Admin Login ---')
  await supabase.auth.signOut()
  const { data: mData, error: mErr } = await supabase.auth.signInWithPassword({
    email: 'manvila@bestietfresh.com',
    password: 'BestietFresh2026!'
  })
  assert(!mErr && mData?.user?.id === 'c1111111-1111-1111-1111-111111111111', 'Manvila authenticated successfully via signInWithPassword')

  if (mData?.user) {
    const { data: assignment } = await supabase
      .from('admin_branch_assignments')
      .select('branch_id')
      .eq('user_id', mData.user.id)
      .maybeSingle()
    assert(assignment?.branch_id === 'b1111111-1111-1111-1111-111111111111', 'Assigned branch determined as Manvila (b1111111-1111-1111-1111-111111111111)')
  }

  // --- TEST 2: Peroorkada Branch Admin Login ---
  console.log('\n--- TEST 2: Peroorkada Branch Admin Login ---')
  await supabase.auth.signOut()
  const { data: pData, error: pErr } = await supabase.auth.signInWithPassword({
    email: 'peroorkada@bestietfresh.com',
    password: 'BestietFresh2026!'
  })
  assert(!pErr && pData?.user?.id === '6d7a0d41-04fe-4b75-842c-4e5ef65d4226', 'Peroorkada authenticated successfully via signInWithPassword')

  if (pData?.user) {
    const { data: assignment } = await supabase
      .from('admin_branch_assignments')
      .select('branch_id')
      .eq('user_id', pData.user.id)
      .maybeSingle()
    assert(assignment?.branch_id === 'b2222222-2222-2222-2222-222222222222', 'Assigned branch determined as Peroorkada (b2222222-2222-2222-2222-222222222222)')
  }

  // --- TEST 3: Wrong Password (No Signup Attempt) ---
  console.log('\n--- TEST 3: Invalid Password Attempt ---')
  await supabase.auth.signOut()
  const { data: wData, error: wErr } = await supabase.auth.signInWithPassword({
    email: 'manvila@bestietfresh.com',
    password: 'WrongPassword123!'
  })
  assert(wErr !== null && wData?.user === null, 'Login failed cleanly with invalid credentials error')
  assert(wErr?.message !== 'User already registered', 'Error message is NOT "User already registered"')

  // --- TEST 4: Super Admin Login ---
  console.log('\n--- TEST 4: Super Admin Login ---')
  await supabase.auth.signOut()
  const { data: saData, error: saErr } = await supabase.auth.signInWithPassword({
    email: 'admin@bestietfresh.com',
    password: 'BestietFresh2026!'
  })
  assert(!saErr && saData?.user?.id === 'b49445eb-1d03-4621-bc5c-b2156feb645b', 'Super Admin authenticated successfully via signInWithPassword')

  if (saData?.user) {
    const { data: superAdmin } = await supabase
      .from('super_admin_users')
      .select('user_id')
      .eq('user_id', saData.user.id)
      .maybeSingle()
    assert(superAdmin?.user_id === 'b49445eb-1d03-4621-bc5c-b2156feb645b', 'Verified Super Admin authorization via public.super_admin_users')
  }

  // --- TEST 5: Branch Admin tries Super Admin ---
  console.log('\n--- TEST 5: Branch Admin Attempts Super Admin Authorization ---')
  await supabase.auth.signOut()
  const { data: bData } = await supabase.auth.signInWithPassword({
    email: 'manvila@bestietfresh.com',
    password: 'BestietFresh2026!'
  })
  if (bData?.user) {
    const { data: superAdmin } = await supabase
      .from('super_admin_users')
      .select('user_id')
      .eq('user_id', bData.user.id)
      .maybeSingle()
    assert(superAdmin === null, 'Branch Admin user_id NOT present in public.super_admin_users (Access Denied correctly)')
  }

  // --- TEST 6: Session Refresh & Verification ---
  console.log('\n--- TEST 6: Session Refresh & Super Admin Authorization ---')
  await supabase.auth.signOut()
  await supabase.auth.signInWithPassword({
    email: 'admin@bestietfresh.com',
    password: 'BestietFresh2026!'
  })
  const { data: { session } } = await supabase.auth.getSession()
  assert(session?.user?.email === 'admin@bestietfresh.com', 'Supabase Auth session remains valid after getSession()')

  // --- TEST 7: Logout ---
  console.log('\n--- TEST 7: Logout Flow ---')
  const { error: outErr } = await supabase.auth.signOut()
  assert(!outErr, 'supabase.auth.signOut() executed cleanly')
  const { data: { session: postOutSession } } = await supabase.auth.getSession()
  assert(postOutSession === null, 'Session is null after logout')

  // --- SUMMARY ---
  console.log('\n==================================================')
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('==================================================')
}

runAuthTests()
