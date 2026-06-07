'use server'

import { redirect } from 'next/navigation'
import { requireAdminUser, isAdminEmail } from '@/lib/admin-auth'
import {
  normalizeDealerRole,
  slugifyDealerName,
} from '@/lib/admin-data'
import { createSupabaseServerClient } from '@/lib/supabase-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function loginAdmin(formData: FormData) {
  const email = readFormString(formData, 'email').toLowerCase()
  const password = readFormString(formData, 'password')

  if (!email || !password) {
    redirect('/admin/login?error=missing')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/admin/login?error=invalid')
  }

  if (!isAdminEmail(email)) {
    await supabase.auth.signOut()
    redirect('/admin/login?error=unauthorized')
  }

  redirect('/admin')
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export async function createDealerUser(formData: FormData) {
  await requireAdminUser()

  const dealerName = readFormString(formData, 'dealerName')
  const orgId = readFormString(formData, 'orgId')
  const email = readFormString(formData, 'email').toLowerCase()
  const password = readFormString(formData, 'password')
  const role = normalizeDealerRole(formData.get('role'))

  if (!dealerName || !orgId || !email || !password) {
    redirect('/admin?error=missing')
  }

  if (password.length < 8) {
    redirect('/admin?error=password')
  }

  const supabase = createSupabaseAdminClient()
  const { data: dealer, error: dealerError } = await upsertDealer({
    name: dealerName,
    orgId,
  })

  if (dealerError || !dealer) {
    redirect('/admin?error=dealer')
  }

  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        dealer_id: dealer.id,
        dealer_name: dealer.name,
        role,
      },
    })

  if (authError || !authUser.user) {
    redirect('/admin?error=user-exists')
  }

  const { error: membershipError } = await supabase
    .from('dealer_users')
    .upsert(
      {
        dealer_id: dealer.id,
        user_id: authUser.user.id,
        role,
      },
      { onConflict: 'dealer_id,user_id' }
    )

  if (membershipError) {
    redirect('/admin?error=membership')
  }

  redirect('/admin?created=1')
}

async function upsertDealer({
  name,
  orgId,
}: {
  name: string
  orgId: string
}) {
  const supabase = createSupabaseAdminClient()
  const { data: existingDealer, error: existingError } = await supabase
    .from('dealers')
    .select('id, name, org_id, slug')
    .eq('org_id', orgId)
    .maybeSingle()

  if (existingError) {
    return { data: null, error: existingError }
  }

  if (existingDealer) {
    return supabase
      .from('dealers')
      .update({ name })
      .eq('id', existingDealer.id)
      .select('id, name, org_id, slug')
      .single()
  }

  return supabase
    .from('dealers')
    .insert({
      name,
      org_id: orgId,
      slug: await createAvailableDealerSlug(name, orgId),
    })
    .select('id, name, org_id, slug')
    .single()
}

async function createAvailableDealerSlug(
  name: string,
  orgId: string
): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const baseSlug = slugifyDealerName(name, orgId)
  const { data } = await supabase
    .from('dealers')
    .select('slug')
    .eq('slug', baseSlug)
    .maybeSingle()

  return data ? `${baseSlug}-${orgId}` : baseSlug
}

function readFormString(formData: FormData, field: string): string {
  const value = formData.get(field)

  return typeof value === 'string' ? value.trim() : ''
}
