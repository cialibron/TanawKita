// How job posts are pinned on a job map, shared by Find jobs, My applications and the PESO admin map: hiring
// businesses as callouts over glowing circles, and pay tags for jobs posted away from their business.
import { employerPlaces, type CompetitorPlace } from '../businessDirectory'
import { distanceKm } from '../rules'
import type { JobPost } from '../types'

export function payLabel(job: JobPost): string {
  const unit = job.payUnit === 'task' ? 'task (pakyaw)' : job.payUnit
  return `₱${job.payAmount.toLocaleString()} / ${unit}`
}

// Callouts show over their dots from about 3x closer than the map's starting zoom (14 + log2(3)).
export const CALLOUT_ZOOM = 14 + Math.log2(3)

// Map places per set of hiring employers. Kept stable between renders so the map does not redraw its areas.
const placesCache = new Map<string, CompetitorPlace[]>()
export function placesFor(employerIds: string[]): CompetitorPlace[] {
  const key = [...new Set(employerIds)].sort().join('|')
  if (!placesCache.has(key)) placesCache.set(key, employerPlaces(key.split('|')))
  return placesCache.get(key)!
}

export interface JobPins {
  // Every simulation business behind the jobs, for the detail panel's "About the business".
  places: CompetitorPlace[]
  // Businesses drawn as callouts, and the jobs reached through them.
  businessPlaces: CompetitorPlace[]
  jobsAtBusiness: JobPost[]
  // Jobs posted somewhere else, each with its own pay tag.
  mapJobs: JobPost[]
}

// A job at its business (every demo-sheet job, or one posted within 150 m) is reached through that business's
// callout; a job posted somewhere else keeps its own pay tag.
export function jobPins(jobs: JobPost[]): JobPins {
  const places = placesFor(jobs.map((job) => job.employerId))
  const isAtBusiness = (job: JobPost) => {
    const place = places.find((item) => item.id === job.employerId)
    return Boolean(place && (job.id.startsWith('SYN-JOB-') || distanceKm([job.lat, job.lng], [place.lat, place.lng]) <= 0.15))
  }
  const jobsAtBusiness = jobs.filter(isAtBusiness)
  return {
    places,
    businessPlaces: places.filter((place) => jobsAtBusiness.some((job) => job.employerId === place.id)),
    jobsAtBusiness,
    mapJobs: jobs.filter((job) => !isAtBusiness(job)),
  }
}

// The simulation profile behind a job's employer, if it has one.
export function businessFor(job: JobPost) {
  return placesFor([job.employerId])[0]?.profile
}
