import { describe, expect, it } from 'vitest'
import { areaStats, jobseekerHeat, seekersWithin, systemJobseekers } from './area'
import { jobseekerSheet } from './data/simulation'
import { seedState } from './data/seed'
import type { SkillCard } from './types'

const CITY_HALL: [number, number] = [7.0731, 125.6128]

describe('employer area counts from demo jobseeker profiles', () => {
  it('counts every sheet profile once, plus profiles made in the app', () => {
    const made: SkillCard = { ...seedState.skillCards[Object.keys(seedState.skillCards)[0]], userId: 'jobseeker-new-tester', name: 'New Tester' }
    expect(systemJobseekers(seedState.skillCards)).toHaveLength(jobseekerSheet.length)
    expect(systemJobseekers({ ...seedState.skillCards, [made.userId]: made })).toHaveLength(jobseekerSheet.length + 1)
  })

  it('uses one heat point per profile, at its sheet point', () => {
    const pins = systemJobseekers(seedState.skillCards)
    const heat = jobseekerHeat(pins)
    expect(heat).toHaveLength(pins.length)
    expect(heat[0]).toEqual([pins[0].point[0], pins[0].point[1], 1])
  })

  it('counts by real distance, so a wider radius never counts fewer people', () => {
    const pins = systemJobseekers(seedState.skillCards)
    const near = seekersWithin(pins, CITY_HALL, 1)
    const far = seekersWithin(pins, CITY_HALL, 5)
    expect(near.every((p) => p.km <= 1)).toBe(true)
    expect(far.length).toBeGreaterThan(near.length)
    const stats = areaStats(far)
    expect(stats.lookingForWork).toBe(far.length)
    expect(stats.unemployed + stats.underemployed).toBeLessThanOrEqual(stats.lookingForWork)
    expect(stats.idleYouth).toBeLessThanOrEqual(stats.unemployed)
    expect(new Set(stats.barangays).size).toBe(stats.barangays.length)
  })
})
