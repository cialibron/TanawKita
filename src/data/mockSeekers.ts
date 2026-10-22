import { DAYS, distanceKm, SKILLS, userIdFor } from '../rules'
import type { SkillCard } from '../types'
import { BARANGAY_CENTERS } from './barangayGeo'

// SAMPLE DATA: fictional jobseekers for testing the employer feed. Not real people, not from CBMS records.
const FIRST = ['Mark', 'Joy', 'Rico', 'Liza', 'Ken', 'Ella', 'Paolo', 'Grace', 'Jomar', 'Kaye', 'Arvin', 'Mica', 'Dennis', 'Rhea', 'Neil', 'Shane', 'Carlo', 'Jen', 'Ramil', 'Faith']
const LAST = ['Santos', 'Bautista', 'Garcia', 'Mendoza', 'Villanueva', 'Ramos', 'Torres', 'Flores', 'Aquino', 'Castillo', 'Navarro', 'Dizon', 'Lim', 'Abellana', 'Cabahug']

// Barangays within 4 km of the three pilot areas (Talomo, Bucana, Tibungco) so the feed has nearby profiles.
const PILOTS = ['116', '020', '124']
export const NEARBY_BARANGAYS = [
  ...new Set([
    ...PILOTS,
    ...Object.entries(BARANGAY_CENTERS)
      .filter(([, point]) => PILOTS.some((p) => BARANGAY_CENTERS[p] && distanceKm(BARANGAY_CENTERS[p], point) <= 4))
      .map(([code]) => code),
  ]),
]

// Small seeded random generator so the sample is the same on every load.
export function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

export function mockSeekers(count = 40): SkillCard[] {
  const rand = rng(42)
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]
  const cards: SkillCard[] = []
  const used = new Set<string>()
  while (cards.length < count) {
    const name = `${pick(FIRST)} ${pick(LAST)}`
    if (used.has(name)) continue
    used.add(name)
    const age = rand() < 0.15 ? 16 + Math.floor(rand() * 2) : 18 + Math.floor(rand() * 28)
    const skills = [...new Set([pick(SKILLS), pick(SKILLS), ...(rand() < 0.4 ? [pick(SKILLS)] : [])])]
    cards.push({
      userId: userIdFor('jobseeker', name),
      name,
      age,
      barangay: pick(NEARBY_BARANGAYS),
      skills,
      hoursWanted: pick([16, 24, 32, 40]),
      daysAvailable: DAYS.filter(() => rand() < 0.6),
      expectedPay: rand() < 0.5 ? pick([450, 500, 550, 600]) : null,
      guardianConsent: age < 18,
    })
  }
  return cards
}
