import { useMemo, useState, type ReactNode } from 'react'
import AreaMap from '../../components/AreaMap'
import MapShell, { type WorkspaceNavItem } from '../../components/MapShell'
import { areaStats, barangaysWithin, jobseekerHeat, nearestBarangay, seekerPoint } from '../../area'
import { barangayName } from '../../data/barangays'
import { distanceKm, matchScore, SKILLS } from '../../rules'
import { useSession, useStore } from '../../store'
import type { View } from '../../types'
import type { CompetitorPlace, CompetitorSearchMode } from '../../businessDirectory'

const RADII = [1, 3, 5]
const ANY = ''

interface Props {
  view: View
  onViewChange: (view: View) => void
  navigation: WorkspaceNavItem[]
  activeNavigation: string
  onNavigationChange: (id: string) => void
  competitorPlaces: CompetitorPlace[]
  selectedCompetitor: CompetitorPlace | null
  competitorMode: CompetitorSearchMode
  onSelectedCompetitorChange: (place: CompetitorPlace | null) => void
  // Switcher and tabs shown at the top of the side panel.
  panelHeader: ReactNode
  // Content for the other employer tabs; when set it replaces the area and talent view.
  panelContent?: ReactNode
}

// Employer home: full-screen map of the business area with a side panel for everything else.
export default function MyBusiness({ view, onViewChange, navigation, activeNavigation, onNavigationChange, competitorPlaces, selectedCompetitor, competitorMode, onSelectedCompetitorChange, panelHeader, panelContent }: Props) {
  const { state, dispatch } = useStore()
  const session = useSession('employer')
  const business = state.businesses[session.userId] ?? null
  const [radiusKm, setRadiusKm] = useState(3)
  const [moving, setMoving] = useState(!business)
  const myJobs = state.jobs.filter((j) => j.employerId === session.userId && j.status === 'open')
  const [jobId, setJobId] = useState(myJobs[0]?.id ?? ANY)
  const [skill, setSkill] = useState(ANY)
  const [invited, setInvited] = useState<Set<string>>(new Set())

  const heat = useMemo(() => jobseekerHeat(), [])
  const here: [number, number] | null = business ? [business.lat, business.lng] : null
  const stats = here ? areaStats(barangaysWithin(here, radiusKm)) : null
  const job = myJobs.find((j) => j.id === jobId)

  // Profiles within the radius, scored against the chosen job or skill.
  const profiles = here
    ? Object.values(state.skillCards)
        .map((card) => {
          const point = seekerPoint(card.userId, card.barangay)
          return { card, point, km: point ? distanceKm(here, point) : Infinity }
        })
        .filter((p) => p.km <= radiusKm)
        .filter((p) => !job || p.card.age >= 18 || job.minorsAllowed)
        .filter((p) => job || !skill || p.card.skills.includes(skill))
        .map((p) => ({ ...p, fit: job ? matchScore(job, p.card, state.verifications[session.userId]?.status === 'verified') : null }))
        .sort((a, b) => (b.fit?.percent ?? 0) - (a.fit?.percent ?? 0) || a.km - b.km)
    : []

  function pick([lat, lng]: [number, number]) {
    if (!moving) return
    const barangay = nearestBarangay([lat, lng]) ?? '116'
    dispatch({ type: 'setBusiness', employerId: session.userId, business: { name: session.name, barangay, lat, lng } })
    setMoving(false)
  }

  const statTiles = stats && [
    { label: 'Looking for work', value: stats.jobseekerPool },
    { label: 'Out-of-school, out-of-work youth', value: stats.neetYouth },
    { label: 'TVET graduates', value: stats.tvetGrads },
    { label: 'Casual workers', value: stats.casualWorkers },
  ]

  const areaAndTalent = (
    <>
      <h1>{session.name}</h1>
      <p className="muted">{business ? barangayName(business.barangay) : 'Set your business location on the map.'}</p>
      {business?.category && (
        <div className="business-context-card">
          <div className="business-context-grid">
            <div><span>Category</span><strong>{business.category}</strong></div>
            <div><span>Business model</span><strong>{business.businessModel}{business.franchiseBrand ? ` · ${business.franchiseBrand}` : ''}</strong></div>
            <div><span>Operating</span><strong>{business.yearsOperating} year(s)</strong></div>
            <div><span>Team size</span><strong>{business.employeeCountRange} people</strong></div>
          </div>
          <p>{business.currentlyHiring ? `Hiring ${business.openRolesCount} role(s): ${business.rolesHiring?.join(', ')}` : 'Not currently hiring'}</p>
          <small>Synthetic business simulation profile · not a real registered business</small>
        </div>
      )}

      {statTiles && (
        <>
          <h2>Within {radiusKm} km</h2>
          <div className="stats">
            {statTiles.map((s) => (
              <div key={s.label} className="card stat">
                <div className="stat-value">{s.value.toLocaleString()}</div>
                <div className="muted">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="muted">
            From {stats.barangays.length} barangay(s) whose center is inside the circle. CBMS aggregates only, no personal
            records.
          </p>
        </>
      )}

      <h2>Profiles near you</h2>
      <label htmlFor="match-job">Match to</label>
      <select id="match-job" value={jobId} onChange={(e) => setJobId(e.target.value)}>
        <option value={ANY}>No job, filter by skill</option>
        {myJobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
      {!job && (
        <select aria-label="Skill" value={skill} onChange={(e) => setSkill(e.target.value)} className="section">
          <option value={ANY}>Any skill</option>
          {SKILLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}
      <p className="muted">
        Sample profiles for testing. {profiles.length} within {radiusKm} km.
      </p>

      {!business && <p className="card">Set your business location to see profiles near you.</p>}
      {profiles.map(({ card, km, fit }) => (
        <div key={card.userId} className="card">
          <div className="row spread">
            <strong>{card.name}</strong>
            {fit && <span className="match">{fit.percent}% fit</span>}
          </div>
          <div className="muted">
            {card.age >= 18 ? '18 and over' : 'Under 18'} · {barangayName(card.barangay)} · {km.toFixed(1)} km away ·{' '}
            {card.hoursWanted} hrs/week
          </div>
          {(card.yearsExperience !== undefined || card.education || card.employmentStatus) && (
            <div className="muted simulation-profile-meta">
              {card.yearsExperience !== undefined ? `${card.yearsExperience} yr(s) experience` : ''}
              {card.education ? ` · ${card.education}` : ''}
              {card.employmentStatus ? ` · ${card.employmentStatus.replaceAll('_', ' ')}` : ''}
            </div>
          )}
          {card.certifications && card.certifications.length > 0 && (
            <div className="simulation-certifications">Training: {card.certifications.join(' · ')}</div>
          )}
          {card.profileSummary && <p className="simulation-profile-summary">{card.profileSummary}</p>}
          <div className="skill-tags">
            {card.skills.map((s) => (
              <span key={s} className={`tag${job?.skills.includes(s) || s === skill ? ' hit' : ''}`}>
                {s}
              </span>
            ))}
          </div>
          <div className="row section">
            {invited.has(card.userId) ? (
              <span className="ok">Invite sent (test only, nothing is sent)</span>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={!job}
                onClick={() => setInvited(new Set(invited).add(card.userId))}
              >
                Invite to apply
              </button>
            )}
            {!job && <span className="muted">Pick a job to invite</span>}
          </div>
        </div>
      ))}
    </>
  )

  return (
    <MapShell
      navigation={navigation}
      activeNavigation={activeNavigation}
      onNavigationChange={onNavigationChange}
      detail={selectedCompetitor ? (
        <div className="selected-business-detail">
          <div className="detail-kicker">SELECTED COMPETITOR</div>
          <h2>{selectedCompetitor.name}</h2>
          <p className="muted">{selectedCompetitor.address || 'Mapped place of interest'}{selectedCompetitor.distanceKm !== undefined ? ` · ${selectedCompetitor.distanceKm.toFixed(1)} km away` : ''}</p>
          <p className="advisor-synthetic-note">Approximate simulation location · not an actual storefront</p>
        </div>
      ) : business ? (
        <div className="selected-business-detail">
          <div className="detail-kicker">CURRENT BUSINESS AREA</div>
          <h2>{business.name}</h2>
          <p className="muted">{barangayName(business.barangay)} · {radiusKm} km talent search radius</p>
          {stats && <div className="selected-job-metrics">
            <div><span>Looking for work</span><strong>{stats.jobseekerPool.toLocaleString()}</strong></div>
            <div><span>TVET graduates</span><strong>{stats.tvetGrads.toLocaleString()}</strong></div>
            <div><span>Nearby barangays</span><strong>{stats.barangays.length}</strong></div>
          </div>}
        </div>
      ) : undefined}
      view={view}
      onViewChange={onViewChange}
      map={
        <AreaMap
          fill
          heat={activeNavigation === 'area' ? heat : []}
          business={business}
          radiusKm={competitorMode === 'city' ? 0 : radiusKm}
          places={competitorPlaces}
          selectedPlaceId={selectedCompetitor?.id}
          onPlaceSelect={(id) => onSelectedCompetitorChange(competitorPlaces.find((place) => place.id === id) ?? null)}
          mapView={activeNavigation === 'franchise' || activeNavigation === 'competitors'
            ? competitorMode === 'city'
              ? { center: [7.0731, 125.6128], zoom: 10.2 }
              : { center: business ? [business.lat, business.lng] : [7.0731, 125.6128], zoom: business ? 14 : 12.5 }
            : undefined}
          onPick={pick}
        />
      }
      overlay={activeNavigation === 'area' ? (
        <>
          <div className="chips">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                className={`chip${radiusKm === r ? ' active' : ''}`}
                onClick={() => setRadiusKm(r)}
              >
                {r} km
              </button>
            ))}
            <button type="button" className={`chip${moving ? ' active' : ''}`} onClick={() => setMoving(!moving)}>
              {business ? 'Move my business' : 'Set my location'}
            </button>
          </div>
          {moving && <div className="map-hint">Tap the map where your business is.</div>}
          <div className="heat-legend">
            <span>Fewer</span>
            <span className="heat-bar" />
            <span>More people needing jobs</span>
          </div>
        </>
      ) : activeNavigation === 'franchise' || activeNavigation === 'competitors' ? (
        <div className="map-hint">{competitorMode === 'city' ? 'Davao-wide synthetic business locations · select a marker or list item.' : 'Nearby franchise competitors · locations are simulation examples.'}</div>
      ) : undefined}
      panel={
        <>
          {panelHeader}
          {panelContent ?? areaAndTalent}
        </>
      }
    />
  )
}
