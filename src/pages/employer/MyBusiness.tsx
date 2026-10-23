import { useMemo, useState, type ReactNode } from 'react'
import AreaMap from '../../components/AreaMap'
import { BarangayDetail } from './BarangayRanking'
import PeopleDashboard from './PeopleDashboard'
import MapShell, { type WorkspaceNavItem } from '../../components/MapShell'
import { areaStats, barangaysWithin, jobseekerHeat, nearestBarangay, seekerPoint } from '../../area'
import { barangayName } from '../../data/barangays'
import { distanceKm, matchScore, SKILLS } from '../../rules'
import { employerPlaces } from '../../businessDirectory'
import { useSession, useStore } from '../../store'
import type { View } from '../../types'

const RADII = [1, 3, 5]
const ANY = ''

interface Props {
  view: View
  onViewChange: (view: View) => void
  navigation: WorkspaceNavItem[]
  activeNavigation: string
  onNavigationChange: (id: string) => void
  // Switcher and tabs shown at the top of the side panel.
  panelHeader: ReactNode
  // Content for the other employer tabs; when set it replaces the area and talent view.
  panelContent?: ReactNode
}

// Employer home: full-screen map of the business area with a side panel for everything else.
export default function MyBusiness({ view, onViewChange, navigation, activeNavigation, onNavigationChange, panelHeader, panelContent }: Props) {
  const { state, dispatch } = useStore()
  const session = useSession('employer')
  const business = state.businesses[session.userId] ?? null
  const [radiusKm, setRadiusKm] = useState(3)
  const [moving, setMoving] = useState(!business)
  const myJobs = state.jobs.filter((j) => j.employerId === session.userId && j.status === 'open')
  const [jobId, setJobId] = useState(myJobs[0]?.id ?? ANY)
  const [skill, setSkill] = useState(ANY)
  const [invited, setInvited] = useState<Set<string>>(new Set())
  const [selectedBarangay, setSelectedBarangay] = useState<string | null>(null)
  // The heat layer guesses where people live inside each barangay, so it stays off unless asked for.
  const [showHeat, setShowHeat] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  const onMapTab = activeNavigation === 'area' || activeNavigation === 'people'

  const heat = useMemo(() => jobseekerHeat(), [])
  const [placeSelected, setPlaceSelected] = useState(false)
  // The business as a job-map callout, at its saved location. Only demo-sheet businesses have the profile it needs.
  const ownPlaces = useMemo(() => {
    if (!business) return []
    return employerPlaces([session.userId]).map((place) => ({ ...place, lat: business.lat, lng: business.lng }))
  }, [session.userId, business])
  // As on the job map, jobs at the business are reached through its callout; jobs elsewhere get their own pay tag.
  const awayJobs = business ? myJobs.filter((j) => ownPlaces.length === 0 || distanceKm([j.lat, j.lng], [business.lat, business.lng]) > 0.15) : myJobs
  const here: [number, number] | null = business ? [business.lat, business.lng] : null
  const stats = here ? areaStats(barangaysWithin(here, radiusKm)) : null
  const job = myJobs.find((j) => j.id === jobId)
  // Drop the selection once its barangay leaves the radius or another tab is open.
  const barangay = activeNavigation === 'people' && selectedBarangay && stats?.barangays.includes(selectedBarangay) ? selectedBarangay : null

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
    { label: 'Looking for work', value: stats.jobseekerPool, icon: '◍', tone: 'blue' },
    { label: 'Youth not in school or work', value: stats.neetYouth, icon: '✦', tone: 'cyan' },
    { label: 'TVET graduates', value: stats.tvetGrads, icon: '✎', tone: 'gold' },
    { label: 'Casual workers', value: stats.casualWorkers, icon: '◷', tone: 'orange' },
  ]

  const overview = (
    <div className="dash dash-bento">
      <header className="dash-head">
        <div>
          <p className="dash-eyebrow">Business overview</p>
          <h1>{session.name}</h1>
          <p className="dash-sub">{business ? barangayName(business.barangay) : 'Set your business location on the map.'}</p>
        </div>
        <button type="button" className={`dash-pill${moving ? ' active' : ''}`} onClick={() => setMoving(!moving)}>
          {business ? 'Move my business' : 'Set my location'}
        </button>
      </header>

      <div className="bento">
        {business?.category && (
          <section className="bento-card bento-hero">
            <span className="dash-badge blue" aria-hidden="true">{session.name.charAt(0)}</span>
            <div className="bento-hero-body">
              <div className="dash-chips">
                <span className="dash-chip">{business.category}</span>
                <span className="dash-chip">{business.businessModel}{business.franchiseBrand ? ` · ${business.franchiseBrand}` : ''}</span>
                <span className="dash-chip">{business.yearsOperating} year(s) operating</span>
                <span className="dash-chip">{business.employeeCountRange} people</span>
              </div>
              <p className="bento-hiring">{business.currentlyHiring ? `Hiring ${business.openRolesCount} role(s): ${business.rolesHiring?.join(', ')}` : 'Not currently hiring'}</p>
              <small className="dash-note">Synthetic business simulation profile · not a real registered business</small>
            </div>
          </section>
        )}

        {statTiles && (
          <>
            <section className="bento-card bento-radius">
              <div>
                <h2>Within {radiusKm} km</h2>
                <p className="dash-note">From {stats.barangays.length} barangay(s) whose center is inside the circle. CBMS aggregates only, no personal records.</p>
              </div>
              <div className="dash-capsules" role="group" aria-label="Search radius">
                {RADII.map((r) => (
                  <button key={r} type="button" className={`dash-capsule${radiusKm === r ? ' active' : ''}`} aria-pressed={radiusKm === r} onClick={() => setRadiusKm(r)}>
                    {r} km
                  </button>
                ))}
              </div>
            </section>
            {statTiles.map((s) => (
              <section key={s.label} className="bento-card bento-stat">
                <span className={`dash-badge ${s.tone}`} aria-hidden="true">{s.icon}</span>
                <strong>{s.value.toLocaleString()}</strong>
                <span>{s.label}</span>
              </section>
            ))}
            <section className="bento-card span-all bento-cta">
              <p>See which barangays these people live in, and how to reach them.</p>
              <button type="button" className="dash-pill primary" onClick={() => onNavigationChange('people')}>
                People looking for work →
              </button>
            </section>
          </>
        )}

        <section className="bento-card span-all">
          <div className="bento-card-head">
            <h2>Profiles near you</h2>
            <span className="dash-chip">{profiles.length} within {radiusKm} km</span>
          </div>
          <div className="bento-filters">
            <label>
              <span>Match to</span>
              <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                <option value={ANY}>No job, filter by skill</option>
                {myJobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </label>
            {!job && (
              <label>
                <span>Skill</span>
                <select value={skill} onChange={(e) => setSkill(e.target.value)}>
                  <option value={ANY}>Any skill</option>
                  {SKILLS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="dash-note">Sample profiles for testing.</p>

          {!business && <p className="dash-note">Set your business location to see profiles near you.</p>}
          <div className="bento-profiles">
            {profiles.map(({ card, km, fit }) => (
              <article key={card.userId} className="bento-profile">
                <div className="bento-profile-head">
                  <span className="dash-badge small" aria-hidden="true">{card.name.charAt(0)}</span>
                  <strong>{card.name}</strong>
                  {fit && <span className="dash-chip strong">{fit.percent}% fit</span>}
                </div>
                <div className="dash-note">
                  {card.age >= 18 ? '18 and over' : 'Under 18'} · {barangayName(card.barangay)} · {km.toFixed(1)} km away ·{' '}
                  {card.hoursWanted} hrs/week
                </div>
                {(card.yearsExperience !== undefined || card.education || card.employmentStatus) && (
                  <div className="dash-note">
                    {card.yearsExperience !== undefined ? `${card.yearsExperience} yr(s) experience` : ''}
                    {card.education ? ` · ${card.education}` : ''}
                    {card.employmentStatus ? ` · ${card.employmentStatus.replaceAll('_', ' ')}` : ''}
                  </div>
                )}
                {card.certifications && card.certifications.length > 0 && (
                  <div className="dash-note">Training: {card.certifications.join(' · ')}</div>
                )}
                {card.profileSummary && <p className="bento-profile-summary">{card.profileSummary}</p>}
                <div className="dash-chips">
                  {card.skills.map((s) => (
                    <span key={s} className={`dash-chip${job?.skills.includes(s) || s === skill ? ' strong' : ''}`}>
                      {s}
                    </span>
                  ))}
                </div>
                <div className="bento-profile-actions">
                  {invited.has(card.userId) ? (
                    <span className="dash-tag ok">Invite sent (test only, nothing is sent)</span>
                  ) : (
                    <button
                      type="button"
                      className="dash-pill primary"
                      disabled={!job}
                      onClick={() => setInvited(new Set(invited).add(card.userId))}
                    >
                      Invite to apply
                    </button>
                  )}
                  {!job && <span className="dash-note">Pick a job to invite</span>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )

  const people = here && stats ? (
    <PeopleDashboard
      here={here}
      radiusKm={radiusKm}
      codes={stats.barangays}
      selected={barangay}
      onSelect={setSelectedBarangay}
      fullScreen={fullScreen}
    />
  ) : (
    <div className="dash dash-glass">
      <header className="dash-head">
        <div>
          <p className="dash-eyebrow">People looking for work</p>
          <h1>Set your business location first</h1>
          <p className="dash-sub">The counts are for barangays around your business.</p>
        </div>
      </header>
    </div>
  )

  return (
    <MapShell
      navigation={navigation}
      activeNavigation={activeNavigation}
      onNavigationChange={onNavigationChange}
      panelFullScreen={fullScreen}
      onPanelFullScreenChange={setFullScreen}
      detail={barangay ? (
        <BarangayDetail code={barangay} />
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
          heat={activeNavigation === 'people' && showHeat ? heat : []}
          business={business}
          radiusKm={radiusKm}
          places={ownPlaces}
          selectedPlaceId={placeSelected ? ownPlaces[0]?.id : null}
          onPlaceSelect={() => setPlaceSelected(true)}
          jobs={onMapTab ? awayJobs : []}
          onPick={pick}
        />
      }
      overlay={onMapTab ? (
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
            {activeNavigation === 'people' && (
              <button type="button" className={`chip${showHeat ? ' active' : ''}`} aria-pressed={showHeat} onClick={() => setShowHeat(!showHeat)}>
                Rough spread
              </button>
            )}
          </div>
          {moving && <div className="map-hint">Tap the map where your business is.</div>}
          {!moving && business && <div className="map-hint">Store location and building are approximate · demo data</div>}
          {activeNavigation === 'people' && showHeat && (
            <div className="heat-legend">
              <span>Fewer</span>
              <span className="heat-bar" />
              <span>More looking for work · spread inside each barangay is a guess</span>
            </div>
          )}
        </>
      ) : undefined}
      panel={
        <>
          {panelHeader}
          {panelContent ?? (activeNavigation === 'people' ? people : overview)}
        </>
      }
    />
  )
}
