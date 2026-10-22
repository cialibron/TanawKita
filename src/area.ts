import { BARANGAY_CENTERS } from './data/barangayGeo'
import { BARANGAY_LABOR, type BarangayLabor } from './data/labor'
import { distanceKm } from './rules'

// CBMS totals for the barangays whose centers fall within a radius. Approximate: whole barangays are in or out.
export interface AreaStats {
  barangays: string[]
  households: number
  jobseekerPool: number
  neetYouth: number
  tvetGrads: number
  casualWorkers: number
  dailyPaid: number
  microBusinesses: number
  // Household-weighted average, in percent.
  pctNoInternet: number
  pctSmartphone: number
}

export function barangaysWithin(center: [number, number], km: number): string[] {
  return Object.entries(BARANGAY_CENTERS)
    .filter(([, point]) => distanceKm(center, point) <= km)
    .map(([code]) => code)
}

export function areaStats(codes: string[]): AreaStats {
  const rows = codes.map((c) => BARANGAY_LABOR[c]).filter((r): r is BarangayLabor => r !== undefined)
  const sum = (key: keyof BarangayLabor) => rows.reduce((total, r) => total + r[key], 0)
  const households = sum('households')
  const weighted = (key: keyof BarangayLabor) =>
    households > 0 ? rows.reduce((total, r) => total + r[key] * r.households, 0) / households : 0
  return {
    barangays: codes,
    households,
    jobseekerPool: sum('jobseekerPool'),
    neetYouth: sum('neetYouth'),
    tvetGrads: sum('tvetGrads'),
    casualWorkers: sum('casualWorkers'),
    dailyPaid: sum('dailyPaid'),
    microBusinesses: sum('microBusinesses'),
    pctNoInternet: weighted('pctNoInternet'),
    pctSmartphone: weighted('pctSmartphone'),
  }
}

// One heat point stands for this many people looking for work.
export const PEOPLE_PER_HEAT_POINT = 20

// Seeded random numbers so the heatmap looks the same on every load.
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

// We have no barangay boundaries yet, so each barangay's jobseeker pool is spread as points around its center,
// over a radius that grows with population. Denser areas get more points, which the heat layer turns into color.
export function jobseekerHeat(): [number, number, number][] {
  const points: [number, number, number][] = []
  for (const [code, [lat, lng]] of Object.entries(BARANGAY_CENTERS)) {
    const labor = BARANGAY_LABOR[code]
    if (!labor) continue
    const count = Math.max(1, Math.round(labor.jobseekerPool / PEOPLE_PER_HEAT_POINT))
    const radiusKm = Math.min(2.5, 0.4 + Math.sqrt(labor.population) / 200)
    const rand = seeded(Number(code) + 1)
    for (let i = 0; i < count; i++) {
      // sqrt keeps points evenly spread over the circle instead of bunching at the center.
      const r = (radiusKm * Math.sqrt(rand())) / 111
      const angle = rand() * 2 * Math.PI
      points.push([lat + r * Math.sin(angle), lng + (r * Math.cos(angle)) / Math.cos((lat * Math.PI) / 180), 1])
    }
  }
  return points
}

export function nearestBarangay(point: [number, number]): string | null {
  let best: string | null = null
  let bestKm = Infinity
  for (const [code, center] of Object.entries(BARANGAY_CENTERS)) {
    const km = distanceKm(point, center)
    if (km < bestKm) {
      bestKm = km
      best = code
    }
  }
  return best
}

// Profiles only have a barangay, so place each one near its barangay center with a small fixed offset (about 500 m).
export function seekerPoint(userId: string, barangay: string): [number, number] | null {
  const center = BARANGAY_CENTERS[barangay]
  if (!center) return null
  let hash = 0
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  const angle = ((hash >>> 0) % 360) * (Math.PI / 180)
  const r = 0.002 + (((hash >>> 8) % 100) / 100) * 0.003
  return [center[0] + r * Math.sin(angle), center[1] + r * Math.cos(angle)]
}
