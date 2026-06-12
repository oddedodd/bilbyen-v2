import { Suspense } from 'react'
import { requireAdminUser } from '@/lib/admin-auth'
import { AdminShell } from '../admin-shell'

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

  return (
    <AdminShell activeSection="settings" userEmail={adminUser.email}>
      <section className="px-6 py-6 lg:px-8">
        <div>
          <h2 className="font-serif text-2xl font-bold leading-none text-[#0b263f]">
            Innstillinger
          </h2>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500 shadow-sm">
          Ingen innstillinger er lagt til ennå.
        </div>
      </section>
    </AdminShell>
  )
}
