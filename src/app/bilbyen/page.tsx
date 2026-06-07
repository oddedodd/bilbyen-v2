import CarList from '@/components/CarList'
import { fetchBilbyenCars } from '@/lib/finn-api'
import { carGroups } from '@/lib/car-groups'

export default async function Page() {
  const group = carGroups.bilbyen
  const cars = await fetchBilbyenCars()

  return (
    <CarList cars={cars} title={group.name} description={group.description} />
  )
}
