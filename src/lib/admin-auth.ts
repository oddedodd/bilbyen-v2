import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { getRequiredEnv } from './env'
import { createSupabaseServerClient } from './supabase-auth'

export async function requireAdminUser(): Promise<User> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  if (!isAdminEmail(user.email)) {
    redirect('/admin/login?error=unauthorized')
  }

  return user
}

export async function getCurrentAdminUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return null
  }

  return user
}

export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false

  const adminEmails = getRequiredEnv('ADMIN_EMAILS')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return adminEmails.includes(email.toLowerCase())
}
