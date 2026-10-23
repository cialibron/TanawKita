import { useMemo, useState, type ReactNode } from 'react'
import AreaMap from '../../components/AreaMap'
import { BarangayDetail } from './BarangayRanking'
import PeopleDashboard from './PeopleDashboard'
import MapShell, { type WorkspaceNavItem } from '../../components/MapShell'
import { areaStats, jobseekerHeat, nearestBarangay, seekersWithin, systemJobseekers } from '../../area'
import { barangayName } from '../../data/barangays'
import { distanceKm, matchScore } from '../../rules'
import SkillPicker from '../../components/SkillPicker'
import { chosenSkills, matchGroups } from '../../components/skillCatalog'
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
  // The heat layer shows where the demo jobseeker profiles live; it stays off unless asked for.
  const [showHeat, setShowHeat] = useState(false)
  const [fullScreen, setFullScreen] = useState(false)
  const onMapTab = activeNavigation === 'area' || activeNavigation === 'people'

  // Every jobseeker profile in the system: the demo sheet plus profiles made in the app.
  const seekers = useMemo(() => systemJobseekers(state.skillCards), [state.skillCards])
  const heat = useMemo(() => jobseekerHeat(seekers), [seekers])
  const [placeSelected, setPlaceSelected] = useState(false)
  // The business as a job-map callout, at its saved location. Only demo-sheet businesses have the profile it needs.
  const ownPlaces = useMemo(() => {
    if (!business) return []
    return employerPlaces([session.userId]).map((place) => ({ ...place, lat: business.lat, lng: business.lng }))
  }, [session.userId, business])
  // As on the job map, jobs at the business are reached through its callout; jobs elsewhere get their own pay tag.
  const awayJobs = business ? myJobs.filter((j) => ownPlaces.length === 0 || distanceKm([j.lat, j.lng], [business.lat, business.lng]) > 0.15) : myJobs
  const here: [number, number] | null = business ? [business.lat, business.lng] : null
  // Profiles inside the search radius, by real distance from the business, nearest first.
  const nearby = useMemo(() => (business ? seekersWithin(seekers, [business.lat, business.lng], radiusKm) : []), [seekers, business, radiusKm])
  const stats = here ? areaStats(nearby) : null
  // Where those profiles are, as dots inside the circle. Points are approximate simulation locations, not homes.
  const nearbyPoints = useMemo(() => nearby.map((p) => p.point), [nearby])
  const job = myJobs.find((j) => j.id === jobId)
  // Drop the selection once its barangay leaves the radius or another tab is open.
  const barangay = activeNavigation === 'people' && selectedBarangay && stats?.barangays.includes(selectedBarangay) ? selectedBarangay : null

  // Profiles within the radius, scored against the chosen job or skill.
  const profiles = here
    ? nearby
        .filter((p) => !job || p.card.age >= 18 || job.minorsAllowed)
        .filter((p) => job || !skill || [skill, ...matchGroups([skill])].some((s) => p.card.skills.includes(s)))
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
    { label: 'Looking for work', value: stats.lookingForWork, icon: '◍', tone: 'blue' },
    { label: 'Youth 15–24 not in school or work', value: stats.idleYouth, icon: '✦', tone: 'cyan' },
    { label: 'TVET certified', value: stats.tvetCertified, icon: '✎', tone: 'gold' },
    { label: 'Want daily pay', value: stats.dailyPaid, icon: '◷', tone: 'orange' },
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
                <p className="dash-note">Demo jobseeker profiles (synthetic) living inside the circle, from {stats.barangays.length} barangay(s). Not real people.</p>
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
              <div className="bento-skill-filter">
                <SkillPicker
                  single
                  allowCustom={false}
                  value={skill ? [skill] : []}
                  onChange={(list) => setSkill(list[0] ?? ANY)}
                  label="Skill"
                  placeholder="Any skill · type to filter"
                />
              </div>
            )}
          </div>
          <p className="dash-note">Demo jobseeker profiles (synthetic) for testing · not real people.</p>

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
                  {chosenSkills(card.skills).map((s) => (
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
      radiusKm={radiusKm}
      seekers={nearby}
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
          <p className="dash-sub">The counts are for demo jobseeker profiles around your business.</p>
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
      detailIsSelection={Boolean(barangay)}
      detail={barangay ? (
        <BarangayDetail code={barangay} seekers={nearby} />
      ) : business ? (
        <div className="selected-business-detail">
          <div className="detail-kicker">CURRENT BUSINESS AREA</div>
          <h2>{business.name}</h2>
          <p className="muted">{barangayName(business.barangay)} · {radiusKm} km talent search radius</p>
          {stats && <div className="selected-job-metrics">
            <div><span>Looking for work</span><strong>{stats.lookingForWork.toLocaleString()}</strong></div>
            <div><span>TVET certified</span><strong>{stats.tvetCertified.toLocaleString()}</strong></div>
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
          people={onMapTab ? nearbyPoints : []}
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
                Profile heat
              </button>
            )}
          </div>
          {moving && <div className="map-hint">Tap the map where your business is.</div>}
          {!moving && business && (
            <div className="map-hint">
              <span className="map-hint-dot" aria-hidden="true" /> {nearby.length} demo jobseeker profiles in the circle · store, building and
              profile locations are approximate demo data
            </div>
          )}
          {activeNavigation === 'people' && showHeat && (
            <div className="heat-legend">
              <span>Fewer</span>
              <span className="heat-bar" />
              <span>More demo jobseeker profiles (synthetic) · one point per profile</span>
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
