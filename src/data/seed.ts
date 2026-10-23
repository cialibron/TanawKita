import type { AppState, Application, ApplicationStatus, Business } from '../types'
import type { Verification } from '../verification'
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

// Each jobseeker has applied to the jobs that match their skills and age, with a mix of statuses.
const STATUSES: ApplicationStatus[] = ['applied', 'shortlisted', 'applied', 'hired']
const applications: Application[] = cards.flatMap((card) =>
  jobs
    .filter((job) => card.skills.some((skill) => job.skills.includes(skill)) && (card.age >= 18 || job.minorsAllowed))
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
