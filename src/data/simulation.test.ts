import { describe, expect, it } from 'vitest'
import { jobseekerSheet, syntheticBusinesses, syntheticJobseekers } from './simulation'
import { seedState } from './seed'

describe('CSV-backed synthetic simulation data', () => {
  it('loads the separate businesses and jobseeker sheets into the demo seed', () => {
    expect(syntheticBusinesses).toHaveLength(60)
    expect(jobseekerSheet).toHaveLength(202)
    expect(new Set(syntheticBusinesses.map((business) => business.id)).size).toBe(60)
    expect(new Set(jobseekerSheet.map((person) => person.card.userId)).size).toBe(202)
  })

  it('keeps only Viola Co and Ana Reyes as selectable demo jobseekers; the rest are background profiles', () => {
    expect(syntheticJobseekers.map((card) => card.name)).toEqual(['Viola Co', 'Ana Reyes'])
    const background = jobseekerSheet.filter((person) => !person.selectable)
    expect(background).toHaveLength(200)
    expect(background.every(({ card }) => !seedState.skillCards[card.userId] && !seedState.names[card.userId])).toBe(true)
  })

  it('gives every sheet profile a point inside Davao City and an allowed age', () => {
    for (const { card, point } of jobseekerSheet) {
      expect(point[0]).toBeGreaterThan(6.9)
      expect(point[0]).toBeLessThan(7.62)
      expect(point[1]).toBeGreaterThan(125.2)
      expect(point[1]).toBeLessThan(125.8)
      expect(card.age).toBeGreaterThanOrEqual(15)
      expect(card.age).toBeLessThanOrEqual(60)
      if (card.age < 18) expect(card.guardianConsent).toBe(true)
    }
  })

  it('adds the CSV records alongside the existing seed records', () => {
    expect(syntheticBusinesses.every(({ id }) => seedState.businesses[id])).toBe(true)
    expect(syntheticJobseekers.every(({ userId }) => seedState.skillCards[userId])).toBe(true)
    expect(seedState.jobs.some((job) => job.id.startsWith('SYN-JOB-'))).toBe(true)
  })

  it('creates diverse jobs and keeps richer jobseeker context', () => {
    const jobs = syntheticBusinesses.flatMap((business) => business.jobs)
    // One job offer per role a hiring business lists.
    const hiringRoles = syntheticBusinesses.filter(({ business }) => business.currentlyHiring).flatMap(({ business }) => business.rolesHiring ?? [])
    expect(jobs.length).toBe(hiringRoles.length)
    expect(new Set(jobs.map((job) => job.jobType)).size).toBeGreaterThan(1)
    expect(syntheticJobseekers.some((person) => person.preferredRoles?.length)).toBe(true)
  })
})
