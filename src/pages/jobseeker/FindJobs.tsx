import { useState, type ReactNode } from 'react'
import JobMap from '../../components/JobMap'
import MapShell from '../../components/MapShell'
import { useSession, useStore } from '../../store'
import { barangayName } from '../../data/barangays'
import { blockedReason, matchScore } from '../../rules'
import type { JobPost, JobType } from '../../types'
import { VerificationBadge } from '../employer/Verify'

function payLabel(job: JobPost): string {
  const unit = job.payUnit === 'task' ? 'task (pakyaw)' : job.payUnit
  return `₱${job.payAmount.toLocaleString()} / ${unit}`
}

const TYPE_CHIPS: { id: JobType | 'all'; label: string }[] = [
  { id: 'all', label: 'All jobs' },
  { id: 'short-term', label: 'Short-term' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'full-time', label: 'Full-time' },
]

interface Props {
  // Switcher and tabs shown at the top of the side panel.
  panelHeader: ReactNode
  // Content for the other jobseeker tabs; when set it replaces the job list.
  panelContent?: ReactNode
}

// Full-screen map with floating search and a side panel (bottom sheet on phones).
export default function FindJobs({ panelHeader, panelContent }: Props) {
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

          {selectedId === job.id && (
            <div className="section">
              <p className="muted">
                {job.hoursPerWeek} hours a week · starts {job.startDate} · {job.workers} needed
              </p>
              {match && <p className="muted">Why it fits: {match.reasons.join(', ') || 'No strong matches yet'}</p>}
              {!card ? (
                <p className="muted">Create your skill card to apply.</p>
              ) : alreadyApplied(job.id) ? (
                <p className="ok">You applied to this job.</p>
              ) : (
                <button
                  type="button"
                  className="primary"
                  disabled={blockedReason(job, card) !== null}
                  onClick={() => apply(job)}
                >
                  Apply
                </button>
              )}
              {card && blockedReason(job, card) && <p className="error">{blockedReason(job, card)}</p>}
            </div>
          )}
        </div>
      ))}
    </>
  )

  return (
    <MapShell
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      map={<JobMap fill jobs={jobs.map((j) => j.job)} selectedId={selectedId} onSelect={select} me={me} />}
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
