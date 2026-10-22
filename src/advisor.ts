import { BARANGAY_CENTERS } from './data/barangayGeo'
import { areaStats, barangaysWithin, type AreaStats } from './area'

// Rule-based business advisor. It compares the area around a barangay with the city average using CBMS aggregates.
// PROTOTYPE: the ideas, costs and weights are rough placeholders, not market research or financial advice.

export const ADVISOR_RADIUS_KM = 3

export type Budget = 'low' | 'mid' | 'high'
export const BUDGETS: { id: Budget; label: string; max: number }[] = [
  { id: 'low', label: 'Under ₱20,000', max: 20_000 },
  { id: 'mid', label: '₱20,000 – ₱100,000', max: 100_000 },
  { id: 'high', label: 'Over ₱100,000', max: Infinity },
]

export type HireSize = 'solo' | 'small' | 'team'
export const HIRE_SIZES: { id: HireSize; label: string; workers: number }[] = [
  { id: 'solo', label: 'Just me or 1 helper', workers: 1 },
  { id: 'small', label: '2 to 5 workers', workers: 4 },
  { id: 'team', label: '6 or more workers', workers: 8 },
]

// Per-household rates and shares that describe local demand, compared against the city average.
type Driver = 'households' | 'casualRate' | 'dailyPaidRate' | 'neetRate' | 'tvetRate' | 'noInternet' | 'smartphone'

const DRIVER_TEXT: Record<Driver, string> = {
  households: 'many households nearby',
  casualRate: 'many casual workers (daily meals, quick services)',
  dailyPaidRate: 'many daily-paid workers',
  neetRate: 'many out-of-school, out-of-work youth',
  tvetRate: 'many TVET graduates to hire',
  noInternet: 'many homes without internet',
  smartphone: 'high smartphone use',
}

export interface BusinessIdea {
  id: string
  name: string
  startCost: number
  workers: number
  skills: string[]
  drivers: Driver[]
  steps: string[]
}

export const IDEAS: BusinessIdea[] = [
  {
    id: 'carinderia',
    name: 'Carinderia (budget meals)',
    startCost: 30_000,
    workers: 3,
    skills: ['Food preparation', 'Customer service'],
    drivers: ['casualRate', 'dailyPaidRate', 'households'],
    steps: ['Get a sanitary permit from the City Health Office', 'Hire cooks and servers from nearby barangays', 'Offer ₱60–₱80 meals for workers'],
  },
  {
    id: 'laundry',
    name: 'Laundry shop',
    startCost: 80_000,
    workers: 2,
    skills: ['Housekeeping', 'Customer service'],
    drivers: ['households', 'smartphone'],
    steps: ['Start with 2 washers and a dryer', 'Take orders by text or Messenger', 'Offer pickup and delivery by kilo'],
  },
  {
    id: 'printing',
    name: 'Printing, e-load and online services',
    startCost: 40_000,
    workers: 1,
    skills: ['Computer literacy', 'Customer service'],
    drivers: ['noInternet', 'households'],
    steps: ['Printer, laptop and a stable internet plan', 'Help residents with online forms and payments', 'Add e-wallet cash-in and bills payment'],
  },
  {
    id: 'tailoring',
    name: 'Tailoring and alterations',
    startCost: 15_000,
    workers: 2,
    skills: ['Sewing'],
    drivers: ['households', 'tvetRate'],
    steps: ['Start with 1–2 sewing machines', 'Take school uniform orders before June', 'Hire TESDA-trained sewers'],
  },
  {
    id: 'repair-crew',
    name: 'Home repair and construction crew',
    startCost: 25_000,
    workers: 5,
    skills: ['Carpentry', 'Masonry', 'Electrical', 'Welding'],
    drivers: ['casualRate', 'tvetRate', 'households'],
    steps: ['Build a crew of skilled workers by trade', 'Price by task (pakyaw) with a written quote', 'Post short jobs on TanawKita as they come'],
  },
  {
    id: 'sari-sari',
    name: 'Sari-sari store',
    startCost: 10_000,
    workers: 1,
    skills: ['Sales'],
    drivers: ['households', 'dailyPaidRate'],
    steps: ['Stock daily essentials in small packs (tingi)', 'Add e-load to bring in foot traffic', 'Keep a simple daily sales notebook'],
  },
  {
    id: 'delivery',
    name: 'Local delivery and errands',
    startCost: 20_000,
    workers: 4,
    skills: ['Driving', 'Customer service'],
    drivers: ['households', 'smartphone', 'neetRate'],
    steps: ['Partner with nearby stores and carinderias', 'Take orders by text or Messenger', 'Hire riders with licenses; pay per delivery'],
  },
  {
    id: 'cleaning',
    name: 'Home and office cleaning service',
    startCost: 12_000,
    workers: 4,
    skills: ['Housekeeping'],
    drivers: ['households', 'smartphone'],
    steps: ['Buy basic cleaning kits', 'Sell weekly or monthly packages', 'Train workers on a standard checklist'],
  },
  {
    id: 'training',
    name: 'Skills training and tutoring hub',
    startCost: 60_000,
    workers: 3,
    skills: ['Computer literacy', 'Customer service'],
    drivers: ['neetRate', 'noInternet'],
    steps: ['Partner with TESDA or the barangay for short courses', 'Offer computer basics for youth', 'Link graduates to jobs on TanawKita'],
  },
  {
    id: 'agri',
    name: 'Fruit and vegetable processing',
    startCost: 120_000,
    workers: 6,
    skills: ['Agriculture', 'Food preparation'],
    drivers: ['casualRate', 'neetRate'],
    steps: ['Source from nearby farms', 'Make dried or packed products (e.g. durian, banana chips)', 'Get FDA and DTI help through a Negosyo Center'],
  },
]

// Values for one area, used to compare against the city average.
function driverValues(s: AreaStats): Record<Driver, number> {
  const hh = Math.max(s.households, 1)
  return {
    households: s.households,
    casualRate: s.casualWorkers / hh,
    dailyPaidRate: s.dailyPaid / hh,
    neetRate: s.neetYouth / hh,
    tvetRate: s.tvetGrads / hh,
    noInternet: s.pctNoInternet,
    smartphone: s.pctSmartphone,
  }
}

const saturation = (s: AreaStats) => s.microBusinesses / Math.max(s.households, 1)

let cityAverages: { drivers: Record<Driver, number>; saturation: number; jobseekerPool: number } | null = null

// Average of every barangay's surrounding area, computed once.
function averages() {
  if (cityAverages) return cityAverages
  const areas = Object.values(BARANGAY_CENTERS).map((c) => areaStats(barangaysWithin(c, ADVISOR_RADIUS_KM)))
  const mean = (f: (s: AreaStats) => number) => areas.reduce((t, s) => t + f(s), 0) / Math.max(areas.length, 1)
  const keys = Object.keys(DRIVER_TEXT) as Driver[]
  cityAverages = {
    drivers: Object.fromEntries(keys.map((k) => [k, mean((s) => driverValues(s)[k])])) as Record<Driver, number>,
    saturation: mean(saturation),
    jobseekerPool: mean((s) => s.jobseekerPool),
  }
  return cityAverages
}

export interface AdvisorInput {
  barangay: string
  budget: Budget
  skills: string[]
  hireSize: HireSize
}

export interface Suggestion {
  idea: BusinessIdea
  score: number
  reasons: string[]
  cautions: string[]
}

export interface AdvisorResult {
  area: AreaStats
  // Every idea within budget, best first.
  suggestions: Suggestion[]
}

// Ratio to the city average, capped so one number cannot dominate.
const index = (value: number, average: number) => Math.min(value / Math.max(average, 1e-9), 2)

export function adviseBusinesses(input: AdvisorInput): AdvisorResult | null {
  const center = BARANGAY_CENTERS[input.barangay]
  if (!center) return null
  const area = areaStats(barangaysWithin(center, ADVISOR_RADIUS_KM))
  const avg = averages()
  const values = driverValues(area)
  const budgetMax = BUDGETS.find((b) => b.id === input.budget)!.max
  const hireWorkers = HIRE_SIZES.find((h) => h.id === input.hireSize)!.workers

  const suggestions = IDEAS.filter((idea) => idea.startCost <= budgetMax).map((idea) => {
    const reasons: string[] = []
    const cautions: string[] = []

    // Demand (up to 45): how far the area is above the city average on this idea's drivers.
    const driverIndexes = idea.drivers.map((d) => ({ d, i: index(values[d], avg.drivers[d]) }))
    const demand = (driverIndexes.reduce((t, x) => t + x.i, 0) / driverIndexes.length / 2) * 45
    driverIndexes
      .filter((x) => x.i >= 1.1)
      .forEach((x) => reasons.push(`${DRIVER_TEXT[x.d]} (${Math.round(x.i * 100 - 100)}% above city average)`))

    // Owner skills (up to 25).
    const overlap = idea.skills.filter((s) => input.skills.includes(s))
    const skillPoints = (Math.min(overlap.length, 2) / 2) * 25
    if (overlap.length) reasons.push(`Uses your skills: ${overlap.join(', ')}`)
    else cautions.push(`You may need to hire for: ${idea.skills.join(', ')}`)

    // Workers available nearby (up to 15).
    const laborPoints = (index(area.jobseekerPool, avg.jobseekerPool) / 2) * 15
    if (area.jobseekerPool > 0) reasons.push(`${area.jobseekerPool.toLocaleString()} people looking for work within ${ADVISOR_RADIUS_KM} km`)

    // Team size fit (up to 15).
    const sizePoints = 15 - Math.min(Math.abs(idea.workers - hireWorkers), 5) * 3

    // Competition: many existing micro-businesses per household lowers the score.
    const crowd = index(saturation(area), avg.saturation)
    const competitionPenalty = Math.max(crowd - 1, 0) * 15
    if (crowd > 1.2) cautions.push('Many small businesses already in the area: find a gap before copying what exists')

    const score = Math.round(Math.max(0, Math.min(100, demand + skillPoints + laborPoints + sizePoints - competitionPenalty)))
    return { idea, score, reasons, cautions }
  })

  suggestions.sort((a, b) => b.score - a.score)
  return { area, suggestions }
}
