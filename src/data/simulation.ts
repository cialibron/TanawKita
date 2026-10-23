import businessesCsv from '../../simulation-data/businesses.csv?raw'
import jobseekersCsv from '../../simulation-data/jobseekers.csv?raw'
import { DAYS, userIdFor } from '../rules'
import { requiredDocs, type EmployerKind, type UploadedDoc, type Verification } from '../verification'
import type { Business, JobPost, JobType, PayUnit, SkillCard } from '../types'

interface CsvRow {
  [field: string]: string
}

function parseCsv(raw: string): CsvRow[] {
  const records: string[][] = []
  let record: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i]
    if (quoted) {
      if (char === '"' && raw[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      record.push(field)
      field = ''
    } else if (char === '\n') {
      record.push(field.replace(/\r$/, ''))
      if (record.some((value) => value !== '')) records.push(record)
      record = []
      field = ''
    } else {
      field += char
    }
  }
  if (field || record.length) {
    record.push(field.replace(/\r$/, ''))
    if (record.some((value) => value !== '')) records.push(record)
  }

  const headers = records.shift()?.map((header) => header.trim()) ?? []
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ''])))
}

const split = (value: string | undefined) => value ? value.split('|').map((item) => item.trim()).filter(Boolean) : []
const asNumber = (value: string | undefined, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}
const pad = (value: number, width = 4) => String(value).padStart(width, '0')
const validPayUnits: PayUnit[] = ['day', 'hour', 'task']
const validJobTypes: JobType[] = ['short-term', 'part-time', 'full-time']

export interface SyntheticBusiness {
  id: string
  name: string
  business: Business
  verification: Verification
  jobs: JobPost[]
}

function verificationFor(row: CsvRow, index: number): Verification {
  const model = row.business_model
  const kind: EmployerKind = model === 'cooperative' ? 'cooperative' : model === 'franchise' || model === 'social enterprise' ? 'corporation' : 'sole-prop'
  const status = row.verification_status_demo === 'not_submitted' ? 'none' : row.verification_status_demo as Verification['status']
  const year = new Date().getFullYear()
  const reviewed = status === 'verified' || status === 'rejected'
  const documents: UploadedDoc[] = requiredDocs(kind).map((type) => ({
    type,
    fileName: `synthetic-${row.business_id.toLowerCase()}-${type}.pdf`,
    sizeKb: 24,
  }))
  return {
    kind,
    status: ['none', 'pending', 'verified', 'rejected'].includes(status) ? status : 'none',
    legalName: row.business_name,
    registrationNo: `SIM-${pad(index, 6)}`,
    tin: `${String(900000000 + index).padStart(9, '0')}000`,
    permitNo: `SIM-${year}-${pad(index, 6)}`,
    permitYear: year,
    ownerName: `Synthetic demo owner ${pad(index)}`,
    idType: 'Synthetic demo record',
    idLast4: pad((index * 37) % 10000),
    sss: `99-${String(1000000 + index).padStart(7, '0')}-${index % 10}`,
    philhealth: `98${String(1000000000 + index).padStart(10, '0')}`,
    pagibig: `77${String(1000000000 + index).padStart(10, '0')}`,
    documents,
    consent: true,
    submittedAt: new Date(Date.now() - (index % 35) * 86400000).toISOString(),
    reviewedAt: reviewed ? new Date(Date.now() - (index % 24) * 86400000).toISOString() : undefined,
    rejectReason: status === 'rejected' ? 'Synthetic sample rejection reason for demo review.' : undefined,
  }
}

function startDate(daysFromToday: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return date.toISOString().slice(0, 10)
}

function jobsFor(row: CsvRow, employerId: string, index: number): JobPost[] {
  if (row.currently_hiring !== 'yes') return []
  const roles = split(row.roles_hiring)
  const skills = split(row.skills_sought)
  if (!roles.length) return []

  const latitude = asNumber(row.latitude_approx, 7.0731)
  const longitude = asNumber(row.longitude_approx, 125.6128)
  const barangay = row.barangay_code || '116'
  const payAmount = asNumber(row.typical_pay_php, 500)
  const payUnit = validPayUnits.includes(row.pay_unit as PayUnit) ? row.pay_unit as PayUnit : 'day'
  const workersPerRole = Math.max(1, Math.ceil(asNumber(row.open_roles_count, roles.length) / roles.length))

  return roles.map((title, roleIndex) => {
    const seed = index * 7 + roleIndex * 11
    const types: JobType[] = roleIndex % 4 === 0 ? ['short-term', 'part-time'] : roleIndex % 4 === 1 ? ['part-time', 'full-time'] : validJobTypes
    const jobType = types[seed % types.length]
    const hours = jobType === 'full-time' ? [40, 44, 48][seed % 3] : jobType === 'part-time' ? [16, 20, 24, 30, 32][seed % 5] : [6, 8, 12, 16, 20][seed % 5]
    const minorsAllowed = jobType === 'short-term' && /helper|packing|store|counter|assistant/i.test(title) && seed % 7 === 0
    return {
      id: `SYN-JOB-${row.business_id.slice(-4)}-${String(roleIndex + 1).padStart(2, '0')}`,
      employerId,
      employerName: row.business_name,
      title,
      barangay,
      payAmount,
      payUnit,
      jobType,
      hoursPerWeek: hours,
      skills,
      workers: workersPerRole,
      startDate: startDate(2 + (seed % 26)),
      minorsAllowed,
      status: 'open',
      lat: latitude + (roleIndex - (roles.length - 1) / 2) * 0.001,
      lng: longitude + (roleIndex - (roles.length - 1) / 2) * 0.001,
    }
  })
}

export const syntheticBusinesses: SyntheticBusiness[] = parseCsv(businessesCsv).map((row, position) => {
  const index = position + 1
  const id = userIdFor('employer', row.business_name)
  const business: Business = {
    name: row.business_name,
    barangay: row.barangay_code || '116',
    lat: asNumber(row.latitude_approx, 7.0731),
    lng: asNumber(row.longitude_approx, 125.6128),
    sector: row.sector,
    category: row.business_category,
    businessModel: row.business_model,
    franchiseBrand: row.franchise_brand || undefined,
    yearsOperating: asNumber(row.years_operating),
    employeeCountRange: row.employee_count_range,
    currentlyHiring: row.currently_hiring === 'yes',
    openRolesCount: asNumber(row.open_roles_count),
    rolesHiring: split(row.roles_hiring),
    typicalPay: asNumber(row.typical_pay_php),
    payUnit: validPayUnits.includes(row.pay_unit as PayUnit) ? row.pay_unit as PayUnit : 'day',
    skillsSought: split(row.skills_sought),
    businessHours: row.business_hours,
    branchesInDavao: asNumber(row.branches_in_davao, 1),
    simulation: true,
  }
  return { id, name: row.business_name, business, verification: verificationFor(row, index), jobs: jobsFor(row, id, index) }
})

const usedJobseekerIds = new Set<string>()

export const syntheticJobseekers: SkillCard[] = parseCsv(jobseekersCsv).map((row) => {
  const name = usedJobseekerIds.has(userIdFor('jobseeker', row.full_name))
    ? `${row.full_name} Sample ${row.person_id.slice(-4)}`
    : row.full_name
  const userId = userIdFor('jobseeker', name)
  usedJobseekerIds.add(userId)
  const age = asNumber(row.age, 18)
  const expectedPayUnit = row.expected_pay_unit as PayUnit
  const preferredJobTypes = split(row.preferred_job_types).filter((value): value is JobType => validJobTypes.includes(value as JobType))
  return {
    userId,
    name,
    age,
    barangay: row.barangay_code || '116',
    skills: split(row.skills),
    hoursWanted: asNumber(row.hours_wanted_per_week, 24),
    daysAvailable: split(row.days_available).filter((day) => DAYS.includes(day)),
    expectedPay: row.expected_pay_php ? asNumber(row.expected_pay_php) : null,
    guardianConsent: age < 18 && row.guardian_consent === 'yes',
    employmentStatus: row.employment_status,
    yearsExperience: asNumber(row.years_experience),
    education: row.highest_education,
    certifications: split(row.certifications),
    preferredRoles: split(row.preferred_roles),
    preferredSectors: split(row.preferred_sectors),
    preferredJobTypes,
    expectedPayUnit: validPayUnits.includes(expectedPayUnit) ? expectedPayUnit : undefined,
    languages: split(row.languages),
    commuteMode: row.commute_mode,
    canStartInDays: asNumber(row.can_start_within_days),
    digitalAccess: row.digital_access,
    profileSummary: row.profile_summary,
  }
})
