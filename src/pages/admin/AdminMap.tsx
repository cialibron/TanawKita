import { useMemo } from 'react'
import JobMap from '../../components/JobMap'
import { employerPlaces } from '../../businessDirectory'
import { distanceKm } from '../../rules'
import type { JobPost } from '../../types'

// PESO admin map: the same business callouts as the jobseeker and employer maps, for every business with an open
// job. A job posted away from its business (more than 150 m) keeps its own pay tag.
export default function AdminMap({ jobs }: { jobs: JobPost[] }) {
  const employerKey = [...new Set(jobs.map((job) => job.employerId))].sort().join('|')
  const places = useMemo(() => (employerKey ? employerPlaces(employerKey.split('|')) : []), [employerKey])
  const awayJobs = jobs.filter((job) => {
    const place = places.find((item) => item.id === job.employerId)
    return !place || distanceKm([job.lat, job.lng], [place.lat, place.lng]) > 0.15
  })
  return <JobMap fill jobs={awayJobs} places={places} />
}
