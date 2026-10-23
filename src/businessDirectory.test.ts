import { describe, expect, it } from 'vitest'
import { BUSINESS_CATEGORIES, distanceKm, searchCompetitors } from './businessDirectory'

describe('competitor directory helpers', () => {
  it('includes cafe listings as the default business category', () => {
    expect(BUSINESS_CATEGORIES.find((category) => category.id === 'cafe')?.csvCategory).toBe('Cafe / coffee shop')
  })

  it('calculates local competitor distance in kilometers', () => {
    expect(distanceKm([7.0731, 125.6128], [7.0731, 125.6128])).toBe(0)
    expect(distanceKm([7.0731, 125.6128], [7.0831, 125.6128])).toBeCloseTo(1.11, 1)
  })

  // Buhangin and Roxas Ave both have a printing shop in the five-business demo sheet.
  it('returns local and city-wide simulation competitors without network access', async () => {
    const printing = BUSINESS_CATEGORIES.find((category) => category.csvCategory === 'Printing / computer shop')!
    const local = await searchCompetitors({ category: printing, mode: 'local', center: [7.1748, 125.5836], radiusKm: 3 })
    const city = await searchCompetitors({ category: printing, mode: 'city', center: [7.1748, 125.5836], radiusKm: 3 })
    expect(local.length).toBeGreaterThan(0)
    expect(city.length).toBeGreaterThan(local.length)
    expect(local.every((place) => place.source === 'synthetic-simulation')).toBe(true)
  })
})
