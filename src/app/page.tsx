import { fetchFinnCars } from '@/lib/finn-api'
import CarList from '@/components/CarList'

export default async function Page() {
  const cars = await fetchFinnCars()
  return <CarList cars={cars} />
}
