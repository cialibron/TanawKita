import { userIdFor } from '../rules'
import type { AppState, Business, JobPost, SkillCard } from '../types'
import { mockSeekers } from './mockSeekers'
import { mockApplications, mockEmployers } from './mockEmployers'
import { requiredDocs, type EmployerKind, type UploadedDoc, type Verification } from '../verification'

// Sample records for local testing only. Map pins are approximate, not real addresses. Pilot barangays: Talomo 116, Bucana 020, Tibungco 124.
const employers = {
  lola: 'Lola Nena Kitchen',
  tailor: 'Bucana Tailoring',
  builders: 'Tibungco Builders',
  mart: 'Talomo Mart',
  pining: 'Aling Pining Store',
  homes: 'Bucana Homes',
}

const jobs: JobPost[] = [
  {
    id: 'job-1',
    lat: 7.0545,
    lng: 125.5745,
    employerId: userIdFor('employer', employers.lola),
    employerName: employers.lola,
    title: 'Kitchen helper',
    barangay: '116',
    payAmount: 550,
    payUnit: 'day',
    jobType: 'part-time',
    hoursPerWeek: 24,
    skills: ['Food preparation', 'Customer service'],
    workers: 2,
    startDate: '2026-11-01',
    minorsAllowed: false,
    status: 'open',
  },
  {
    id: 'job-2',
    lat: 7.0605,
    lng: 125.6125,
    employerId: userIdFor('employer', employers.tailor),
    employerName: employers.tailor,
    title: 'Sewing helper',
    barangay: '020',
    payAmount: 80,
    payUnit: 'hour',
    jobType: 'part-time',
    hoursPerWeek: 30,
    skills: ['Sewing'],
    workers: 1,
    startDate: '2026-11-03',
    minorsAllowed: false,
    status: 'open',
  },
  {
    id: 'job-3',
    lat: 7.1925,
    lng: 125.6455,
    employerId: userIdFor('employer', employers.builders),
    employerName: employers.builders,
    title: 'Carpentry helper, two-day job',
    barangay: '124',
    payAmount: 700,
    payUnit: 'day',
    jobType: 'short-term',
    hoursPerWeek: 16,
    skills: ['Carpentry', 'Masonry'],
    workers: 3,
    startDate: '2026-11-05',
    minorsAllowed: false,
    status: 'open',
  },
  {
    id: 'job-4',
    lat: 7.0505,
    lng: 125.579,
    employerId: userIdFor('employer', employers.mart),
    employerName: employers.mart,
    title: 'Delivery helper',
    barangay: '116',
    payAmount: 65,
    payUnit: 'hour',
    jobType: 'short-term',
    hoursPerWeek: 20,
    skills: ['Driving', 'Customer service'],
    workers: 1,
    startDate: '2026-11-02',
    minorsAllowed: false,
    status: 'open',
  },
  {
    id: 'job-5',
    lat: 7.057,
    lng: 125.5705,
    employerId: userIdFor('employer', employers.pining),
    employerName: employers.pining,
    title: 'Store helper',
    barangay: '116',
    payAmount: 500,
    payUnit: 'day',
    jobType: 'part-time',
    hoursPerWeek: 20,
    skills: ['Sales', 'Customer service'],
    workers: 1,
    startDate: '2026-11-01',
    minorsAllowed: true,
    status: 'open',
  },
  {
    id: 'job-6',
    lat: 7.0625,
    lng: 125.615,
    employerId: userIdFor('employer', employers.homes),
    employerName: employers.homes,
    title: 'House cleaning (pakyaw)',
    barangay: '020',
    payAmount: 1200,
    payUnit: 'task',
    jobType: 'short-term',
    hoursPerWeek: 8,
    skills: ['Housekeeping'],
    workers: 1,
    startDate: '2026-11-04',
    minorsAllowed: false,
    status: 'open',
  },
]

const cards: SkillCard[] = [
  {
    userId: userIdFor('jobseeker', 'Ana Reyes'),
    name: 'Ana Reyes',
    age: 24,
    barangay: '116',
    skills: ['Food preparation', 'Customer service'],
    hoursWanted: 24,
    daysAvailable: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    expectedPay: 500,
    guardianConsent: false,
  },
  {
    userId: userIdFor('jobseeker', 'Jun Dela Cruz'),
    name: 'Jun Dela Cruz',
    age: 19,
    barangay: '020',
    skills: ['Sewing'],
    hoursWanted: 30,
    daysAvailable: ['Mon', 'Wed', 'Sat'],
    expectedPay: null,
    guardianConsent: false,
  },
  {
    userId: userIdFor('jobseeker', 'Lea Mae'),
    name: 'Lea Mae',
    age: 16,
    barangay: '124',
    skills: ['Sales', 'Customer service'],
    hoursWanted: 16,
    daysAvailable: ['Sat', 'Sun'],
    expectedPay: null,
    guardianConsent: true,
  },
]

const allCards = [...cards, ...mockSeekers()]

// Each sample employer's business sits at its first job's location.
const businesses: Record<string, Business> = {}
for (const job of jobs) {
  businesses[job.employerId] ??= { name: job.employerName, barangay: job.barangay, lat: job.lat, lng: job.lng }
}

// Sample verification records with made-up numbers. Bucana Homes is left pending so the Admin queue has something to review.
const sampleDocs = (kind: EmployerKind): UploadedDoc[] =>
  requiredDocs(kind).map((type) => ({ type, fileName: `${type}-sample.pdf`, sizeKb: 240 }))

const verifications: Record<string, Verification> = {}
Object.values(employers).forEach((name, i) => {
  const id = userIdFor('employer', name)
  verifications[id] = {
    kind: 'sole-prop',
    status: name === employers.homes ? 'pending' : 'verified',
    legalName: name,
    registrationNo: `${3456780 + i}`,
    tin: `123-456-78${i}-000`,
    permitNo: `BP-${2026}-${10230 + i}`,
    permitYear: new Date().getFullYear(),
    ownerName: 'Sample Owner',
    idType: 'PhilSys National ID / ePhilID',
    idLast4: `${1000 + i}`,
    sss: `03-${1234560 + i}-1`,
    philhealth: `01-${234567890 + i}-1`,
    pagibig: `2010-${1234 + i}-5678`,
    documents: sampleDocs('sole-prop'),
    consent: true,
    submittedAt: '2026-10-01T08:00:00.000Z',
    reviewedAt: name === employers.homes ? undefined : '2026-10-02T08:00:00.000Z',
  }
})

// More fictional employers, each with a business, a verification record and jobs.
const extraEmployers = mockEmployers()
for (const e of extraEmployers) {
  businesses[e.id] = e.business
  verifications[e.id] = e.verification
}
const allJobs = [...jobs, ...extraEmployers.flatMap((e) => e.jobs)]

export const seedState: AppState = {
  view: 'jobseeker',
  jobseekerId: cards[0].userId,
  employerId: userIdFor('employer', employers.lola),
  names: Object.fromEntries([
    ...allCards.map((c) => [c.userId, c.name]),
    ...Object.values(employers).map((n) => [userIdFor('employer', n), n]),
    ...extraEmployers.map((e) => [e.id, e.name]),
  ]),
  skillCards: Object.fromEntries(allCards.map((c) => [c.userId, c])),
  businesses,
  verifications,
  jobs: allJobs,
  applications: mockApplications(allJobs, allCards),
}
