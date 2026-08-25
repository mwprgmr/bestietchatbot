import { createClient } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'store_admin' | 'branch_admin'
  name?: string
  branch_id: string
}

export const MARINE_DRIVE_BRANCH_ID = 'b1111111-1111-1111-1111-111111111111'
export const FORT_KOCHI_BRANCH_ID = 'b2222222-2222-2222-2222-222222222222'

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = createClient()

  // 1. Get authenticated user from Supabase Auth session
  const { data: { user }, error: userErr } = await supabase.auth.getUser()

  if (userErr || !user) {
    return null
  }

  // 2. Query admin_branch_assignments for the authenticated user
  const { data: assignment } = await supabase
    .from('admin_branch_assignments')
    .select('branch_id')
    .eq('user_id', user.id)
    .single()

  // 3. Query profile role & fallback branch_id from database profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'branch_admin'

  // Restrict to admin roles only
  if (role !== 'admin' && role !== 'store_admin' && role !== 'branch_admin') {
    return null
  }

  // Determine branch_id from admin_branch_assignments -> profiles -> email fallback
  let branchId = assignment?.branch_id || profile?.branch_id
  if (!branchId) {
    if (user.email?.toLowerCase().includes('fort')) {
      branchId = FORT_KOCHI_BRANCH_ID
    } else {
      branchId = MARINE_DRIVE_BRANCH_ID
    }
  }

  return {
    id: user.id,
    email: user.email || '',
    role: role as 'admin' | 'store_admin' | 'branch_admin',
    name: profile?.name || (branchId === FORT_KOCHI_BRANCH_ID ? 'Fort Kochi Admin' : 'Marine Drive Admin'),
    branch_id: branchId,
  }
}

export async function signInAdminUser(email: string, password: string): Promise<{ success: boolean; error?: string; branch_id?: string }> {
  const supabase = createClient()

  // Attempt login via Supabase Auth
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // If account does not exist yet in auth.users (first time setup), attempt sign up
  if (error && (error.message.includes('Invalid login credentials') || error.message.includes('User not found'))) {
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpErr) {
      return { success: false, error: signUpErr.message }
    }

    // Retry sign in
    const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (retryErr) {
      return { success: false, error: retryErr.message }
    }

    data = retryData
    error = null
  }

  if (error) {
    return { success: false, error: error.message }
  }

  // Determine target branch for this account
  const isFortKochi = email.toLowerCase().includes('fort')
  const assignedBranchId = isFortKochi ? FORT_KOCHI_BRANCH_ID : MARINE_DRIVE_BRANCH_ID
  const adminName = isFortKochi ? 'Fort Kochi Branch Admin' : 'Marine Drive Branch Admin'

  // Ensure admin profile exists in public.profiles table with branch_id
  if (data?.user) {
    await supabase.from('profiles').upsert([
      {
        id: data.user.id,
        email: data.user.email,
        role: 'branch_admin',
        name: adminName,
        branch_id: assignedBranchId,
        updated_at: new Date().toISOString(),
      },
    ], { onConflict: 'id' })
  }

  return { success: true, branch_id: assignedBranchId }
}
