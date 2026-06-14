import CarCarousel from '@/components/CarCarousel'
import { prepareCarouselCars } from '@/lib/car-carousel'
import { carGroups } from '@/lib/car-groups'
import { embedRoutes } from '@/lib/embed-routes'
import { fetchBruktbilTrondelagCars } from '@/lib/finn-api'

export default async function EmbedBruktbilTrondelagPage() {
  const embed = embedRoutes['bruktbil-trondelag']
  const group = carGroups[embed.groupSlug]
  const cars = await fetchBruktbilTrondelagCars()

  return (
    <main className="min-h-screen bg-white">
      <CarCarousel
        title={group.name}
        description={group.description}
        href={group.path}
        cars={prepareCarouselCars(cars)}
        groupSlug={embed.groupSlug}
        embedSlug={embed.slug}
        trackAnalytics
      />
    </main>
  )
}
