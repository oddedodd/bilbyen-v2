import { Suspense } from 'react'
import CarCarousel from '@/components/CarCarousel'
import { requireAdminUser } from '@/lib/admin-auth'
import { prepareCarouselCars } from '@/lib/car-carousel'
import { carGroups } from '@/lib/car-groups'
import {
  fetchBilbyenCars,
  fetchBruktbilTrondelagCars,
} from '@/lib/finn-api'
import { AdminShell } from '../admin-shell'

export default function AdminAdsPage() {
  return (
    <Suspense fallback={<AdminAdsLoading />}>
      <AdminAdsDashboard />
    </Suspense>
  )
}

function AdminAdsLoading() {
  return (
    <main className="min-h-screen bg-[#e8eef4] px-5 py-6 text-sm text-slate-500">
      Laster ...
    </main>
  )
}

async function AdminAdsDashboard() {
  const [adminUser, bilbyenCars, bruktbilTrondelagCars] = await Promise.all([
    requireAdminUser(),
    fetchBilbyenCars(),
    fetchBruktbilTrondelagCars(),
  ])

  const bilbyen = carGroups.bilbyen
  const bruktbilTrondelag = carGroups['bruktbil-trondelag']

  return (
    <AdminShell activeSection="ads" userEmail={adminUser.email}>
      <section className="px-6 py-6 lg:px-8">
        <div className="mb-2">
          <h2 className="font-serif text-2xl font-bold leading-none text-[#0b263f]">
            Annonser
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            De samme karusellene som på forsiden, vist bak admininnlogging.
          </p>
        </div>
      </section>

      <div className="pb-4 [&_section]:py-5">
        <CarCarousel
          title={bilbyen.name}
          description={bilbyen.description}
          href={bilbyen.path}
          cars={prepareCarouselCars(bilbyenCars)}
          groupSlug={bilbyen.slug}
          trackAnalytics={false}
        />
        <CarCarousel
          title={bruktbilTrondelag.name}
          description={bruktbilTrondelag.description}
          href={bruktbilTrondelag.path}
          cars={prepareCarouselCars(bruktbilTrondelagCars)}
          groupSlug={bruktbilTrondelag.slug}
          trackAnalytics={false}
        />
      </div>
    </AdminShell>
  )
}
