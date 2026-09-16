const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envText = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8')
const keyMatch = envText.match(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)/)
const SUPABASE_KEY = keyMatch ? keyMatch[1].trim() : ''
const SUPABASE_URL = 'https://rhqoonbhwsffwojvndnb.supabase.co'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testAuthAndSelect() {
  console.log('--- TEST LOGIN manvila@bestietfresh.com ---')
  const { data: mData, error: mErr } = await supabase.auth.signInWithPassword({
    email: 'manvila@bestietfresh.com',
    password: 'BestietFresh2026!'
  })
  console.log('Manvila login:', mData?.user?.id, 'error:', mErr)

  if (mData?.user) {
    const { data: assignment, error: aErr } = await supabase
      .from('admin_branch_assignments')
      .select('branch_id')
      .eq('user_id', mData.user.id)
      .maybeSingle()
    console.log('Manvila assignment query:', assignment, 'error:', aErr)

    const { data: isSuper, error: sErr } = await supabase
      .from('super_admin_users')
      .select('user_id')
      .eq('user_id', mData.user.id)
      .maybeSingle()
    console.log('Manvila isSuper query:', isSuper, 'error:', sErr)
  }

  await supabase.auth.signOut()

  console.log('\n--- TEST LOGIN admin@bestietfresh.com ---')
  const { data: aData, error: adminErr } = await supabase.auth.signInWithPassword({
    email: 'admin@bestietfresh.com',
    password: 'BestietFresh2026!'
  })
  console.log('Admin login:', aData?.user?.id, 'error:', adminErr)

  if (aData?.user) {
    const { data: isSuper, error: sErr } = await supabase
      .from('super_admin_users')
      .select('user_id')
      .eq('user_id', aData.user.id)
      .maybeSingle()
    console.log('Super Admin query:', isSuper, 'error:', sErr)
  }

  await supabase.auth.signOut()
}

testAuthAndSelect()
