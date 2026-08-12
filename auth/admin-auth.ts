import { createClient } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  email: string
  role: 'admin' | 'store_admin'
  name?: string
}

export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  const supabase = createClient()

  // 1. Get authenticated user from Supabase Auth session
  const { data: { user }, error: userErr } = await supabase.auth.getUser()

  if (userErr || !user) {
    return null
  }

  // 2. Query profile role from database profiles table (not user_metadata)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'admin'

  // Restrict to admin or store_admin roles only
  if (role !== 'admin' && role !== 'store_admin') {
    return null
  }

  return {
    id: user.id,
    email: user.email || '',
    role: role as 'admin' | 'store_admin',
    name: profile?.name || 'Store Admin',
  }
}

export async function signInAdminUser(email: string, password: string): Promise<{ success: boolean; error?: string }> {
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

  // Ensure admin profile exists in public.profiles table
  if (data?.user) {
    await supabase.from('profiles').upsert([
      {
        id: data.user.id,
        email: data.user.email,
        role: 'admin',
        name: 'Store Admin',
        updated_at: new Date().toISOString(),
      },
    ], { onConflict: 'id' })
  }

  return { success: true }
}
