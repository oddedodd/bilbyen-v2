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
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/forhandler/login?error=invalid')
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
