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

  if (!(await userHasDealerMembership(user.id))) {
    redirect('/forhandler/login?error=unauthorized')
  }

  return user
}

export async function getCurrentDealerUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !(await userHasDealerMembership(user.id))) {
    return null
  }

  return user
}

export async function userHasDealerMembership(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient()
  const { count, error } = await supabase
    .from('dealer_users')
    .select('dealer_id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  return (count ?? 0) > 0
}
