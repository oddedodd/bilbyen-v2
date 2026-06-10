'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminUser, isAdminEmail } from '@/lib/admin-auth'
import { normalizeCarGroupSlug } from '@/lib/car-groups'
import {
  normalizeDealerRole,
  slugifyDealerName,
} from '@/lib/admin-data'
import { createSupabaseServerClient } from '@/lib/supabase-auth'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export interface AdminActionState {
  ok: boolean | null
  message: string
}

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

export async function createDealer(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdminUser()

  const dealerName = readFormString(formData, 'dealerName')
  const orgId = readFormString(formData, 'orgId')
  const groupSlug = normalizeCarGroupSlug(formData.get('groupSlug'))

  if (!dealerName || !orgId) {
    return actionError('Alle feltene må fylles ut.')
  }

  const { data: dealer, error: dealerError } = await upsertDealer({
    name: dealerName,
    orgId,
    groupSlug,
  })

  if (dealerError || !dealer) {
    return actionError('Kunne ikke lagre firma.')
  }

  revalidatePath('/admin')

  return actionSuccess('Forhandleren ble lagret.')
}

export async function createDealerUser(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdminUser()

  const dealerId = readFormString(formData, 'dealerId')
  const email = readFormString(formData, 'email').toLowerCase()
  const password = readFormString(formData, 'password')
  const role = normalizeDealerRole(formData.get('role'))

  if (!dealerId || !email || !password) {
    return actionError('Alle feltene må fylles ut.')
  }

  if (password.length < 8) {
    return actionError('Passord må være minst 8 tegn.')
  }

  const supabase = createSupabaseAdminClient()
  const { data: dealer, error: dealerError } = await supabase
    .from('dealers')
    .select('id, name')
    .eq('id', dealerId)
    .single()

  if (dealerError || !dealer) {
    return actionError('Kunne ikke finne forhandleren.')
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
    return actionError('E-postadressen finnes allerede i Supabase Auth.')
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
    return actionError('Brukeren ble opprettet, men kunne ikke kobles til firma.')
  }

  revalidatePath('/admin')

  return actionSuccess('Brukeren ble opprettet.')
}

export async function updateDealerUser(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdminUser()

  const userId = readFormString(formData, 'userId')
  const dealerId = readFormString(formData, 'dealerId')
  const email = readFormString(formData, 'email').toLowerCase()
  const password = readFormString(formData, 'password')
  const role = normalizeDealerRole(formData.get('role'))

  if (!userId || !dealerId || !email) {
    return actionError('Alle feltene må fylles ut.')
  }

  if (password && password.length < 8) {
    return actionError('Passord må være minst 8 tegn.')
  }

  const supabase = createSupabaseAdminClient()
  const { data: dealer, error: dealerError } = await supabase
    .from('dealers')
    .select('id, name')
    .eq('id', dealerId)
    .single()

  if (dealerError || !dealer) {
    return actionError('Kunne ikke finne forhandleren.')
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
    return actionError('Kunne ikke lagre brukeren.')
  }

  const { error: deleteMembershipsError } = await supabase
    .from('dealer_users')
    .delete()
    .eq('user_id', userId)

  if (deleteMembershipsError) {
    return actionError('Kunne ikke oppdatere forhandlertilknytningen.')
  }

  const { error: membershipError } = await supabase
    .from('dealer_users')
    .insert({
      dealer_id: dealerId,
      user_id: userId,
      role,
    })

  if (membershipError) {
    return actionError('Kunne ikke oppdatere forhandlertilknytningen.')
  }

  revalidatePath('/admin')

  return actionSuccess('Brukeren ble oppdatert.')
}

export async function deleteDealerUser(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const adminUser = await requireAdminUser()
  const userId = readFormString(formData, 'userId')

  if (!userId) {
    return actionError('Mangler bruker som skal slettes.')
  }

  if (userId === adminUser.id) {
    return actionError('Du kan ikke slette din egen adminbruker.')
  }

  const supabase = createSupabaseAdminClient()
  const { error: membershipError } = await supabase
    .from('dealer_users')
    .delete()
    .eq('user_id', userId)

  if (membershipError) {
    return actionError('Kunne ikke fjerne forhandlertilknytningen.')
  }

  const { error: userError } = await supabase.auth.admin.deleteUser(userId)

  if (userError) {
    return actionError('Kunne ikke slette brukeren.')
  }

  revalidatePath('/admin')

  return actionSuccess('Brukeren ble slettet.')
}

export async function updateDealerGroup(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdminUser()

  const dealerId = readFormString(formData, 'dealerId')
  const groupSlug = normalizeCarGroupSlug(formData.get('groupSlug'))

  if (!dealerId) {
    return actionError('Mangler forhandler.')
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('dealers')
    .update({ group_slug: groupSlug })
    .eq('id', dealerId)

  if (error) {
    return actionError('Kunne ikke lagre firma.')
  }

  revalidatePath('/admin')

  return actionSuccess('Gruppen ble oppdatert.')
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

function actionSuccess(message: string): AdminActionState {
  return { ok: true, message }
}

function actionError(message: string): AdminActionState {
  return { ok: false, message }
}
