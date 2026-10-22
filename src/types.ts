import type { Verification } from './verification'

export type Role = 'jobseeker' | 'employer'
export type View = Role | 'admin'
export type PayUnit = 'day' | 'hour' | 'task'
export type JobType = 'short-term' | 'part-time' | 'full-time'
export type JobStatus = 'open' | 'paused' | 'filled'
export type ApplicationStatus = 'applied' | 'shortlisted' | 'hired'

export interface Session {
  role: Role
  userId: string
  name: string
}

export interface SkillCard {
  userId: string
  name: string
  age: number
  barangay: string
  skills: string[]
  hoursWanted: number
  daysAvailable: string[]
  expectedPay: number | null
  guardianConsent: boolean
  // Optional resume/context fields for the richer synthetic simulation profiles.
  employmentStatus?: string
  yearsExperience?: number
  education?: string
  certifications?: string[]
  preferredRoles?: string[]
  preferredSectors?: string[]
  preferredJobTypes?: JobType[]
  expectedPayUnit?: PayUnit
  languages?: string[]
  commuteMode?: string
  canStartInDays?: number
  digitalAccess?: string
  profileSummary?: string
}

export interface JobPost {
  id: string
  employerId: string
  employerName: string
  title: string
  barangay: string
  payAmount: number
  payUnit: PayUnit
  jobType: JobType
  hoursPerWeek: number
  skills: string[]
  workers: number
  startDate: string
  minorsAllowed: boolean
  status: JobStatus
  lat: number
  lng: number
}

export interface Application {
  id: string
  jobId: string
  userId: string
  status: ApplicationStatus
  appliedAt: string
}

export interface Business {
  name: string
  barangay: string
  lat: number
  lng: number
  sector?: string
  category?: string
  businessModel?: string
  franchiseBrand?: string
  yearsOperating?: number
  employeeCountRange?: string
  currentlyHiring?: boolean
  openRolesCount?: number
  rolesHiring?: string[]
  typicalPay?: number
  payUnit?: PayUnit
  skillsSought?: string[]
  businessHours?: string
  branchesInDavao?: number
  simulation?: boolean
}

export interface AppState {
  view: View
  // Who the tester is acting as in each interface.
  jobseekerId: string
  employerId: string
  names: Record<string, string>
  // Business location per employer id.
  businesses: Record<string, Business>
  // Verification record per employer id.
  verifications: Record<string, Verification>
  skillCards: Record<string, SkillCard>
  jobs: JobPost[]
  applications: Application[]
}
