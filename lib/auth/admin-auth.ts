import { createClient } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'store_admin' | 'branch_admin'
  name?: string
  branch_id: string
  isSuperAdmin?: boolean
}

export const MANVILA_BRANCH_ID = 'b1111111-1111-1111-1111-111111111111'
export const PEROORKADA_BRANCH_ID = 'b2222222-2222-2222-2222-222222222222'

// Backward compatibility exports
export const MARINE_DRIVE_BRANCH_ID = MANVILA_BRANCH_ID
export const FORT_KOCHI_BRANCH_ID = PEROORKADA_BRANCH_ID

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = createClient()

  // 1. Get authenticated user from Supabase Auth session
  const { data: { user }, error: userErr } = await supabase.auth.getUser()

  if (userErr || !user) {
    return null
  }

  // 2. Check if user is Super Admin in public.super_admin_users
  const { data: superAdmin } = await supabase
    .from('super_admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (superAdmin) {
    return {
      id: user.id,
      email: user.email || '',
      role: 'admin',
      name: 'Super Admin',
      branch_id: 'ALL',
      isSuperAdmin: true,
    }
  }

  // 3. Query admin_branch_assignments for the authenticated user
  const { data: assignment } = await supabase
    .from('admin_branch_assignments')
    .select('branch_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!assignment?.branch_id) {
    return null
  }

  // 4. Load actual branch from public.branches
  const { data: branch } = await supabase
    .from('branches')
    .select('name')
    .eq('id', assignment.branch_id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email || '',
    role: 'branch_admin',
    name: branch?.name || (assignment.branch_id === PEROORKADA_BRANCH_ID ? 'Peroorkada Branch Admin' : 'Manvila Kazhakkoottam Branch Admin'),
    branch_id: assignment.branch_id,
    isSuperAdmin: false,
  }
}

export async function signInAdminUser(
  email: string,
  password: string
): Promise<{
  success: boolean
  error?: string
  branch_id?: string
  isSuperAdmin?: boolean
}> {
  const supabase = createClient()

  // Attempt login ONLY via signInWithPassword (NEVER signUp!)
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error || !data?.user) {
    const msg = (error?.message || '').toLowerCase()
    if (
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed to fetch')
    ) {
      return { success: false, error: 'Unable to connect to the server. Please try again.' }
    }
    return { success: false, error: 'Invalid email or password.' }
  }

  // Check if authenticated user is Super Admin
  const { data: superAdmin } = await supabase
    .from('super_admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (superAdmin) {
    return {
      success: true,
      isSuperAdmin: true,
      branch_id: 'ALL',
    }
  }

  // Determine branch assignment strictly from public.admin_branch_assignments
  const { data: assignment } = await supabase
    .from('admin_branch_assignments')
    .select('branch_id')
    .eq('user_id', data.user.id)
    .maybeSingle()

  if (!assignment?.branch_id) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'No branch is assigned to this account. Please contact the administrator.',
    }
  }

  return {
    success: true,
    isSuperAdmin: false,
    branch_id: assignment.branch_id,
  }
}
