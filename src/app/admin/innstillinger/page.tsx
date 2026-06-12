import { Suspense } from 'react'
import { requireAdminUser } from '@/lib/admin-auth'
import { getAdminUsers, type AdminUser } from '@/lib/admin-data'
import { AdminShell } from '../admin-shell'
import { AdminSettingsView } from '../settings-client'

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<AdminSettingsLoading />}>
      <AdminSettingsDashboard />
    </Suspense>
  )
}

function AdminSettingsLoading() {
  return (
    <main className="min-h-screen bg-[#e8eef4] px-5 py-6 text-sm text-slate-500">
      Laster ...
    </main>
  )
}

async function AdminSettingsDashboard() {
  const adminUser = await requireAdminUser()
  let adminUsers: AdminUser[] = []
  let adminUsersError: string | undefined

  try {
    adminUsers = await getAdminUsers()
  } catch {
    adminUsersError =
      'Administratorlisten kan ikke leses. Kontroller at migrasjonen for admin_users er kjørt i Supabase.'
  }

  return (
    <AdminShell activeSection="settings" userEmail={adminUser.email}>
      <AdminSettingsView
        adminUsers={adminUsers}
        adminUsersError={adminUsersError}
        currentUserId={adminUser.id}
      />
    </AdminShell>
  )
}
