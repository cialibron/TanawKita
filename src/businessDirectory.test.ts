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

  it('returns local and city-wide cafe simulation competitors without network access', async () => {
    const cafe = BUSINESS_CATEGORIES.find((category) => category.id === 'cafe')!
    const local = await searchCompetitors({ category: cafe, mode: 'local', center: [7.0545, 125.5745], radiusKm: 3 })
    const city = await searchCompetitors({ category: cafe, mode: 'city', center: [7.0545, 125.5745], radiusKm: 3 })
    expect(local.length).toBeGreaterThan(0)
    expect(city.length).toBeGreaterThan(local.length)
    expect(local.every((place) => place.source === 'synthetic-simulation')).toBe(true)
  })
})
