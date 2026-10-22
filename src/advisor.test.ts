import { describe, expect, it } from 'vitest'
import { adviseBusinesses, IDEAS } from './advisor'
import { areaStats, barangaysWithin } from './area'
import { BARANGAY_CENTERS } from './data/barangayGeo'
import { distanceKm } from './rules'

describe('distanceKm', () => {
  it('is zero for the same point and about 111 km per degree of latitude', () => {
    expect(distanceKm([7, 125], [7, 125])).toBe(0)
    expect(distanceKm([7, 125], [8, 125])).toBeCloseTo(111.2, 0)
  })
})

describe('area', () => {
  it('includes the barangay itself and adds up CBMS totals', () => {
    const codes = barangaysWithin(BARANGAY_CENTERS['116'], 3)
    expect(codes).toContain('116')
    expect(areaStats(codes).jobseekerPool).toBeGreaterThanOrEqual(2165)
  })
})

describe('adviseBusinesses', () => {
  it('returns ideas best first, all within budget', () => {
    const result = adviseBusinesses({ barangay: '116', budget: 'low', skills: ['Sewing'], hireSize: 'small' })!
    expect(result.suggestions.length).toBeGreaterThan(0)
    expect(result.suggestions.every((s) => s.idea.startCost <= 20_000)).toBe(true)
    const scores = result.suggestions.map((s) => s.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })

  it('ranks an idea higher when it uses the owner skills', () => {
    const tailoringScore = (skills: string[]) =>
      adviseBusinesses({ barangay: '116', budget: 'high', skills, hireSize: 'small' })!.suggestions.find(
        (s) => s.idea.id === 'tailoring',
      )!.score
    expect(tailoringScore(['Sewing'])).toBeGreaterThan(tailoringScore([]))
    expect(IDEAS.length).toBeGreaterThan(3)
  })
})
