'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-auth'

export async function loginDealer(formData: FormData) {
  const email = readFormString(formData, 'email').toLowerCase()
  const password = readFormString(formData, 'password')

  if (!email || !password) {
    redirect('/forhandler/login?error=missing')
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/forhandler/login?error=invalid')
  }

  const hasDealerAccess = user
    ? await userHasDealerMembership(supabase, user.id)
    : false

  if (!hasDealerAccess) {
    await supabase.auth.signOut()
    redirect('/forhandler/login?error=unauthorized')
  }

  redirect('/forhandler')
}

export async function logoutDealer() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/forhandler/login')
}

function readFormString(formData: FormData, field: string): string {
  const value = formData.get(field)

  return typeof value === 'string' ? value.trim() : ''
}

async function userHasDealerMembership(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('dealer_users')
    .select('dealer_id', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    throw error
  }

  return (count ?? 0) > 0
}
