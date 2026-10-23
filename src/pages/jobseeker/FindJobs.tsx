import { useMemo, useState, type ReactNode } from 'react'
import JobMap from '../../components/JobMap'
import MapShell, { type WorkspaceNavItem } from '../../components/MapShell'
import { useSession, useStore } from '../../store'
import EyeIcon from '../../components/EyeIcon'
import JobDetail from '../../components/JobDetail'
import { jobPins, payLabel } from '../../components/jobPins'
import { barangayName } from '../../data/barangays'
import { BARANGAY_CENTERS } from '../../data/barangayGeo'
import { blockedReason, distanceKm, matchScore } from '../../rules'
import type { JobPost, JobType, View } from '../../types'
import { VerificationBadge } from '../employer/Verify'
import MyApplications from './MyApplications'
import { STATUS_LABEL, appliedLabel } from './applicationLabels'

// Short uppercase code for a place, like an airport code on a route: "Talomo" -> "TALO", "Barangay 32-D" -> "32D".
function placeCode(name: string): string {
  return name.replace(/^barangay\s+/i, '').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase()
}

const place = (code: string) => barangayName(code).trim()

function startLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

function matchTone(percent: number): string {
  return percent >= 80 ? 'good' : percent >= 50 ? 'fair' : 'low'
}

// Job clusters: jobs within CLUSTER_KM of each other (chained) form one group, named after the barangay with the
// most jobs in it. Grouped from the demo job locations, not official city districts.
const CLUSTER_KM = 3

interface JobCluster {
  id: string
  name: string
  jobIds: Set<string>
  points: [number, number][]
}

function jobClusters(jobs: JobPost[]): JobCluster[] {
  const groups: JobPost[][] = []
  const seen = new Set<string>()
  for (const start of jobs) {
    if (seen.has(start.id)) continue
    seen.add(start.id)
    const group = [start]
    for (let i = 0; i < group.length; i++) {
      for (const other of jobs) {
        if (seen.has(other.id) || distanceKm([group[i].lat, group[i].lng], [other.lat, other.lng]) > CLUSTER_KM) continue
        seen.add(other.id)
        group.push(other)
      }
    }
    groups.push(group)
  }
  return groups
    .map((group) => {
      const counts = new Map<string, number>()
      for (const job of group) counts.set(job.barangay, (counts.get(job.barangay) ?? 0) + 1)
      const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      const name = counts.size > 1 ? `${place(top)} area` : place(top)
      return { id: group.map((job) => job.id).sort().join('|'), name, jobIds: new Set(group.map((job) => job.id)), points: group.map((job): [number, number] => [job.lat, job.lng]) }
    })
    .sort((a, b) => b.jobIds.size - a.jobIds.size || a.name.localeCompare(b.name))
}

const TYPE_CHIPS: { id: JobType | 'all'; label: string }[] = [
  { id: 'all', label: 'All jobs' },
  { id: 'short-term', label: 'Short-term' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'full-time', label: 'Full-time' },
]

interface Props {
  view: View
  onViewChange: (view: View) => void
  navigation: WorkspaceNavItem[]
  activeNavigation: string
  onNavigationChange: (id: string) => void
  // Switcher and tabs shown at the top of the side panel.
  panelHeader: ReactNode
  // Content for the other jobseeker tabs; when set it replaces the job list.
  panelContent?: ReactNode
}

const APPLICATIONS = 'applications'

// Full-screen map with floating search and a side panel (bottom sheet on phones).
export default function FindJobs({ view, onViewChange, navigation, activeNavigation, onNavigationChange, panelHeader, panelContent }: Props) {
  const { state, dispatch } = useStore()
  const session = useSession('jobseeker')
  const card = state.skillCards[session.userId]
  const isVerified = (employerId: string) => state.verifications[employerId]?.status === 'verified'
  const [query, setQuery] = useState('')
  const [type, setType] = useState<JobType | 'all'>('all')
  const [moreHours, setMoreHours] = useState(false)
  const [clusterId, setClusterId] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [me, setMe] = useState<[number, number] | null>(null)
  const [locError, setLocError] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)

  function locate() {
    setLocError('')
    if (!navigator.geolocation) return setLocError('Location is not available on this device.')
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe([pos.coords.latitude, pos.coords.longitude]),
      () => setLocError('Could not get your location.'),
    )
  }

  const q = query.trim().toLowerCase()
  // Only verified employers' open jobs are shown to jobseekers; clusters are grouped from all of them.
  const visibleJobs = state.jobs.filter((j) => j.status === 'open' && isVerified(j.employerId))
  const clusters = jobClusters(visibleJobs)
  const cluster = clusters.find((c) => c.id === clusterId) ?? null
  // Without a skill card the map and list still show, but there is no match score and no applying.
  const jobs = visibleJobs
    .filter((j) => !cluster || cluster.jobIds.has(j.id))
    .filter((j) => type === 'all' || j.jobType === type)
    .filter((j) => !moreHours || j.jobType !== 'full-time')
    .filter((j) => !card || card.age >= 18 || j.minorsAllowed)
    .filter(
      (j) =>
        !q ||
        [j.title, j.employerName, barangayName(j.barangay), ...j.skills].some((t) => t.toLowerCase().includes(q)),
    )
    .map((job) => ({ job, match: card ? matchScore(job, card, true) : null }))
    .sort((a, b) => (b.match?.percent ?? 0) - (a.match?.percent ?? 0))

  // My applications: the map and detail panel show the jobs this jobseeker applied for, so they can recheck them.
  const showingApplications = activeNavigation === APPLICATIONS
  const myApplications = state.applications.filter((a) => a.userId === session.userId)
  const appliedJobs = myApplications.flatMap((a) => state.jobs.filter((j) => j.id === a.jobId))
  const shownJobs = showingApplications ? appliedJobs : jobs.map(({ job }) => job)

  // Hiring businesses for the map, each shown as a business callout over its glowing circle.
  const { jobsAtBusiness, mapJobs, businessPlaces } = jobPins(shownJobs)
  const selectedEmployerId = jobsAtBusiness.find((job) => job.id === selectedId)?.employerId ?? null
  // Callouts for a picked cluster (or, in My applications, every applied job) show at any zoom. Keyed by id so the
  // map does not rebuild them every render.
  const clusterLabelKey = cluster || showingApplications ? businessPlaces.map((p) => p.id).join('|') : ''
  const clusterLabelIds = useMemo(() => (clusterLabelKey ? clusterLabelKey.split('|') : undefined), [clusterLabelKey])
  const selectBusiness = (placeId: string) => {
    const job = jobsAtBusiness.find((item) => item.employerId === placeId)
    if (job) select(job.id)
  }

  function select(id: string | null) {
    setSelectedId(id)
    if (!id) return
    // Phones: close the menu so the map (zooming to the job's pin) and its details are in view.
    if (window.matchMedia('(max-width: 720px)').matches) {
      setPanelOpen(false)
      return
    }
    setPanelOpen(true)
    setTimeout(() => document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  function apply(job: JobPost) {
    dispatch({
      type: 'apply',
      application: {
        id: `app-${Date.now()}`,
        jobId: job.id,
        userId: session.userId,
        status: 'applied',
        appliedAt: new Date().toISOString(),
      },
    })
  }

  // Where the route on each job card starts: the device location, else the skill card's barangay.
  const origin: { point: [number, number]; name: string; code: string } | null = me
    ? { point: me, name: 'Your location', code: 'YOU' }
    : card && BARANGAY_CENTERS[card.barangay]
      ? { point: BARANGAY_CENTERS[card.barangay], name: place(card.barangay), code: placeCode(place(card.barangay)) }
      : null

  const jobList = (
    <>
      <div className="job-list-header">
        <h2>Find jobs</h2>
        <span className="job-count">
          <EyeIcon width={18} /> {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
        </span>
        <button type="button" className="job-locate" onClick={locate} aria-label="Use my location" title="Use my location">
          <span aria-hidden="true">⌖</span>
        </button>
      </div>

      <label className="job-search">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          aria-label="Search jobs"
          placeholder="Search jobs, skills, barangay…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="job-chips" role="group" aria-label="Filter jobs">
        {TYPE_CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`chip${type === c.id ? ' active' : ''}`}
            aria-pressed={type === c.id}
            onClick={() => setType(c.id)}
          >
            {c.label}
          </button>
        ))}
        <button type="button" className={`chip${moreHours ? ' active' : ''}`} aria-pressed={moreHours} onClick={() => setMoreHours(!moreHours)}>
          More hours
        </button>
      </div>

      <div className="job-cluster-filter">
        <label htmlFor="job-cluster">Area</label>
        <select
          id="job-cluster"
          value={cluster?.id ?? ''}
          onChange={(e) => {
            setClusterId(e.target.value)
            setSelectedId(null)
          }}
        >
          <option value="">All of Davao City</option>
          {clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.jobIds.size} {c.jobIds.size === 1 ? 'job' : 'jobs'}
            </option>
          ))}
        </select>
        {cluster && (
          <button type="button" className="job-cluster-clear" onClick={() => setClusterId('')}>
            Clear
          </button>
        )}
      </div>

      {locError && <p className="error">{locError}</p>}
      {!card && <p className="job-note">Create your skill card to see your match score and apply.</p>}
      {jobs.length === 0 && <p className="muted">No jobs match. Try another search or filter.</p>}

      <div className="job-rows">
        {jobs.map(({ job, match }) => {
          const where = place(job.barangay)
          const km = origin ? distanceKm(origin.point, [job.lat, job.lng]) : null
          // Applied jobs stay highlighted in the list, so the jobseeker can see what they already applied for.
          const applied = myApplications.some((a) => a.jobId === job.id)
          return (
            <button
              type="button"
              key={job.id}
              id={`job-${job.id}`}
              className={`job-row${selectedId === job.id ? ' selected' : ''}${applied ? ' applied' : ''}`}
              aria-pressed={selectedId === job.id}
              onClick={() => select(selectedId === job.id ? null : job.id)}
            >
              <span className="job-row-top">
                <span className="job-row-pay">{payLabel(job)}</span>
                <span className="job-row-badges">
                  {applied && <span className="job-badge applied">✓ Applied</span>}
                  {match ? (
                    <span className={`job-badge ${matchTone(match.percent)}`}>{match.percent}% match</span>
                  ) : (
                    <span className="job-badge type">{job.jobType}</span>
                  )}
                </span>
              </span>

              {/* Route from the jobseeker to the job, with the brand eye where a plane would be. */}
              <span className="job-route" aria-hidden="true">
                <span className="job-route-code">{origin?.code ?? 'DVO'}</span>
                <span className="job-route-dots" />
                <EyeIcon width={20} />
                <span className="job-route-line" />
                <span className="job-route-chip">{km !== null ? `${km < 10 ? km.toFixed(1) : Math.round(km)} km` : `${job.hoursPerWeek}h/wk`}</span>
                <span className="job-route-line arrow" />
                <span className="job-route-code">{placeCode(where)}</span>
              </span>

              <span className="job-row-places">
                <span>{job.title}</span>
                <span>{where}</span>
              </span>

              {/* Phones show this plain line instead of the route graphic above. */}
              <span className="job-row-plain">
                {km !== null ? `${km < 10 ? km.toFixed(1) : Math.round(km)} km away${origin?.code === 'YOU' ? '' : ` from ${origin?.name}`}` : `${job.hoursPerWeek} hours a week`}
              </span>

              <span className="job-row-meta">
                <span>
                  {job.employerName} · {job.jobType}
                </span>
                <span>
                  <span className="job-row-label">START</span> {startLabel(job.startDate)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )

  const selectedJob = shownJobs.find((job) => job.id === selectedId)
  const application = selectedJob && myApplications.find((a) => a.jobId === selectedJob.id)
  const match = selectedJob && card ? matchScore(selectedJob, card, true) : null
  const blocked = selectedJob && card ? blockedReason(selectedJob, card) : null
  const selectedJobDetail = selectedJob && (
    <JobDetail
      job={selectedJob}
      kicker={application ? 'YOUR APPLICATION' : 'SELECTED OPPORTUNITY'}
      onClose={() => setSelectedId(null)}
      info={
        <>
          {match && <p className="muted">{match.percent}% match · {match.reasons.join(' · ') || 'No strong matches yet'}</p>}
          <VerificationBadge employerId={selectedJob.employerId} />
        </>
      }
      action={
        application ? (
          <>
            <span className="ok">✓ {STATUS_LABEL[application.status]}</span>
            <span className="muted">Applied {appliedLabel(application.appliedAt)}</span>
            {selectedJob.status !== 'open' && <span className="muted">This job is no longer open.</span>}
          </>
        ) : !card ? (
          <button type="button" className="primary" onClick={() => onNavigationChange('skillcard')}>Create skill card</button>
        ) : (
          <>
            <button type="button" className="primary" disabled={blocked !== null} onClick={() => apply(selectedJob)}>Apply now</button>
            {blocked && <span className="error">{blocked}</span>}
          </>
        )
      }
    />
  )

  return (
    <MapShell
      navigation={navigation}
      activeNavigation={activeNavigation}
      onNavigationChange={onNavigationChange}
      detail={selectedJobDetail}
      view={view}
      onViewChange={onViewChange}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      map={
        <JobMap
          fill
          jobs={mapJobs}
          selectedId={selectedId}
          onSelect={select}
          me={me}
          places={businessPlaces}
          selectedPlaceId={selectedEmployerId}
          onPlaceSelect={selectBusiness}
          alwaysLabelIds={clusterLabelIds}
          fitTo={
            showingApplications
              ? appliedJobs.length > 0
                ? { key: APPLICATIONS, points: appliedJobs.map((job): [number, number] => [job.lat, job.lng]) }
                : null
              : cluster
                ? { key: cluster.id, points: cluster.points }
                : null
          }
        />
      }
      panel={
        <>
          {panelHeader}
          {panelContent ?? (showingApplications ? <MyApplications selectedId={selectedId} onSelect={select} /> : jobList)}
        </>
      }
    />
  )
}
