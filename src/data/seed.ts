import type { AppState, Application, ApplicationStatus, Business } from '../types'
import type { Verification } from '../verification'
import { syntheticBusinesses, syntheticJobseekers } from './simulation'

// Demo records for local testing only, all read from simulation-data/. 60 fictional businesses and two
// selectable fictional jobseekers (Viola Co, Ana Reyes). The sheet's other jobseeker profiles are background
// data for the employer side (see systemJobseekers in src/area.ts) and are not demo accounts.
// Map pins are approximate simulation points, not real addresses.
const businesses: Record<string, Business> = {}
const verifications: Record<string, Verification> = {}
for (const e of syntheticBusinesses) {
  businesses[e.id] = e.business
  verifications[e.id] = e.verification
}
const jobs = syntheticBusinesses.flatMap((e) => e.jobs)
const cards = syntheticJobseekers

// Each jobseeker has applied to up to APPLICATIONS_EACH jobs that match their skills and age, with a mix of statuses.
const APPLICATIONS_EACH = 6
const STATUSES: ApplicationStatus[] = ['applied', 'shortlisted', 'applied', 'hired']
const applications: Application[] = cards.flatMap((card) =>
  jobs
    .filter((job) => card.skills.some((skill) => job.skills.includes(skill)) && (card.age >= 18 || job.minorsAllowed))
    .slice(0, APPLICATIONS_EACH)
    .map((job, k) => ({
      id: `app-${job.id}-${card.userId}`,
      jobId: job.id,
      userId: card.userId,
      status: STATUSES[k % STATUSES.length],
      appliedAt: `2026-10-${String(10 + k).padStart(2, '0')}T10:00:00.000Z`,
    })),
)

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
  applications,
}
