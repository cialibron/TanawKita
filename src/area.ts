import { BARANGAY_CENTERS } from './data/barangayGeo'
import { jobseekerSheet } from './data/simulation'
import { distanceKm } from './rules'
import type { SkillCard } from './types'

// A jobseeker profile and the map point the employer side counts it at.
export interface SeekerPin {
  card: SkillCard
  point: [number, number]
}

export interface NearbySeeker extends SeekerPin {
  km: number
}

// Employment statuses used in the demo jobseeker sheet, grouped for the employer counts.
const NOT_WORKING = new Set(['actively_seeking', 'unemployed', 'new_graduate', 'out_of_school_youth', 'returning_to_work'])
const UNDEREMPLOYED = new Set(['underemployed', 'informal_daily_worker'])
// Digital access values that mean no internet of their own: online posts may not reach them.
const OFFLINE_ACCESS = new Set(['basic_phone_sms', 'shared_phone', 'no_phone'])

export const isNotWorking = (card: SkillCard) => NOT_WORKING.has(card.employmentStatus ?? '')
export const isUnderemployed = (card: SkillCard) => UNDEREMPLOYED.has(card.employmentStatus ?? '')
export const isOffline = (card: SkillCard) => OFFLINE_ACCESS.has(card.digitalAccess ?? '')
export const isTvetCertified = (card: SkillCard) => (card.certifications ?? []).some((c) => /TESDA|NC|TVET/i.test(c))
// Youth 15 to 24 who are neither working nor studying.
export const isIdleYouth = (card: SkillCard) => card.age >= 15 && card.age <= 24 && isNotWorking(card)
export const wantsDailyPay = (card: SkillCard) => (card.expectedPayUnit ?? 'day') === 'day'

// Every jobseeker profile in the system: the demo sheet (Viola, Ana and the background profiles) at their sheet points,
// plus profiles made in the app, placed near their barangay center. An edited sheet profile keeps its point
// unless its barangay changed.
export function systemJobseekers(cards: Record<string, SkillCard>): SeekerPin[] {
  const pins = new Map<string, SeekerPin>(jobseekerSheet.map(({ card, point }) => [card.userId, { card, point }]))
  for (const card of Object.values(cards)) {
    const sheet = pins.get(card.userId)
    const point = sheet && sheet.card.barangay === card.barangay ? sheet.point : seekerPoint(card.userId, card.barangay)
    if (point) pins.set(card.userId, { card, point })
    else pins.delete(card.userId)
  }
  return [...pins.values()]
}

// Profiles whose point is within km of the center, by real distance, nearest first.
export function seekersWithin(pins: SeekerPin[], center: [number, number], km: number): NearbySeeker[] {
  return pins
    .map((pin) => ({ ...pin, km: distanceKm(center, pin.point) }))
    .filter((pin) => pin.km <= km)
    .sort((a, b) => a.km - b.km)
}

// Counts over a set of demo jobseeker profiles (synthetic), not official statistics.
export interface AreaStats {
  // Barangays the profiles live in, most profiles first.
  barangays: string[]
  lookingForWork: number
  unemployed: number
  underemployed: number
  idleYouth: number
  tvetCertified: number
  dailyPaid: number
  offline: number
}

export type AreaCount = Exclude<keyof AreaStats, 'barangays'>

export function areaStats(pins: SeekerPin[]): AreaStats {
  const cards = pins.map((pin) => pin.card)
  const count = (test: (card: SkillCard) => boolean) => cards.filter(test).length
  const perBarangay = new Map<string, number>()
  for (const card of cards) perBarangay.set(card.barangay, (perBarangay.get(card.barangay) ?? 0) + 1)
  return {
    barangays: [...perBarangay.entries()].sort((a, b) => b[1] - a[1]).map(([code]) => code),
    lookingForWork: cards.length,
    unemployed: count(isNotWorking),
    underemployed: count(isUnderemployed),
    idleYouth: count(isIdleYouth),
    tvetCertified: count(isTvetCertified),
    dailyPaid: count(wantsDailyPay),
    offline: count(isOffline),
  }
}

// One heat point per jobseeker profile, at its map point.
export function jobseekerHeat(pins: SeekerPin[]): [number, number, number][] {
  return pins.map(({ point }) => [point[0], point[1], 1])
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

// Profiles made in the app only have a barangay, so place each one near its barangay center with a small fixed offset (about 500 m).
export function seekerPoint(userId: string, barangay: string): [number, number] | null {
  const center = BARANGAY_CENTERS[barangay]
  if (!center) return null
  let hash = 0
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  const angle = ((hash >>> 0) % 360) * (Math.PI / 180)
  const r = 0.002 + (((hash >>> 8) % 100) / 100) * 0.003
  return [center[0] + r * Math.sin(angle), center[1] + r * Math.cos(angle)]
}
