import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase-auth'

export async function requireDealerUser(): Promise<User> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forhandler/login')
  }

  return user
}

export async function getCurrentDealerUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}
