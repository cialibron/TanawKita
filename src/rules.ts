import type { JobPost, PayUnit, Role, SkillCard } from './types'

// PLACEHOLDER: not the DOLE Region XI figure. Replace with the current wage order before any real use.
export const DAILY_MINIMUM_PLACEHOLDER = 500
export const HOURS_PER_WORKDAY = 8
export const HOURS_TOLERANCE = 10

// PLACEHOLDER: replace with the TESDA NC II competency list.
export const SKILLS = [
  'Carpentry',
  'Masonry',
  'Electrical',
  'Welding',
  'Food preparation',
  'Sewing',
  'Driving',
  'Sales',
  'Customer service',
  'Computer literacy',
  'Agriculture',
  'Housekeeping',
]

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function userIdFor(role: Role, name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${role}-${slug}`
}

export type AgeGate = 'blocked' | 'consent' | 'ok'

export function ageGate(age: number): AgeGate {
  if (age < 15) return 'blocked'
  if (age < 18) return 'consent'
  return 'ok'
}

export interface WageCheck {
  ok: boolean
  message: string
}

export function checkWage(amount: number, unit: PayUnit): WageCheck {
  if (unit === 'task') {
    return { ok: true, message: 'Task rate: not checked yet (no reference range loaded).' }
  }
  const daily = unit === 'day' ? amount : amount * HOURS_PER_WORKDAY
  if (daily < DAILY_MINIMUM_PLACEHOLDER) {
    return {
      ok: false,
      message: `Below the daily minimum of ₱${DAILY_MINIMUM_PLACEHOLDER} (placeholder rate). Raise the pay to post.`,
    }
  }
  return { ok: true, message: 'Pay meets the minimum.' }
}

export interface MatchResult {
  percent: number
  reasons: string[]
}

// Weights from the plan: skills 40, distance 25, hours 15, pay 10, verified employer 10.
export function matchScore(job: JobPost, card: SkillCard, employerVerified = false): MatchResult {
  let points = 0
  const reasons: string[] = []

  const overlap = job.skills.filter((s) => card.skills.includes(s)).length
  if (job.skills.length > 0 && overlap > 0) {
    points += Math.round((40 * overlap) / job.skills.length)
    reasons.push(`Matches ${overlap} of the skills asked`)
  }
  if (job.barangay === card.barangay) {
    points += 25
    reasons.push('Same barangay')
  }
  if (Math.abs(job.hoursPerWeek - card.hoursWanted) <= HOURS_TOLERANCE) {
    points += 15
    reasons.push('Hours fit what you want')
  }
  if (checkWage(job.payAmount, job.payUnit).ok) {
    points += 10
    reasons.push('Pay passes the wage check')
  }

  if (employerVerified) {
    points += 10
    reasons.push('Verified employer')
  }

  return { percent: points, reasons }
}

// Returns why a worker cannot apply, or null when they can.
export function blockedReason(job: JobPost, card: SkillCard): string | null {
  if (job.status !== 'open') return 'This post is no longer open.'
  if (card.age < 18 && !job.minorsAllowed) return 'This job is not open to workers under 18.'
  return null
}

// Straight-line distance in km (haversine). Good enough for "near me" lists.
export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[0] - a[0])
  const dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// Short handle shown in test mode, e.g. jobseeker-ana-reyes -> @ana.reyes
export function usernameFor(userId: string): string {
  return `@${userId.replace(/^(jobseeker|employer)-/, '').replace(/-/g, '.')}`
}
