import CarList from '@/components/CarList'
import { carGroups } from '@/lib/car-groups'
import { fetchBruktbilTrondelagCars } from '@/lib/finn-api'

export default async function Page() {
  const group = carGroups['bruktbil-trondelag']
  const cars = await fetchBruktbilTrondelagCars()

  return (
    <CarList
      cars={cars}
      groupSlug={group.slug}
      title={group.name}
      description={group.description}
    />
  )
}
