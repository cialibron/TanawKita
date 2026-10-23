import { useState, type ReactNode } from 'react'
import JobMap from '../../components/JobMap'
import MapShell, { type WorkspaceNavItem } from '../../components/MapShell'
import { useSession, useStore } from '../../store'
import EyeIcon from '../../components/EyeIcon'
import LocationPhoto from '../../components/LocationPhoto'
import { barangayName } from '../../data/barangays'
import { BARANGAY_CENTERS } from '../../data/barangayGeo'
import { employerPlaces, type CompetitorPlace } from '../../businessDirectory'
import { blockedReason, distanceKm, matchScore } from '../../rules'
import type { Business, JobPost, JobType, View } from '../../types'
import { VerificationBadge } from '../employer/Verify'

function payLabel(job: JobPost): string {
  const unit = job.payUnit === 'task' ? 'task (pakyaw)' : job.payUnit
  return `₱${job.payAmount.toLocaleString()} / ${unit}`
}

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

// Extra details shown only when the detail panel is expanded. "About the business" comes from the simulation
// sheet; the "Sample job details" list is a design mock-up and is labeled as such on screen.
function MoreJobDetails({ job, business }: { job: JobPost; business?: Business }) {
  const facts: [string, string | undefined][] = business
    ? [
        ['Type', business.category],
        ['Sector', business.sector],
        ['Hours', business.businessHours?.replace('-', ' – ')],
        ['Years open', business.yearsOperating != null ? `${business.yearsOperating} ${business.yearsOperating === 1 ? 'year' : 'years'}` : undefined],
        ['Staff', business.employeeCountRange && `${business.employeeCountRange} people`],
        ['Branches in Davao', business.branchesInDavao != null ? String(business.branchesInDavao) : undefined],
      ]
    : []
  const shown = facts.filter((f): f is [string, string] => Boolean(f[1]))
  return (
    <div className="selected-job-more">
      {shown.length > 0 && (
        <section>
          <div className="detail-kicker">ABOUT THE BUSINESS</div>
          <dl className="job-more-facts">
            {shown.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section>
        <div className="detail-kicker">
          SAMPLE JOB DETAILS <span className="mockup-tag">Mock-up</span>
        </div>
        <dl className="job-more-list">
          <div>
            <dt>What you’ll do</dt>
            <dd>Work as {job.title.toLowerCase()} at {job.employerName}, using {job.skills.join(', ').toLowerCase() || 'your skills'}.</dd>
          </div>
          <div>
            <dt>Who can apply</dt>
            <dd>{job.minorsAllowed ? 'Open to all ages, including workers under 18.' : 'Workers 18 years old and above.'}</dd>
          </div>
          <div>
            <dt>What to bring</dt>
            <dd>A valid ID. A resume is optional.</dd>
          </div>
          <div>
            <dt>Training</dt>
            <dd>Short on-the-job training on the first day.</dd>
          </div>
          <div>
            <dt>How to apply</dt>
            <dd>Tap Apply now. The employer sees your skill card and replies here.</dd>
          </div>
        </dl>
      </section>

      <section>
        <div className="detail-kicker">LOCATION</div>
        <div className="location-photos">
          <LocationPhoto lat={job.lat} lng={job.lng} label={`${job.employerName}, ${barangayName(job.barangay)}`} />
          <LocationPhoto
            lat={job.lat}
            lng={job.lng}
            zoom={15}
            label={`the area around ${barangayName(job.barangay)}`}
            caption={`The area · around ${barangayName(job.barangay)}`}
          />
        </div>
      </section>
    </div>
  )
}

function matchTone(percent: number): string {
  return percent >= 80 ? 'good' : percent >= 50 ? 'fair' : 'low'
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

  // Hiring businesses for the map, each shown as a business callout over its glowing circle. A job at its
  // business (every demo-sheet job, or one posted within 150 m) is reached through that callout; a job posted
  // somewhere else keeps its own pay tag.
  const places = placesFor(jobs.map(({ job }) => job.employerId))
  const isAtBusiness = (job: JobPost) => {
    const place = places.find((item) => item.id === job.employerId)
    return Boolean(place && (job.id.startsWith('SYN-JOB-') || distanceKm([job.lat, job.lng], [place.lat, place.lng]) <= 0.15))
  }
  const jobsAtBusiness = jobs.filter(({ job }) => isAtBusiness(job)).map(({ job }) => job)
  const mapJobs = jobs.filter(({ job }) => !isAtBusiness(job)).map(({ job }) => job)
  const businessPlaces = places.filter((place) => jobsAtBusiness.some((job) => job.employerId === place.id))
  const selectedEmployerId = jobsAtBusiness.find((job) => job.id === selectedId)?.employerId ?? null
  const selectBusiness = (placeId: string) => {
    const job = jobsAtBusiness.find((item) => item.employerId === placeId)
    if (job) select(job.id)
  }

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

      {locError && <p className="error">{locError}</p>}
      {!card && <p className="job-note">Create your skill card to see your match score and apply.</p>}
      {jobs.length === 0 && <p className="muted">No jobs match. Try another search or filter.</p>}

      <div className="job-rows">
        {jobs.map(({ job, match }) => {
          const where = place(job.barangay)
          const km = origin ? distanceKm(origin.point, [job.lat, job.lng]) : null
          return (
            <button
              type="button"
              key={job.id}
              id={`job-${job.id}`}
              className={`job-row${selectedId === job.id ? ' selected' : ''}`}
              aria-pressed={selectedId === job.id}
              onClick={() => select(selectedId === job.id ? null : job.id)}
            >
              <span className="job-row-top">
                <span className="job-row-pay">{payLabel(job)}</span>
                {match ? (
                  <span className={`job-badge ${matchTone(match.percent)}`}>{match.percent}% match</span>
                ) : (
                  <span className="job-badge type">{job.jobType}</span>
                )}
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
      <MoreJobDetails job={selectedEntry.job} business={places.find((item) => item.id === selectedEntry.job.employerId)?.profile} />
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
      map={<JobMap fill jobs={mapJobs} selectedId={selectedId} onSelect={select} me={me} places={businessPlaces} selectedPlaceId={selectedEmployerId} onPlaceSelect={selectBusiness} />}
      panel={
        <>
          {panelHeader}
          {panelContent ?? jobList}
        </>
      }
    />
  )
}
