import CarCarousel from '@/components/CarCarousel'
import {
  fetchBilbyenCars,
  fetchBruktbilTrondelagCars,
} from '@/lib/finn-api'
import { carGroups } from '@/lib/car-groups'

export default async function Page() {
  const [bilbyenCars, bruktbilTrondelagCars] = await Promise.all([
    fetchBilbyenCars(),
    fetchBruktbilTrondelagCars(),
  ])

  const bilbyen = carGroups.bilbyen
  const bruktbilTrondelag = carGroups['bruktbil-trondelag']

  return (
    <main className="min-h-screen bg-white py-6">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-950">
          Bruktbiler
        </h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Finn bruktbiler fra lokale forhandlere i Bilbyen Namsos og Bruktbil
          Trøndelag.
        </p>
      </div>

      <CarCarousel
        title={bilbyen.name}
        description={bilbyen.description}
        href={bilbyen.path}
        cars={bilbyenCars}
      />
      <CarCarousel
        title={bruktbilTrondelag.name}
        description={bruktbilTrondelag.description}
        href={bruktbilTrondelag.path}
        cars={bruktbilTrondelagCars}
      />
    </main>
  )
}
