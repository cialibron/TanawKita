import { useState, type ReactNode } from 'react'
import JobMap from '../../components/JobMap'
import MapShell, { type WorkspaceNavItem } from '../../components/MapShell'
import { useSession, useStore } from '../../store'
import { barangayName } from '../../data/barangays'
import { distanceKm, employerPlaces, type CompetitorPlace } from '../../businessDirectory'
import { blockedReason, matchScore } from '../../rules'
import type { JobPost, JobType, View } from '../../types'
import { VerificationBadge } from '../employer/Verify'

function payLabel(job: JobPost): string {
  const unit = job.payUnit === 'task' ? 'task (pakyaw)' : job.payUnit
  return `₱${job.payAmount.toLocaleString()} / ${unit}`
}

// Map places per set of hiring employers. Kept stable between renders so the map does not redraw its areas.
const placesCache = new Map<string, CompetitorPlace[]>()
function placesFor(employerIds: string[]): CompetitorPlace[] {
  const key = [...new Set(employerIds)].sort().join('|')
  if (!placesCache.has(key)) placesCache.set(key, employerPlaces(key.split('|')))
  return placesCache.get(key)!
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

// Full-screen map with floating search and a side panel (bottom sheet on phones).
export default function FindJobs({ view, onViewChange, navigation, activeNavigation, onNavigationChange, panelHeader, panelContent }: Props) {
  const { state, dispatch } = useStore()
  const session = useSession('jobseeker')
  const card = state.skillCards[session.userId]
  const isVerified = (employerId: string) => state.verifications[employerId]?.status === 'verified'
  const [query, setQuery] = useState('')
  const [type, setType] = useState<JobType | 'all'>('all')
  const [moreHours, setMoreHours] = useState(false)
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
  // Without a skill card the map and list still show, but there is no match score and no applying.
  const jobs = state.jobs
    .filter((j) => j.status === 'open')
    // Only verified employers' jobs are shown to jobseekers.
    .filter((j) => isVerified(j.employerId))
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

  // Hiring businesses for the map. Demo-sheet jobs always sit on their business, so the pay tag points at its
  // circle even if saved data holds an older location; other jobs snap only when posted within 150 m of it.
  const places = placesFor(jobs.map(({ job }) => job.employerId))
  const mapJobs = jobs.map(({ job }) => {
    const place = places.find((item) => item.id === job.employerId)
    const atBusiness = place && (job.id.startsWith('SYN-JOB-') || distanceKm([job.lat, job.lng], [place.lat, place.lng]) <= 0.15)
    return place && atBusiness ? { ...job, lat: place.lat, lng: place.lng } : job
  })
  const selectedEmployerId = jobs.find(({ job }) => job.id === selectedId)?.job.employerId ?? null

  const alreadyApplied = (jobId: string) =>
    state.applications.some((a) => a.jobId === jobId && a.userId === session.userId)

  function select(id: string | null) {
    setSelectedId(id)
    if (id) {
      setPanelOpen(true)
      setTimeout(() => document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
    }
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

  const jobList = (
    <>
      <div className="row">
        <button type="button" onClick={locate}>
          📍 Use my location
        </button>
        <span className="muted">{jobs.length} job(s) found</span>
      </div>
      {locError && <p className="error">{locError}</p>}
      {!card && <p className="card">Create your skill card to see your match score and apply.</p>}
      {jobs.length === 0 && <p className="muted">No jobs match. Try another search or filter.</p>}

      {jobs.map(({ job, match }) => (
        <div key={job.id} id={`job-${job.id}`} className={`card job-card${selectedId === job.id ? ' selected' : ''}`}>
          <button type="button" className="link" onClick={() => select(selectedId === job.id ? null : job.id)}>
            <div className="row spread">
              <span className="pay">{payLabel(job)}</span>
              {match && <span className="match">{match.percent}% match</span>}
            </div>
            <div>{job.title}</div>
            <div className="muted">
              {job.employerName} · {barangayName(job.barangay)} · {job.jobType}
            </div>
            <div>
              <VerificationBadge employerId={job.employerId} />
            </div>
          </button>

        </div>
      ))}
    </>
  )

  const selectedEntry = jobs.find(({ job }) => job.id === selectedId)
  const selectedJobDetail = selectedEntry && (
    <div className="selected-job-detail">
      <div className="selected-job-heading">
        <div>
          <div className="detail-kicker">SELECTED OPPORTUNITY</div>
          <h2>{selectedEntry.job.title}</h2>
          <div className="muted">{selectedEntry.job.employerName} · {barangayName(selectedEntry.job.barangay)}</div>
        </div>
        <button type="button" className="detail-close" aria-label="Clear selected job" onClick={() => setSelectedId(null)}>×</button>
      </div>
      <div className="selected-job-metrics">
        <div><span>Pay</span><strong>{payLabel(selectedEntry.job)}</strong></div>
        <div><span>Schedule</span><strong>{selectedEntry.job.hoursPerWeek} hrs / week</strong></div>
        <div><span>Workers</span><strong>{selectedEntry.job.workers} needed</strong></div>
        <div><span>Start date</span><strong>{selectedEntry.job.startDate}</strong></div>
      </div>
      <div className="selected-job-footer">
        <div>
          <div className="detail-kicker">SKILLS</div>
          <div className="skill-tags">{selectedEntry.job.skills.map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
          {selectedEntry.match && <p className="muted">{selectedEntry.match.percent}% match · {selectedEntry.match.reasons.join(' · ') || 'No strong matches yet'}</p>}
          <VerificationBadge employerId={selectedEntry.job.employerId} />
        </div>
        <div className="selected-job-action">
          {!card ? (
            <button type="button" className="primary" onClick={() => onNavigationChange('skillcard')}>Create skill card</button>
          ) : alreadyApplied(selectedEntry.job.id) ? (
            <span className="ok">✓ Application sent</span>
          ) : (
            <button type="button" className="primary" disabled={blockedReason(selectedEntry.job, card) !== null} onClick={() => apply(selectedEntry.job)}>Apply now</button>
          )}
          {card && blockedReason(selectedEntry.job, card) && <span className="error">{blockedReason(selectedEntry.job, card)}</span>}
        </div>
      </div>
    </div>
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
      map={<JobMap fill jobs={mapJobs} selectedId={selectedId} onSelect={select} me={me} places={places} selectedPlaceId={selectedEmployerId} placeLabels={false} />}
      panel={
        <>
          {panelHeader}
          {panelContent ?? jobList}
        </>
      }
      overlay={
        <>
          <div className="searchbar">
            <input
              type="search"
              placeholder="Search jobs, skills, barangay"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="chips">
            {TYPE_CHIPS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip${type === c.id ? ' active' : ''}`}
                onClick={() => setType(c.id)}
              >
                {c.label}
              </button>
            ))}
            <button type="button" className={`chip${moreHours ? ' active' : ''}`} onClick={() => setMoreHours(!moreHours)}>
              I want more hours
            </button>
          </div>
        </>
      }
    />
  )
}
