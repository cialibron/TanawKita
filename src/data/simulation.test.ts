import { describe, expect, it } from 'vitest'
import { syntheticBusinesses, syntheticJobseekers } from './simulation'
import { seedState } from './seed'

describe('CSV-backed synthetic simulation data', () => {
  it('loads the separate businesses and jobseeker sheets into the demo seed', () => {
    expect(syntheticBusinesses).toHaveLength(300)
    expect(syntheticJobseekers).toHaveLength(300)
    expect(new Set(syntheticBusinesses.map((business) => business.id)).size).toBe(300)
    expect(new Set(syntheticJobseekers.map((person) => person.userId)).size).toBe(300)
  })

  it('adds the CSV records alongside the existing seed records', () => {
    expect(syntheticBusinesses.every(({ id }) => seedState.businesses[id])).toBe(true)
    expect(syntheticJobseekers.every(({ userId }) => seedState.skillCards[userId])).toBe(true)
    expect(seedState.jobs.some((job) => job.id.startsWith('SYN-JOB-'))).toBe(true)
  })

  it('creates diverse jobs and keeps richer jobseeker context', () => {
    const jobs = syntheticBusinesses.flatMap((business) => business.jobs)
    expect(jobs.length).toBeGreaterThan(50)
    expect(new Set(jobs.map((job) => job.jobType)).size).toBeGreaterThan(1)
    expect(syntheticJobseekers.some((person) => person.certifications?.length)).toBe(true)
    expect(syntheticJobseekers.some((person) => person.preferredRoles?.length)).toBe(true)
  })
})
