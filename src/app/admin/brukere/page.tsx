import { Suspense } from 'react'
import { requireAdminUser } from '@/lib/admin-auth'
import { carGroupList } from '@/lib/car-groups'
import { getAdminDealers } from '@/lib/admin-data'
import { AdminUserManagementView } from '../admin-client'
import { AdminShell } from '../admin-shell'

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<AdminUsersLoading />}>
      <AdminUsersDashboard />
    </Suspense>
  )
}

function AdminUsersLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-500">
        Laster ...
      </div>
    </main>
  )
}

async function AdminUsersDashboard() {
  const [adminUser, dealers] = await Promise.all([
    requireAdminUser(),
    getAdminDealers(),
  ])
  const carGroups = carGroupList.map((group) => ({
    slug: group.slug,
    name: group.name,
  }))

  return (
    <AdminShell activeSection="users" userEmail={adminUser.email}>
      <AdminUserManagementView carGroups={carGroups} dealers={dealers} />
    </AdminShell>
  )
}
