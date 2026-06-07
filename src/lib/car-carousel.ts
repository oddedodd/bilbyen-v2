import type { Car } from './types'

const MAX_CAROUSEL_CARS_PER_DEALER = 4

export function prepareCarouselCars(cars: Car[]): Car[] {
  const dealerCounts = new Map<string, number>()
  const selected: Car[] = []

  for (const car of cars) {
    const dealerKey = car.orgId ?? car.dealer ?? car.id
    const count = dealerCounts.get(dealerKey) ?? 0

    if (count >= MAX_CAROUSEL_CARS_PER_DEALER) {
      continue
    }

    dealerCounts.set(dealerKey, count + 1)
    selected.push(car)
  }

  return shuffleCars(selected)
}

function shuffleCars(cars: Car[]): Car[] {
  return [...cars].sort((a, b) => getShuffleKey(a) - getShuffleKey(b))
}

function getShuffleKey(car: Car): number {
  return hashString(`${car.id}:${car.orgId ?? ''}:${car.updated ?? ''}`)
}

function hashString(value: string): number {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }

  return hash
}
