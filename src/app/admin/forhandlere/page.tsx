import { Suspense } from 'react'
import { requireAdminUser } from '@/lib/admin-auth'
import { getAdminDealers } from '@/lib/admin-data'
import { dealerGroupList } from '@/lib/car-groups'
import { AdminShell } from '../admin-shell'
import { AdminUserManagementView } from '../admin-client'

export default function AdminDealersPage() {
  return (
    <Suspense fallback={<AdminDealersLoading />}>
      <AdminDealersDashboard />
    </Suspense>
  )
}

function AdminDealersLoading() {
  return (
    <main className="min-h-screen bg-[#e8eef4] px-5 py-6 text-sm text-slate-500">
      Laster ...
    </main>
  )
}

async function AdminDealersDashboard() {
  const [adminUser, dealers] = await Promise.all([
    requireAdminUser(),
    getAdminDealers(),
  ])
  const carGroups = dealerGroupList.map((group) => ({
    slug: group.slug,
    name: group.name,
  }))

  return (
    <AdminShell activeSection="dealers" userEmail={adminUser.email}>
      <AdminUserManagementView carGroups={carGroups} dealers={dealers} />
    </AdminShell>
  )
}
