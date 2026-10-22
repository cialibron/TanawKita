import { describe, expect, it } from 'vitest'
import { seedState } from './data/seed'
import { ageGate, blockedReason, checkWage, matchScore, userIdFor, usernameFor } from './rules'
import type { JobPost, SkillCard } from './types'

const baseJob: JobPost = {
  id: 'test-job',
  employerId: 'employer-test',
  employerName: 'Test Employer',
  title: 'Test job',
  barangay: '116',
  payAmount: 550,
  payUnit: 'day',
  jobType: 'part-time',
  hoursPerWeek: 24,
  skills: ['Sewing'],
  workers: 1,
  startDate: '2026-11-01',
  minorsAllowed: false,
  status: 'open',
  lat: 7.05,
  lng: 125.57,
}

const baseCard: SkillCard = {
  userId: 'jobseeker-test',
  name: 'Test Worker',
  age: 24,
  barangay: '116',
  skills: ['Sewing'],
  hoursWanted: 24,
  daysAvailable: ['Mon'],
  expectedPay: null,
  guardianConsent: false,
}

describe('ageGate', () => {
  it('blocks under 15, needs consent at 15 to 17, allows 18 and up', () => {
    expect(ageGate(14)).toBe('blocked')
    expect(ageGate(15)).toBe('consent')
    expect(ageGate(17)).toBe('consent')
    expect(ageGate(18)).toBe('ok')
  })
})

describe('checkWage', () => {
  it('checks daily rates against the minimum', () => {
    expect(checkWage(400, 'day').ok).toBe(false)
    expect(checkWage(500, 'day').ok).toBe(true)
  })

  it('converts hourly rates to a day of 8 hours before checking', () => {
    expect(checkWage(62, 'hour').ok).toBe(false) // 496
    expect(checkWage(63, 'hour').ok).toBe(true) // 504
  })

  it('does not block task rates yet', () => {
    expect(checkWage(10, 'task').ok).toBe(true)
  })
})

describe('matchScore', () => {
  it('scores a full match at 100 percent with reasons', () => {
    const result = matchScore(baseJob, baseCard, true)
    expect(result.percent).toBe(100)
    expect(result.reasons).toEqual([
      'Matches 1 of the skills asked',
      'Same barangay',
      'Hours fit what you want',
      'Pay passes the wage check',
      'Verified employer',
    ])
  })

  it('gives no skill points when no skills overlap', () => {
    const result = matchScore(baseJob, { ...baseCard, skills: ['Driving'], barangay: '020', hoursWanted: 40 })
    expect(result.reasons).toEqual(['Pay passes the wage check'])
    expect(result.percent).toBe(10)
  })
})

describe('blockedReason', () => {
  it('blocks closed posts', () => {
    expect(blockedReason({ ...baseJob, status: 'filled' }, baseCard)).not.toBeNull()
  })

  it('blocks workers under 18 from jobs that do not allow minors', () => {
    expect(blockedReason(baseJob, { ...baseCard, age: 16, guardianConsent: true })).not.toBeNull()
  })

  it('allows workers under 18 for jobs that allow minors', () => {
    expect(blockedReason({ ...baseJob, minorsAllowed: true }, { ...baseCard, age: 16, guardianConsent: true })).toBeNull()
  })
})

describe('userIdFor', () => {
  it('builds a stable id from role and name', () => {
    expect(userIdFor('employer', "Lola Nena's Kitchen")).toBe('employer-lola-nena-s-kitchen')
    expect(userIdFor('jobseeker', '  Ana Reyes ')).toBe('jobseeker-ana-reyes')
  })
})

describe('seed data', () => {
  it('uses ids that match the login rule, so seeded records link to logins', () => {
    for (const job of seedState.jobs) {
      expect(job.employerId).toBe(userIdFor('employer', job.employerName))
    }
    for (const card of Object.values(seedState.skillCards)) {
      expect(card.userId).toBe(userIdFor('jobseeker', card.name))
    }
  })
})

describe('usernameFor', () => {
  it('turns a user id into a short handle', () => {
    expect(usernameFor('jobseeker-ana-reyes')).toBe('@ana.reyes')
    expect(usernameFor('employer-kusina-ni-aling-rosa')).toBe('@kusina.ni.aling.rosa')
  })
})
