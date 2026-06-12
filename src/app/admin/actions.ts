'use server'

import type { User } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ensureAdminAccess, requireAdminUser } from '@/lib/admin-auth'
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/admin/login?error=invalid')
  }

  if (!data.user || !(await ensureAdminAccess(data.user))) {
    await supabase.auth.signOut()
    redirect('/admin/login?error=invalid')
  }

  redirect('/admin')
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

export async function changeAdminPassword(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const adminUser = await requireAdminUser()
  const currentPassword = readFormString(formData, 'currentPassword')
  const newPassword = readFormString(formData, 'newPassword')
  const confirmPassword = readFormString(formData, 'confirmPassword')

  if (!adminUser.email || !currentPassword || !newPassword || !confirmPassword) {
    return actionError('Alle feltene må fylles ut.')
  }

  if (newPassword.length < 8) {
    return actionError('Nytt passord må være minst 8 tegn.')
  }

  if (newPassword !== confirmPassword) {
    return actionError('Nytt passord og bekreftelse må være like.')
  }

  const supabase = await createSupabaseServerClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: adminUser.email,
    password: currentPassword,
  })

  if (signInError) {
    return actionError('Nåværende passord er feil.')
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return actionError('Kunne ikke oppdatere passordet.')
  }

  return actionSuccess('Passordet ble oppdatert.')
}

export async function createAdminUser(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const currentAdmin = await requireAdminUser()
  const email = readFormString(formData, 'email').toLowerCase()
  const password = readFormString(formData, 'password')

  if (!email || !password) {
    return actionError('E-post og midlertidig passord må fylles ut.')
  }

  if (password.length < 8) {
    return actionError('Passord må være minst 8 tegn.')
  }

  const supabase = createSupabaseAdminClient()
  let existingAdmin: Awaited<ReturnType<typeof findAdminUserByEmail>>
  let authUser: User | null

  try {
    existingAdmin = await findAdminUserByEmail(email)
    authUser = await findAuthUserByEmail(email)
  } catch {
    return actionError('Kunne ikke kontrollere brukerlisten.')
  }

  if (existingAdmin) {
    return actionError('Denne brukeren er allerede administrator.')
  }

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (error || !data.user) {
      return actionError('Kunne ikke opprette administratorbrukeren.')
    }

    authUser = data.user
  }

  const { error } = await supabase.from('admin_users').insert({
    user_id: authUser.id,
    email,
    created_by: currentAdmin.id,
  })

  if (error) {
    return actionError('Kunne ikke gi brukeren administratortilgang.')
  }

  revalidatePath('/admin/innstillinger')

  return actionSuccess('Administratorbrukeren ble lagt til.')
}

export async function deleteAdminUser(
  _state: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const currentAdmin = await requireAdminUser()
  const userId = readFormString(formData, 'userId')

  if (!userId) {
    return actionError('Mangler administrator som skal fjernes.')
  }

  if (userId === currentAdmin.id) {
    return actionError('Du kan ikke fjerne din egen administratortilgang.')
  }

  const supabase = createSupabaseAdminClient()
  const { count, error: countError } = await supabase
    .from('admin_users')
    .select('user_id', { count: 'exact', head: true })

  if (countError) {
    return actionError('Kunne ikke kontrollere administratorlisten.')
  }

  if ((count ?? 0) <= 1) {
    return actionError('Siste administrator kan ikke fjernes.')
  }

  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('user_id', userId)

  if (error) {
    return actionError('Kunne ikke fjerne administratortilgangen.')
  }

  revalidatePath('/admin/innstillinger')

  return actionSuccess('Administratortilgangen ble fjernet.')
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

async function findAdminUserByEmail(email: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email')

  if (error) {
    throw error
  }

  return (data ?? []).find(
    (adminUser) => adminUser.email.toLowerCase() === email.toLowerCase()
  )
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const supabase = createSupabaseAdminClient()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    const user = data.users.find(
      (authUser) => authUser.email?.toLowerCase() === email.toLowerCase()
    )

    if (user) {
      return user
    }

    if (data.users.length < perPage) {
      return null
    }

    page += 1
  }
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
