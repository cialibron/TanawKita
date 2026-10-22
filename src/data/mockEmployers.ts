import { userIdFor } from '../rules'
import type { Application, ApplicationStatus, Business, JobPost, JobType, PayUnit, SkillCard } from '../types'
import { requiredDocs, type EmployerKind, type Verification, type VerificationStatus } from '../verification'
import { BARANGAY_CENTERS } from './barangayGeo'
import { NEARBY_BARANGAYS, rng } from './mockSeekers'

// SAMPLE DATA: fictional employers, jobs and applications for testing. Names, numbers and documents are made up.

interface JobTemplate {
  title: string
  skills: string[]
  payAmount: number
  payUnit: PayUnit
  jobType: JobType
  hoursPerWeek: number
  workers: number
  minorsAllowed?: boolean
}

interface EmployerTemplate {
  name: string
  kind: EmployerKind
  status: VerificationStatus
  // Has SSS, PhilHealth and Pag-IBIG employer numbers (needed for part-time and full-time jobs).
  employerNumbers: boolean
  rejectReason?: string
  jobs: JobTemplate[]
}

const EMPLOYERS: EmployerTemplate[] = [
  {
    name: 'Kusina ni Aling Rosa',
    kind: 'sole-prop',
    status: 'verified',
    employerNumbers: true,
    jobs: [
      { title: 'Cook (lunch rush)', skills: ['Food preparation'], payAmount: 600, payUnit: 'day', jobType: 'part-time', hoursPerWeek: 30, workers: 1 },
      { title: 'Server and cashier', skills: ['Customer service', 'Sales'], payAmount: 520, payUnit: 'day', jobType: 'part-time', hoursPerWeek: 24, workers: 2 },
    ],
  },
  {
    name: 'Suki Laundry Station',
    kind: 'sole-prop',
    status: 'verified',
    employerNumbers: true,
    jobs: [{ title: 'Laundry attendant', skills: ['Housekeeping', 'Customer service'], payAmount: 70, payUnit: 'hour', jobType: 'part-time', hoursPerWeek: 28, workers: 2 }],
  },
  {
    name: 'JM Print and E-load Center',
    kind: 'sole-prop',
    status: 'verified',
    employerNumbers: false,
    jobs: [{ title: 'Printing helper (weekend)', skills: ['Computer literacy', 'Customer service'], payAmount: 500, payUnit: 'day', jobType: 'short-term', hoursPerWeek: 16, workers: 1, minorsAllowed: true }],
  },
  {
    name: 'Dela Peña Tailoring',
    kind: 'sole-prop',
    status: 'verified',
    employerNumbers: false,
    jobs: [{ title: 'School uniform sewing (pakyaw)', skills: ['Sewing'], payAmount: 150, payUnit: 'task', jobType: 'short-term', hoursPerWeek: 20, workers: 3 }],
  },
  {
    name: 'Buhay Construction Services',
    kind: 'corporation',
    status: 'verified',
    employerNumbers: true,
    jobs: [
      { title: 'Mason', skills: ['Masonry'], payAmount: 700, payUnit: 'day', jobType: 'full-time', hoursPerWeek: 48, workers: 4 },
      { title: 'Carpenter', skills: ['Carpentry'], payAmount: 700, payUnit: 'day', jobType: 'full-time', hoursPerWeek: 48, workers: 2 },
    ],
  },
  {
    name: 'Kidlat Motor Repair',
    kind: 'sole-prop',
    status: 'verified',
    employerNumbers: true,
    jobs: [{ title: 'Welder and repair helper', skills: ['Welding', 'Electrical'], payAmount: 650, payUnit: 'day', jobType: 'full-time', hoursPerWeek: 44, workers: 1 }],
  },
  {
    name: 'Bayanihan Farm Producers Cooperative',
    kind: 'cooperative',
    status: 'verified',
    employerNumbers: true,
    jobs: [{ title: 'Harvest and packing crew', skills: ['Agriculture'], payAmount: 520, payUnit: 'day', jobType: 'short-term', hoursPerWeek: 30, workers: 6 }],
  },
  {
    name: 'Tindahan ni Mang Ben',
    kind: 'sole-prop',
    status: 'verified',
    employerNumbers: false,
    jobs: [{ title: 'Store helper (afternoons)', skills: ['Sales'], payAmount: 500, payUnit: 'day', jobType: 'short-term', hoursPerWeek: 18, workers: 1, minorsAllowed: true }],
  },
  {
    name: 'Lakbay Delivery Services',
    kind: 'corporation',
    status: 'verified',
    employerNumbers: true,
    jobs: [{ title: 'Motorcycle rider', skills: ['Driving'], payAmount: 80, payUnit: 'hour', jobType: 'part-time', hoursPerWeek: 32, workers: 5 }],
  },
  {
    name: 'Malinis Cleaning Services',
    kind: 'sole-prop',
    status: 'verified',
    employerNumbers: true,
    jobs: [{ title: 'Office cleaner', skills: ['Housekeeping'], payAmount: 540, payUnit: 'day', jobType: 'part-time', hoursPerWeek: 24, workers: 3 }],
  },
  {
    name: 'Sinag Bakeshop',
    kind: 'sole-prop',
    status: 'pending',
    employerNumbers: true,
    jobs: [{ title: 'Baker assistant', skills: ['Food preparation'], payAmount: 560, payUnit: 'day', jobType: 'full-time', hoursPerWeek: 40, workers: 1 }],
  },
  {
    name: 'TechFix Computer Shop',
    kind: 'sole-prop',
    status: 'pending',
    employerNumbers: false,
    jobs: [{ title: 'Computer repair helper', skills: ['Computer literacy', 'Electrical'], payAmount: 520, payUnit: 'day', jobType: 'short-term', hoursPerWeek: 20, workers: 1 }],
  },
  {
    name: 'Baybay Fish Stall',
    kind: 'sole-prop',
    status: 'rejected',
    employerNumbers: false,
    rejectReason: 'Mayor’s permit number not found in the City BPLO list.',
    jobs: [{ title: 'Fish stall helper', skills: ['Sales', 'Food preparation'], payAmount: 500, payUnit: 'day', jobType: 'short-term', hoursPerWeek: 20, workers: 1 }],
  },
  {
    name: 'Teresa Villanueva (household)',
    kind: 'individual',
    status: 'verified',
    employerNumbers: false,
    jobs: [{ title: 'Fix kitchen cabinets', skills: ['Carpentry'], payAmount: 1500, payUnit: 'task', jobType: 'short-term', hoursPerWeek: 8, workers: 1 }],
  },
]

export interface MockEmployer {
  id: string
  name: string
  business: Business
  verification: Verification
  jobs: JobPost[]
}

const pad = (n: number, width: number) => String(n).padStart(width, '0')

export function mockEmployers(): MockEmployer[] {
  const rand = rng(7)
  const places = NEARBY_BARANGAYS.filter((code) => BARANGAY_CENTERS[code])
  const year = new Date().getFullYear()

  return EMPLOYERS.map((t, i) => {
    const id = userIdFor('employer', t.name)
    const barangay = places[Math.floor(rand() * places.length)]
    const [cLat, cLng] = BARANGAY_CENTERS[barangay]
    // Somewhere within about 600 m of the barangay center.
    const lat = cLat + (rand() - 0.5) * 0.011
    const lng = cLng + (rand() - 0.5) * 0.011
    const n = 100 + i

    const verification: Verification = {
      kind: t.kind,
      status: t.status,
      legalName: t.kind === 'individual' ? '' : t.name,
      registrationNo: t.kind === 'individual' ? '' : t.kind === 'corporation' ? `CS2019${pad(n, 5)}` : t.kind === 'cooperative' ? `9520-${pad(n, 8)}` : `${4500000 + n}`,
      tin: t.kind === 'individual' ? '' : `${pad(200 + i, 3)}-${pad(300 + i, 3)}-${pad(400 + i, 3)}-000`,
      permitNo: t.kind === 'individual' ? '' : `BP-${year}-${pad(20000 + n, 5)}`,
      permitYear: year,
      ownerName: t.kind === 'individual' ? t.name.replace(' (household)', '') : 'Sample Owner',
      idType: 'PhilSys National ID / ePhilID',
      idLast4: pad(2000 + n, 4),
      sss: t.employerNumbers ? `03-${pad(5000000 + n, 7)}-${i % 10}` : '',
      philhealth: t.employerNumbers ? `01-${pad(500000000 + n, 9)}-${i % 10}` : '',
      pagibig: t.employerNumbers ? `2010-${pad(5000 + n, 4)}-${pad(1000 + i, 4)}` : '',
      documents: requiredDocs(t.kind).map((type) => ({ type, fileName: `${type}-sample.pdf`, sizeKb: 180 + i * 7 })),
      consent: true,
      submittedAt: `2026-10-${pad(3 + (i % 15), 2)}T09:00:00.000Z`,
      reviewedAt: t.status === 'pending' ? undefined : `2026-10-${pad(5 + (i % 15), 2)}T09:00:00.000Z`,
      rejectReason: t.rejectReason,
    }

    const jobs: JobPost[] = t.jobs.map((j, k) => ({
      id: `job-m${i}-${k}`,
      employerId: id,
      employerName: t.name,
      barangay,
      // Jobs sit near the business, a few hundred meters apart so pins do not stack.
      lat: lat + k * 0.0025,
      lng: lng + k * 0.0025,
      startDate: `2026-11-${pad(3 + ((i + k) % 25), 2)}`,
      minorsAllowed: j.minorsAllowed ?? false,
      status: 'open',
      title: j.title,
      skills: j.skills,
      payAmount: j.payAmount,
      payUnit: j.payUnit,
      jobType: j.jobType,
      hoursPerWeek: j.hoursPerWeek,
      workers: j.workers,
    }))

    return { id, name: t.name, business: { name: t.name, barangay, lat, lng }, verification, jobs }
  })
}

const STATUSES: ApplicationStatus[] = ['applied', 'applied', 'shortlisted', 'hired']

// Each open job gets up to 4 applicants who have at least one of its skills and are allowed by its age rule.
export function mockApplications(jobs: JobPost[], cards: SkillCard[]): Application[] {
  const rand = rng(99)
  const applications: Application[] = []
  for (const job of jobs) {
    const fits = cards.filter(
      (c) => c.skills.some((s) => job.skills.includes(s)) && (c.age >= 18 || job.minorsAllowed),
    )
    const count = Math.min(fits.length, Math.floor(rand() * 5))
    const picked = [...fits].sort(() => rand() - 0.5).slice(0, count)
    picked.forEach((card, k) => {
      applications.push({
        id: `app-m-${job.id}-${k}`,
        jobId: job.id,
        userId: card.userId,
        status: STATUSES[Math.floor(rand() * STATUSES.length)],
        appliedAt: `2026-10-${String(10 + Math.floor(rand() * 12)).padStart(2, '0')}T10:00:00.000Z`,
      })
    })
  }
  return applications
}
