import { describe, expect, it } from 'vitest'
import { checkWage } from '../rules'
import { hasEmployerNumbers, validate } from '../verification'
import { seedState } from './seed'
import { syntheticBusinesses } from './simulation'

// The mock data should follow the same rules the app enforces on real users.
describe('seed data', () => {
  const jobs = seedState.jobs

  it('has the 60 demo businesses, two selectable jobseekers, their jobs and applications', () => {
    expect(Object.keys(seedState.verifications).length).toBe(60)
    expect(Object.values(seedState.skillCards).map((c) => c.name).sort()).toEqual(['Ana Reyes', 'Viola Co'])
    expect(jobs.length).toBe(syntheticBusinesses.flatMap((business) => business.jobs).length)
    expect(seedState.applications.length).toBeGreaterThan(0)
  })

  it('gives every employer with jobs a name, business location and verification record', () => {
    for (const job of jobs) {
      expect(seedState.names[job.employerId]).toBeDefined()
      expect(seedState.businesses[job.employerId]).toBeDefined()
      expect(seedState.verifications[job.employerId]).toBeDefined()
    }
  })

  it('only posts pay that passes the wage check', () => {
    expect(jobs.filter((j) => !checkWage(j.payAmount, j.payUnit).ok)).toEqual([])
  })

  it('follows the employer rules: individuals post short-term only; regular jobs need SSS, PhilHealth and Pag-IBIG', () => {
    for (const job of jobs) {
      const v = seedState.verifications[job.employerId]
      if (v.kind === 'individual') expect(job.jobType).toBe('short-term')
      if (job.jobType !== 'short-term') expect(hasEmployerNumbers(v)).toBe(true)
    }
  })

  it('has complete verification records', () => {
    for (const v of Object.values(seedState.verifications)) expect(validate(v)).toEqual([])
  })

  it('gives every application a real date', () => {
    for (const app of seedState.applications) expect(Number.isNaN(Date.parse(app.appliedAt))).toBe(false)
  })

  it('never has a minor applying to an adults-only job', () => {
    for (const app of seedState.applications) {
      const job = jobs.find((j) => j.id === app.jobId)!
      const card = seedState.skillCards[app.userId]
      expect(card.age >= 18 || job.minorsAllowed).toBe(true)
    }
  })
})
