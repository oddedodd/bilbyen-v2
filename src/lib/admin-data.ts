import type { User } from '@supabase/supabase-js'
import type { CarGroupSlug } from './car-groups'
import { createSupabaseAdminClient } from './supabase-server'

export type DealerUserRole = 'owner' | 'viewer'

export interface AdminDealer {
  id: string
  orgId: string
  name: string
  slug: string
  groupSlug: CarGroupSlug
  users: AdminDealerUser[]
}

export interface AdminDealerUser {
  userId: string
  email: string
  role: DealerUserRole
}

interface DealerRow {
  id: string
  org_id: string
  name: string
  slug: string
  group_slug: CarGroupSlug
}

interface DealerUserRow {
  dealer_id: string
  user_id: string
  role: DealerUserRole
}

export async function getAdminDealers(): Promise<AdminDealer[]> {
  const supabase = createSupabaseAdminClient()

  const [{ data: dealers, error: dealersError }, { data: dealerUsers, error: dealerUsersError }] =
    await Promise.all([
      supabase
        .from('dealers')
        .select('id, org_id, name, slug, group_slug')
        .order('name'),
      supabase.from('dealer_users').select('dealer_id, user_id, role'),
    ])

  if (dealersError) {
    throw dealersError
  }

  if (dealerUsersError) {
    throw dealerUsersError
  }

  const usersById = await getAuthUsersById()
  const membershipsByDealer = new Map<string, AdminDealerUser[]>()

  for (const membership of (dealerUsers ?? []) as DealerUserRow[]) {
    const user = usersById.get(membership.user_id)
    const users = membershipsByDealer.get(membership.dealer_id) ?? []

    users.push({
      userId: membership.user_id,
      email: user?.email ?? 'Ukjent e-post',
      role: membership.role,
    })
    membershipsByDealer.set(membership.dealer_id, users)
  }

  return ((dealers ?? []) as DealerRow[]).map((dealer) => ({
    id: dealer.id,
    orgId: dealer.org_id,
    name: dealer.name,
    slug: dealer.slug,
    groupSlug: dealer.group_slug,
    users: membershipsByDealer.get(dealer.id) ?? [],
  }))
}

async function getAuthUsersById(): Promise<Map<string, User>> {
  const supabase = createSupabaseAdminClient()
  const usersById = new Map<string, User>()
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

    for (const user of data.users) {
      usersById.set(user.id, user)
    }

    if (data.users.length < perPage) {
      break
    }

    page += 1
  }

  return usersById
}

export function normalizeDealerRole(value: FormDataEntryValue | null): DealerUserRole {
  return value === 'owner' ? 'owner' : 'viewer'
}

export function slugifyDealerName(name: string, orgId: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug ? slug : `dealer-${orgId}`
}
