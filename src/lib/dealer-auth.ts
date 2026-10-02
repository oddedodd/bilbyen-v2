import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from './supabase-auth'

/**
 * Only verifies that the user is signed in. The caller must verify dealer
 * membership itself, e.g. via the RLS-scoped dealer list in the dashboard data.
 */
export async function requireSignedInDealerUser(): Promise<User> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forhandler/login')
  }

  return user
}

export function redirectUnauthorizedDealer(): never {
  redirect('/forhandler/login?error=unauthorized')
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
