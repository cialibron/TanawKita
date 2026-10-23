import { useState } from 'react'
import { areaStats, type AreaCount, type NearbySeeker } from '../../area'
import { barangayName } from '../../data/barangays'

const METRICS = [
  { key: 'lookingForWork', label: 'Looking for work' },
  { key: 'idleYouth', label: 'Youth 15–24 not in school or work' },
  { key: 'tvetCertified', label: 'TVET certified' },
  { key: 'dailyPaid', label: 'Want daily pay' },
] as const satisfies readonly { key: AreaCount; label: string }[]

type MetricKey = (typeof METRICS)[number]['key']

// Rows shown before "Show all".
const TOP = 8
// At or above this share of profiles without internet of their own, the barangay is tagged "Mostly offline".
export const OFFLINE_PCT = 30

interface Props {
  // Demo jobseeker profiles inside the search radius.
  seekers: NearbySeeker[]
  selected: string | null
  onSelect: (code: string | null) => void
}

const inBarangay = (seekers: NearbySeeker[], code: string) => seekers.filter((s) => s.card.barangay === code)

// Barangays where the demo jobseeker profiles inside the search radius live, ranked by a count of those profiles.
export default function BarangayRanking({ seekers, selected, onSelect }: Props) {
  const [metric, setMetric] = useState<MetricKey>('lookingForWork')
  const [showAll, setShowAll] = useState(false)

  const rows = areaStats(seekers).barangays
    .map((code) => {
      const stats = areaStats(inBarangay(seekers, code))
      return { code, value: stats[metric], offline: (stats.offline / stats.lookingForWork) * 100 >= OFFLINE_PCT }
    })
    .sort((a, b) => b.value - a.value)
  const max = rows[0]?.value || 1
  const visible = showAll ? rows : rows.slice(0, TOP)
  const label = METRICS.find((m) => m.key === metric)!.label

  if (rows.length === 0) return <p className="dash-note">No demo jobseeker profiles inside this radius. Try a wider one.</p>

  return (
    <div className="barangay-ranking">
      <div className="dash-capsules" role="group" aria-label="Rank barangays by">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`dash-capsule${metric === m.key ? ' active' : ''}`}
            aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <ol className="ranking-list" aria-label={`Barangays ranked by ${label.toLowerCase()}`}>
        {visible.map((row) => (
          <li key={row.code}>
            <button
              type="button"
              className={`dash-row${selected === row.code ? ' active' : ''}`}
              aria-pressed={selected === row.code}
              onClick={() => onSelect(selected === row.code ? null : row.code)}
            >
              <span className="ranking-name">
                {barangayName(row.code)}
                <span className={`dash-tag ${row.offline ? 'warn' : 'online'}`}>{row.offline ? 'Mostly offline' : 'Online'}</span>
              </span>
              <span className="ranking-value">{row.value.toLocaleString()}</span>
              <span className="ranking-bar" aria-hidden="true">
                <span style={{ width: `${(row.value / max) * 100}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ol>
      {rows.length > TOP && (
        <button type="button" className="dash-link" onClick={() => setShowAll(!showAll)}>
          {showAll ? `Show top ${TOP}` : `Show all ${rows.length} barangays`}
        </button>
      )}
    </div>
  )
}

// One barangay's demo jobseeker profiles inside the search radius, with a plain hint on how to reach them.
// Used in the lower detail panel, and inline when the menu is full screen.
export function BarangayDetail({ code, seekers }: { code: string; seekers: NearbySeeker[] }) {
  const stats = areaStats(inBarangay(seekers, code))
  if (stats.lookingForWork === 0) return null
  const pctOffline = Math.round((stats.offline / stats.lookingForWork) * 100)
  return (
    <div className="selected-business-detail">
      <div className="detail-kicker">BARANGAY · DEMO JOBSEEKER PROFILES (SYNTHETIC)</div>
      <h2>{barangayName(code)}</h2>
      <p className="muted">{stats.lookingForWork} profile(s) inside your search radius · not real people</p>
      <div className="selected-job-metrics">
        <div><span>Looking for work</span><strong>{stats.lookingForWork.toLocaleString()}</strong></div>
        <div><span>Unemployed</span><strong>{stats.unemployed.toLocaleString()}</strong></div>
        <div><span>Underemployed</span><strong>{stats.underemployed.toLocaleString()}</strong></div>
        <div><span>TVET certified</span><strong>{stats.tvetCertified.toLocaleString()}</strong></div>
      </div>
      <p className="reach-hint">
        {pctOffline >= OFFLINE_PCT
          ? `${pctOffline}% of these profiles have no internet of their own. Post at the barangay hall and accept walk-ins too.`
          : `${100 - pctOffline}% of these profiles have their own phone with internet. Online posts should reach most of them.`}
      </p>
    </div>
  )
}
