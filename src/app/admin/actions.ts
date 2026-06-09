'use server'

import { redirect } from 'next/navigation'
import { requireAdminUser, isAdminEmail } from '@/lib/admin-auth'
import { normalizeCarGroupSlug } from '@/lib/car-groups'
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

export async function createDealer(formData: FormData) {
  await requireAdminUser()

  const dealerName = readFormString(formData, 'dealerName')
  const orgId = readFormString(formData, 'orgId')
  const groupSlug = normalizeCarGroupSlug(formData.get('groupSlug'))

  if (!dealerName || !orgId) {
    redirect('/admin?error=missing')
  }

  const { data: dealer, error: dealerError } = await upsertDealer({
    name: dealerName,
    orgId,
    groupSlug,
  })

  if (dealerError || !dealer) {
    redirect('/admin?error=dealer')
  }

  redirect('/admin?dealerCreated=1')
}

export async function createDealerUser(formData: FormData) {
  await requireAdminUser()

  const dealerId = readFormString(formData, 'dealerId')
  const email = readFormString(formData, 'email').toLowerCase()
  const password = readFormString(formData, 'password')
  const role = normalizeDealerRole(formData.get('role'))

  if (!dealerId || !email || !password) {
    redirect('/admin?error=missing')
  }

  if (password.length < 8) {
    redirect('/admin?error=password')
  }

  const supabase = createSupabaseAdminClient()
  const { data: dealer, error: dealerError } = await supabase
    .from('dealers')
    .select('id, name')
    .eq('id', dealerId)
    .single()

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
        dealer_id: dealerId,
        user_id: authUser.user.id,
        role,
      },
      { onConflict: 'dealer_id,user_id' }
    )

  if (membershipError) {
    redirect('/admin?error=membership')
  }

  redirect('/admin?userCreated=1')
}

export async function updateDealerUser(formData: FormData) {
  await requireAdminUser()

  const userId = readFormString(formData, 'userId')
  const dealerId = readFormString(formData, 'dealerId')
  const email = readFormString(formData, 'email').toLowerCase()
  const password = readFormString(formData, 'password')
  const role = normalizeDealerRole(formData.get('role'))

  if (!userId || !dealerId || !email) {
    redirect('/admin?error=missing')
  }

  if (password && password.length < 8) {
    redirect('/admin?error=password')
  }

  const supabase = createSupabaseAdminClient()
  const { data: dealer, error: dealerError } = await supabase
    .from('dealers')
    .select('id, name')
    .eq('id', dealerId)
    .single()

  if (dealerError || !dealer) {
    redirect('/admin?error=dealer')
  }

  const { error: userError } = await supabase.auth.admin.updateUserById(
    userId,
    {
      email,
      ...(password ? { password } : {}),
      user_metadata: {
        dealer_id: dealer.id,
        dealer_name: dealer.name,
        role,
      },
    }
  )

  if (userError) {
    redirect('/admin?error=user')
  }

  const { error: deleteMembershipsError } = await supabase
    .from('dealer_users')
    .delete()
    .eq('user_id', userId)

  if (deleteMembershipsError) {
    redirect('/admin?error=membership')
  }

  const { error: membershipError } = await supabase
    .from('dealer_users')
    .insert({
      dealer_id: dealerId,
      user_id: userId,
      role,
    })

  if (membershipError) {
    redirect('/admin?error=membership')
  }

  redirect('/admin?userUpdated=1')
}

export async function deleteDealerUser(formData: FormData) {
  const adminUser = await requireAdminUser()
  const userId = readFormString(formData, 'userId')

  if (!userId) {
    redirect('/admin?error=missing')
  }

  if (userId === adminUser.id) {
    redirect('/admin?error=self-delete')
  }

  const supabase = createSupabaseAdminClient()
  const { error: membershipError } = await supabase
    .from('dealer_users')
    .delete()
    .eq('user_id', userId)

  if (membershipError) {
    redirect('/admin?error=membership')
  }

  const { error: userError } = await supabase.auth.admin.deleteUser(userId)

  if (userError) {
    redirect('/admin?error=user')
  }

  redirect('/admin?userDeleted=1')
}

export async function updateDealerGroup(formData: FormData) {
  await requireAdminUser()

  const dealerId = readFormString(formData, 'dealerId')
  const groupSlug = normalizeCarGroupSlug(formData.get('groupSlug'))

  if (!dealerId) {
    redirect('/admin?error=missing')
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('dealers')
    .update({ group_slug: groupSlug })
    .eq('id', dealerId)

  if (error) {
    redirect('/admin?error=dealer')
  }

  redirect('/admin?groupUpdated=1')
}

async function upsertDealer({
  name,
  orgId,
  groupSlug,
}: {
  name: string
  orgId: string
  groupSlug: string
}) {
  const supabase = createSupabaseAdminClient()
  const { data: existingDealer, error: existingError } = await supabase
    .from('dealers')
    .select('id, name, org_id, slug, group_slug')
    .eq('org_id', orgId)
    .maybeSingle()

  if (existingError) {
    return { data: null, error: existingError }
  }

  if (existingDealer) {
    return supabase
      .from('dealers')
      .update({ name, group_slug: groupSlug })
      .eq('id', existingDealer.id)
      .select('id, name, org_id, slug, group_slug')
      .single()
  }

  return supabase
    .from('dealers')
    .insert({
      name,
      org_id: orgId,
      group_slug: groupSlug,
      slug: await createAvailableDealerSlug(name, orgId),
    })
    .select('id, name, org_id, slug, group_slug')
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
