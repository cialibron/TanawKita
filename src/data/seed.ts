import type { AppState, Business } from '../types'
import type { Verification } from '../verification'
import { mockApplications } from './mockEmployers'
import { syntheticBusinesses, syntheticJobseekers } from './simulation'

// Demo records for local testing only, all read from simulation-data/. Five fictional businesses
// (Mandug, Buhangin, Puan, Roxas Ave, Matina) and two fictional jobseekers (Viola Co, Ana Reyes).
// Map pins are approximate simulation points, not real addresses.
const businesses: Record<string, Business> = {}
const verifications: Record<string, Verification> = {}
for (const e of syntheticBusinesses) {
  businesses[e.id] = e.business
  verifications[e.id] = e.verification
}
const jobs = syntheticBusinesses.flatMap((e) => e.jobs)
const cards = syntheticJobseekers

export const seedState: AppState = {
  view: 'jobseeker',
  jobseekerId: cards[0].userId,
  employerId: syntheticBusinesses[0].id,
  names: Object.fromEntries([
    ...cards.map((c) => [c.userId, c.name]),
    ...syntheticBusinesses.map((e) => [e.id, e.name]),
  ]),
  skillCards: Object.fromEntries(cards.map((c) => [c.userId, c])),
  businesses,
  verifications,
  jobs,
  applications: mockApplications(jobs, cards),
}
