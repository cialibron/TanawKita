import { barangayName } from './data/barangays'
import { syntheticBusinesses } from './data/simulation'

export type BusinessCategoryId =
  | 'cafe'
  | 'restaurant'
  | 'bakery'
  | 'grocery'
  | 'pharmacy'
  | 'laundry'
  | 'salon'
  | 'construction'
  | 'delivery'
  | 'agriculture'
  | 'repair'
  | 'education'
  | 'digital-services'
  | 'hospitality'
export type CompetitorSearchMode = 'local' | 'city'

export interface BusinessCategory {
  id: BusinessCategoryId
  label: string
  csvCategory: string
}

export interface CompetitorPlace {
  id: string
  name: string
  category: BusinessCategoryId
  lat: number
  lng: number
  address: string
  distanceKm?: number
  source: 'synthetic-simulation'
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  { id: 'cafe', label: 'Cafés', csvCategory: 'Cafe / coffee shop' },
  { id: 'restaurant', label: 'Restaurants & carinderias', csvCategory: 'Restaurant / carinderia' },
  { id: 'bakery', label: 'Bakeries', csvCategory: 'Bakery' },
  { id: 'grocery', label: 'Groceries & mini-marts', csvCategory: 'Grocery / mini-mart' },
  { id: 'pharmacy', label: 'Pharmacies', csvCategory: 'Pharmacy / health retail' },
  { id: 'laundry', label: 'Laundry shops', csvCategory: 'Laundry shop' },
  { id: 'salon', label: 'Salons & barbershops', csvCategory: 'Salon / barbershop' },
  { id: 'construction', label: 'Construction contractors', csvCategory: 'Construction contractor' },
  { id: 'delivery', label: 'Delivery & courier businesses', csvCategory: 'Delivery / courier' },
  { id: 'agriculture', label: 'Farms & growers co-ops', csvCategory: 'Farm / growers cooperative' },
  { id: 'repair', label: 'Repair shops', csvCategory: 'Motor / appliance repair' },
  { id: 'education', label: 'Learning & childcare centers', csvCategory: 'Learning / childcare center' },
  { id: 'digital-services', label: 'Printing & digital services', csvCategory: 'Printing / computer shop' },
  { id: 'hospitality', label: 'Small inns & lodging', csvCategory: 'Small inn / lodging' },
]

export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// Search the separate synthetic business sheet so the demo works offline and always has visible competitors.
// Results are explicitly identified as simulation examples in the interface, not real business listings.
export async function searchCompetitors({
  category,
  mode,
  center,
  radiusKm,
}: {
  category: BusinessCategory
  mode: CompetitorSearchMode
  center: [number, number]
  radiusKm: number
  signal?: AbortSignal
  force?: boolean
}): Promise<CompetitorPlace[]> {
  const places: CompetitorPlace[] = syntheticBusinesses
    .filter((entry) => entry.business.category === category.csvCategory)
    .map((entry) => {
      const point: [number, number] = [entry.business.lat, entry.business.lng]
      const distance = distanceKm(center, point)
      return {
        id: entry.id,
        name: entry.name,
        category: category.id,
        lat: point[0],
        lng: point[1],
        address: barangayName(entry.business.barangay),
        ...(mode === 'local' ? { distanceKm: distance } : {}),
        source: 'synthetic-simulation' as const,
      }
    })
    .filter((place) => mode === 'city' || (place.distanceKm ?? Infinity) <= radiusKm)

  return places.sort((a, b) => mode === 'local'
    ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    : a.name.localeCompare(b.name))
}
