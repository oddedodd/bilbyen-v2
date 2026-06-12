import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getRequiredEnv } from './env'
import { createSupabaseServerClient } from './supabase-auth'
import { createSupabaseAdminClient } from './supabase-server'

export async function requireAdminUser(): Promise<User> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  if (!(await ensureAdminAccess(user))) {
    redirect('/admin/login?error=unauthorized')
  }

  return user
}

export async function getCurrentAdminUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !(await ensureAdminAccess(user))) {
    return null
  }

  return user
}

export async function ensureAdminAccess(user: User): Promise<boolean> {
  const email = user.email?.toLowerCase()

  if (!email) {
    return false
  }

  const isBootstrapAdmin = isBootstrapAdminEmail(email)
  const supabase = createSupabaseAdminClient()
  const { error: countError } = await supabase
    .from('admin_users')
    .select('user_id', { count: 'exact', head: true })

  if (countError) {
    return isBootstrapAdmin
  }

  if (isBootstrapAdmin) {
    await supabase.from('admin_users').upsert(
      {
        user_id: user.id,
        email,
      },
      { onConflict: 'user_id' }
    )

    return true
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) {
    return false
  }

  if (data.email.toLowerCase() !== email) {
    await supabase
      .from('admin_users')
      .update({ email })
      .eq('user_id', user.id)
  }

  return true
}

export function isBootstrapAdminEmail(email: string | undefined): boolean {
  if (!email) return false

  const adminEmails = getRequiredEnv('ADMIN_EMAILS')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return adminEmails.includes(email.toLowerCase())
}
