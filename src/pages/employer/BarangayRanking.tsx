import { useState } from 'react'
import { BARANGAY_LABOR, type BarangayLabor } from '../../data/labor'
import { barangayName } from '../../data/barangays'

const METRICS = [
  { key: 'jobseekerPool', label: 'Looking for work' },
  { key: 'neetYouth', label: 'Youth not in school or work' },
  { key: 'tvetGrads', label: 'TVET graduates' },
  { key: 'dailyPaid', label: 'Paid by the day' },
] as const satisfies readonly { key: keyof BarangayLabor; label: string }[]

type MetricKey = (typeof METRICS)[number]['key']

// Rows shown before "Show all".
const TOP = 8
// At or above this share of households without internet, the barangay is tagged "Mostly offline".
export const OFFLINE_PCT = 30

interface Props {
  codes: string[]
  selected: string | null
  onSelect: (code: string | null) => void
}

// Barangays inside the search radius, ranked by a CBMS count. One number per barangay, as CBMS reports it.
export default function BarangayRanking({ codes, selected, onSelect }: Props) {
  const [metric, setMetric] = useState<MetricKey>('jobseekerPool')
  const [showAll, setShowAll] = useState(false)

  const rows = codes
    .filter((code) => BARANGAY_LABOR[code])
    .map((code) => ({ code, value: BARANGAY_LABOR[code][metric], offline: BARANGAY_LABOR[code].pctNoInternet >= OFFLINE_PCT }))
    .sort((a, b) => b.value - a.value)
  const max = rows[0]?.value || 1
  const visible = showAll ? rows : rows.slice(0, TOP)
  const label = METRICS.find((m) => m.key === metric)!.label

  if (rows.length === 0) return <p className="dash-note">No barangay centers fall inside this radius. Try a wider one.</p>

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

// One barangay's CBMS numbers, with a plain hint on how to reach people there.
// Used in the lower detail panel, and inline when the menu is full screen.
export function BarangayDetail({ code }: { code: string }) {
  const labor = BARANGAY_LABOR[code]
  if (!labor) return null
  const offline = labor.pctNoInternet >= OFFLINE_PCT
  return (
    <div className="selected-business-detail">
      <div className="detail-kicker">BARANGAY · CBMS ESTIMATE</div>
      <h2>{barangayName(code)}</h2>
      <p className="muted">{labor.population.toLocaleString()} residents · {labor.households.toLocaleString()} households</p>
      <div className="selected-job-metrics">
        <div><span>Looking for work</span><strong>{labor.jobseekerPool.toLocaleString()}</strong></div>
        <div><span>Unemployed</span><strong>{labor.unemployed.toLocaleString()}</strong></div>
        <div><span>Underemployed</span><strong>{labor.underemployed.toLocaleString()}</strong></div>
        <div><span>TVET graduates</span><strong>{labor.tvetGrads.toLocaleString()}</strong></div>
      </div>
      <p className="reach-hint">
        {offline
          ? `${Math.round(labor.pctNoInternet)}% of households have no internet. Post at the barangay hall and accept walk-ins too.`
          : `${Math.round(labor.pctSmartphone)}% of households have a smartphone. Online posts should reach most people.`}
      </p>
    </div>
  )
}
