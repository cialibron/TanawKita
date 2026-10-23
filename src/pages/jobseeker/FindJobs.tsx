import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import JobMap from '../../components/JobMap'
import MapShell, { type WorkspaceNavItem } from '../../components/MapShell'
import { useSession, useStore } from '../../store'
import EyeIcon from '../../components/EyeIcon'
import JobDetail from '../../components/JobDetail'
import { jobPins } from '../../components/jobPins'
import PayLabel from '../../components/PayLabel'
import { barangayName } from '../../data/barangays'
import { BARANGAY_CENTERS } from '../../data/barangayGeo'
import { blockedReason, distanceKm, matchScore } from '../../rules'
import { newId } from '../ids'
import UndoToast from '../UndoToast'
import type { Application, JobPost, JobType, View } from '../../types'
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
  // Full-screen menu, held by the app so sign-in can open Find jobs full screen.
  panelFullScreen?: boolean
  onPanelFullScreenChange?: (on: boolean) => void
}

const APPLICATIONS = 'applications'

const nowISO = () => new Date().toISOString()

// The same list for the same ids, so the map does not rebuild its callouts on every render.
const labelIdsCache = new Map<string, string[]>()
function labelIdsFor(key: string): string[] | undefined {
  if (!key) return undefined
  if (!labelIdsCache.has(key)) labelIdsCache.set(key, key.split('|'))
  return labelIdsCache.get(key)
}
// Withdraw shows up where Apply now was, so the second tap of a double tap must not undo the apply.
const justApplied = (application: Application) => Date.now() - Date.parse(application.appliedAt) < 1500

// Full-screen map with floating search and a side panel (bottom sheet on phones).
export default function FindJobs({ view, onViewChange, navigation, activeNavigation, onNavigationChange, panelHeader, panelContent, panelFullScreen, onPanelFullScreenChange }: Props) {
  const { state, dispatch } = useStore()
  const session = useSession('jobseeker')
  const card = state.skillCards[session.userId]
  const [query, setQuery] = useState('')
  const [type, setType] = useState<JobType | 'all'>('all')
  const [notFullTime, setNotFullTime] = useState(false)
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

  // Where distances are measured from: the device location once shared, else the skill card's barangay (an
  // approximate starting point, labeled as such on the cards).
  const origin: { point: [number, number]; name: string; code: string; exact: boolean } | null = me
    ? { point: me, name: 'Your location', code: 'YOU', exact: true }
    : card && BARANGAY_CENTERS[card.barangay]
      ? { point: BARANGAY_CENTERS[card.barangay], name: place(card.barangay), code: placeCode(place(card.barangay)), exact: false }
      : null

  const q = query.trim().toLowerCase()
  // Only verified employers' open jobs are shown to jobseekers; clusters are grouped from all of them.
  const visibleJobs = useMemo(
    () => state.jobs.filter((j) => j.status === 'open' && state.verifications[j.employerId]?.status === 'verified'),
    [state.jobs, state.verifications],
  )
  const clusters = useMemo(() => jobClusters(visibleJobs), [visibleJobs])
  const cluster = clusters.find((c) => c.id === clusterId) ?? null
  // Match scores only change when the jobs or the skill card change, not on every render.
  const matches = useMemo(() => new Map(card ? visibleJobs.map((job) => [job.id, matchScore(job, card, true)]) : []), [visibleJobs, card])
  const originKey = origin ? origin.point.join(',') : ''
  // Without a skill card the map and list still show, but there is no match score and no applying.
  // Order: best match first, then nearest, then the soonest start.
  const clusterJobIds = cluster?.jobIds
  const jobs = useMemo(() => {
    const from = originKey ? (originKey.split(',').map(Number) as [number, number]) : null
    return visibleJobs
      .filter((j) => !clusterJobIds || clusterJobIds.has(j.id))
      .filter((j) => type === 'all' || j.jobType === type)
      .filter((j) => !notFullTime || j.jobType !== 'full-time')
      .filter((j) => !card || card.age >= 18 || j.minorsAllowed)
      .filter((j) => !q || [j.title, j.employerName, barangayName(j.barangay), ...j.skills].some((t) => t.toLowerCase().includes(q)))
      .map((job) => ({ job, match: matches.get(job.id) ?? null, km: from ? distanceKm(from, [job.lat, job.lng]) : null }))
      .sort(
        (a, b) =>
          (b.match?.percent ?? 0) - (a.match?.percent ?? 0) ||
          (a.km ?? 0) - (b.km ?? 0) ||
          a.job.startDate.localeCompare(b.job.startDate),
      )
  }, [visibleJobs, clusterJobIds, type, notFullTime, card, q, matches, originKey])

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
  const clusterLabelIds = labelIdsFor(clusterLabelKey)
  const selectBusiness = (placeId: string) => {
    const job = jobsAtBusiness.find((item) => item.employerId === placeId)
    if (job) select(job.id)
  }

  function select(id: string | null) {
    setSelectedId(id)
    if (!id) return
    // The menu stays as it is (full screen, or covering the map on a phone); the details pop up over it.
    setPanelOpen(true)
    setTimeout(() => document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  // Jobs with an Apply in flight, so a fast double tap sends one application (the store also refuses a second).
  const applying = useRef(new Set<string>())
  useEffect(() => {
    // Once the store has the application, the guard is no longer needed (and a withdrawn job can be applied to again).
    applying.current.clear()
  }, [state.applications])
  function apply(job: JobPost) {
    if (applying.current.has(job.id) || myApplications.some((a) => a.jobId === job.id)) return
    applying.current.add(job.id)
    dispatch({
      type: 'apply',
      application: { id: newId('app'), jobId: job.id, userId: session.userId, status: 'applied', appliedAt: nowISO() },
    })
  }

  // Withdrawing happens at once, with 8 seconds to undo it instead of a confirmation box.
  const [withdrawn, setWithdrawn] = useState<Application | null>(null)
  function withdraw(application: Application) {
    if (justApplied(application)) return
    dispatch({ type: 'withdraw', applicationId: application.id })
    setWithdrawn(application)
  }

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
        <button type="button" className={`chip${notFullTime ? ' active' : ''}`} aria-pressed={notFullTime} onClick={() => setNotFullTime(!notFullTime)}>
          Not full-time
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
        {jobs.map(({ job, match, km }) => {
          const where = place(job.barangay)
          // Measured from the barangay center (no device location), the distance is only approximate.
          const kmNumber = km === null ? '' : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
          const kmText = origin?.exact ? kmNumber : `~${kmNumber}`
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
                <span className="job-row-pay"><PayLabel job={job} /></span>
                <span className="job-row-badges">
                  {applied && <span className="job-badge applied">✓ Applied</span>}
                  {/* No skill card, no score: the job type is already in the line below, so no badge here. */}
                  {match && <span className={`job-badge ${matchTone(match.percent)}`}>{match.percent}% match</span>}
                </span>
              </span>

              {/* Route from the jobseeker to the job, with the brand eye where a plane would be. */}
              <span className="job-route" aria-hidden="true">
                <span className="job-route-code">{origin?.code ?? 'DVO'}</span>
                <span className="job-route-dots" />
                <EyeIcon width={20} />
                <span className="job-route-line" />
                <span className="job-route-chip">{km !== null ? kmText : `${job.hoursPerWeek}h/wk`}</span>
                <span className="job-route-line arrow" />
                <span className="job-route-code">{placeCode(where)}</span>
              </span>

              <span className="job-row-places">
                <span>{job.title}</span>
                <span>{where}</span>
              </span>

              {/* Phones show this plain line instead of the route graphic above. */}
              <span className="job-row-plain">
                {km === null
                  ? `${job.hoursPerWeek} hours a week`
                  : origin?.exact
                    ? `${kmNumber} away`
                    : `About ${kmNumber} from ${origin?.name}, your barangay`}
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
  const match = selectedJob && card ? (matches.get(selectedJob.id) ?? matchScore(selectedJob, card, true)) : null
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
            {application.status !== 'hired' && (
              <button type="button" className="withdraw-button" onClick={() => withdraw(application)}>
                Withdraw application
              </button>
            )}
          </>
        ) : !card ? (
          <button type="button" className="primary" onClick={() => onNavigationChange('skillcard')}>Create skill card</button>
        ) : (
          <>
            <button
              type="button"
              className="primary"
              disabled={blocked !== null}
              aria-describedby={blocked ? 'apply-blocked' : undefined}
              onClick={() => apply(selectedJob)}
            >
              Apply now
            </button>
            {/* A disabled Apply always says why, right under the button. */}
            {blocked && (
              <span id="apply-blocked" className="error apply-blocked">
                Can’t apply: {blocked}
              </span>
            )}
          </>
        )
      }
    />
  )

  return (
    <MapShell
      panelFullScreen={panelFullScreen}
      onPanelFullScreenChange={onPanelFullScreenChange}
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
              ? selectedJob
                ? // Tapping an application zooms the map to that job, so "where it is" shows straight away.
                  { key: `${APPLICATIONS}:${selectedJob.id}`, points: [[selectedJob.lat, selectedJob.lng]] }
                : appliedJobs.length > 0
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
          {withdrawn && (
            <UndoToast
              key={withdrawn.id}
              message="Application withdrawn."
              onUndo={() => {
                dispatch({ type: 'apply', application: withdrawn })
                setWithdrawn(null)
              }}
              onDone={() => setWithdrawn(null)}
            />
          )}
        </>
      }
    />
  )
}
