import { useState } from 'react'
import { BARANGAY_CENTERS } from '../../data/barangayGeo'
import { BARANGAY_LABOR } from '../../data/labor'
import { distanceKm } from '../../rules'
import BarangayRanking, { BarangayDetail, OFFLINE_PCT } from './BarangayRanking'

// Samples along the distance axis of the reach chart.
const STEPS = 24

interface Props {
  here: [number, number]
  radiusKm: number
  codes: string[]
  selected: string | null
  onSelect: (code: string | null) => void
  // Full-screen menu covers the lower detail panel, so the selected barangay is shown inline instead.
  fullScreen: boolean
}

// Employer "People looking for work": CBMS barangay counts inside the search radius.
export default function PeopleDashboard({ here, radiusKm, codes, selected, onSelect, fullScreen }: Props) {
  const rows = codes.map((code) => BARANGAY_LABOR[code]).filter((r) => r !== undefined)
  const sum = (key: 'jobseekerPool' | 'unemployed' | 'underemployed' | 'neetYouth') => rows.reduce((t, r) => t + r[key], 0)
  const offline = rows.filter((r) => r.pctNoInternet >= OFFLINE_PCT).length

  const badges = [
    { label: 'Looking for work', value: sum('jobseekerPool'), tone: 'blue' },
    { label: 'Unemployed', value: sum('unemployed'), tone: 'cyan' },
    { label: 'Underemployed', value: sum('underemployed'), tone: 'gold' },
    { label: 'Youth not in school or work', value: sum('neetYouth'), tone: 'orange' },
  ]

  return (
    <div className="dash dash-glass">
      <header className="dash-head">
        <div>
          <p className="dash-eyebrow">People looking for work</p>
          <h1>Within {radiusKm} km of your business</h1>
          <p className="dash-sub">CBMS estimate, counted by whole barangay · no personal records</p>
        </div>
        <span className="dash-tag">CBMS snapshot</span>
      </header>

      <div className="dash-badges">
        {badges.map((b) => (
          <div key={b.label} className={`dash-metric ${b.tone}`}>
            <strong>{b.value.toLocaleString()}</strong>
            <span>{b.label}</span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="glass-card span-wide">
          <div className="glass-card-head">
            <h2>Reach by distance</h2>
            <span className="dash-tag">{codes.length} barangays</span>
          </div>
          <ReachChart here={here} radiusKm={radiusKm} codes={codes} />
        </section>

        <section className="glass-card">
          <div className="glass-card-head">
            <h2>How to reach them</h2>
          </div>
          <p className="dash-big">{offline} <span>of {rows.length}</span></p>
          <p className="dash-note">
            barangays are mostly offline ({OFFLINE_PCT}%+ of households without internet). Post at barangay halls and accept walk-ins there.
          </p>
        </section>

        <section className="glass-card span-wide">
          <div className="glass-card-head">
            <h2>By barangay</h2>
          </div>
          <BarangayRanking codes={codes} selected={selected} onSelect={onSelect} />
        </section>

        {fullScreen && selected && (
          <section className="glass-card dash-selected">
            <BarangayDetail code={selected} />
          </section>
        )}
      </div>
    </div>
  )
}

// Cumulative people looking for work as the distance from the business grows. A barangay counts once its
// center is within the distance, so the curve rises in steps at each barangay center.
function ReachChart({ here, radiusKm, codes }: { here: [number, number]; radiusKm: number; codes: string[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const places = codes
    .filter((code) => BARANGAY_LABOR[code] && BARANGAY_CENTERS[code])
    .map((code) => ({ km: distanceKm(here, BARANGAY_CENTERS[code]), people: BARANGAY_LABOR[code].jobseekerPool }))
  const points = Array.from({ length: STEPS + 1 }, (_, i) => {
    const km = (radiusKm * i) / STEPS
    const inside = places.filter((p) => p.km <= km)
    return { km, people: inside.reduce((t, p) => t + p.people, 0), barangays: inside.length }
  })
  const max = Math.max(1, points[STEPS].people)
  const W = 600
  const H = 180
  const xy = points.map((p, i) => [(i / STEPS) * W, H - (p.people / max) * (H - 8)] as [number, number])
  const line = smoothPath(xy)
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  const active = hover === null ? null : points[hover]

  function track(clientX: number, rect: DOMRect) {
    const i = Math.round(((clientX - rect.left) / rect.width) * STEPS)
    setHover(Math.min(STEPS, Math.max(0, i)))
  }

  if (places.length === 0) return <p className="dash-note">No barangay centers inside this radius.</p>

  return (
    <figure className="reach-chart">
      <div className="reach-plot">
        <span className="reach-y">{max.toLocaleString()}</span>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`People looking for work reached: ${points[STEPS].people.toLocaleString()} within ${radiusKm} km, from ${places.length} barangays.`}
          onPointerMove={(e) => track(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="reach-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f74f0" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#2f74f0" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="reach-grid" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#reach-fill)" />
          <path d={line} className="reach-line" vectorEffect="non-scaling-stroke" />
          {hover !== null && (
            <line x1={xy[hover][0]} x2={xy[hover][0]} y1="0" y2={H} className="reach-cross" vectorEffect="non-scaling-stroke" />
          )}
        </svg>
        {active && hover !== null && (
          <>
            <span className="reach-dot" style={{ left: `${(hover / STEPS) * 100}%`, top: `${(xy[hover][1] / H) * 100}%` }} />
            <div className={`reach-tip${hover > STEPS / 2 ? ' left' : ''}`} style={{ left: `${(hover / STEPS) * 100}%` }}>
              <strong>{active.people.toLocaleString()}</strong>
              <span>within {active.km.toFixed(1)} km · {active.barangays} barangay{active.barangays === 1 ? '' : 's'}</span>
            </div>
          </>
        )}
      </div>
      <div className="reach-x" aria-hidden="true">
        <span>0 km</span>
        <span>{(radiusKm / 2).toFixed(1)} km</span>
        <span>{radiusKm} km</span>
      </div>
      <figcaption className="dash-note">People looking for work, added up as the distance from your business grows.</figcaption>
      <table className="sr-only">
        <caption>People looking for work by distance</caption>
        <thead><tr><th>Within</th><th>People</th><th>Barangays</th></tr></thead>
        <tbody>
          {points.filter((_, i) => i % 6 === 0).map((p) => (
            <tr key={p.km}><td>{p.km.toFixed(1)} km</td><td>{p.people}</td><td>{p.barangays}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

// Monotone cubic curve (Fritsch–Carlson), so the smoothed line never dips below a step it passed.
function smoothPath(pts: [number, number][]): string {
  const n = pts.length
  const d = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / (p[0] - pts[i][0]))
  const m = pts.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2))
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * b * d[i]
    }
  }
  let path = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = (pts[i + 1][0] - pts[i][0]) / 3
    path += ` C ${pts[i][0] + h} ${pts[i][1] + m[i] * h} ${pts[i + 1][0] - h} ${pts[i + 1][1] - m[i + 1] * h} ${pts[i + 1][0]} ${pts[i + 1][1]}`
  }
  return path
}
