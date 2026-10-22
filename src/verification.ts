// Employer verification for the Philippines. PROTOTYPE: these are format checks only. A real check means PESO staff
// confirm each record with the issuing agency (DTI BNRS search, SEC, CDA, BIR, Davao City BPLO) before approving.

export type EmployerKind = 'sole-prop' | 'corporation' | 'cooperative' | 'individual'
export type VerificationStatus = 'none' | 'pending' | 'verified' | 'rejected'

export type DocType =
  | 'dti'
  | 'sec'
  | 'cda'
  | 'mayors-permit'
  | 'barangay-clearance'
  | 'bir-2303'
  | 'owner-id'
  | 'barangay-residency'

export interface UploadedDoc {
  type: DocType
  // Prototype: only the file name and size are kept. Nothing is uploaded anywhere.
  fileName: string
  sizeKb: number
}

export interface Verification {
  kind: EmployerKind
  status: VerificationStatus
  legalName: string
  registrationNo: string
  tin: string
  permitNo: string
  permitYear: number
  ownerName: string
  idType: string
  // Only the last 4 characters of the ID number are stored.
  idLast4: string
  sss: string
  philhealth: string
  pagibig: string
  documents: UploadedDoc[]
  consent: boolean
  submittedAt: string
  reviewedAt?: string
  rejectReason?: string
}

export const KINDS: { id: EmployerKind; label: string; help: string }[] = [
  { id: 'sole-prop', label: 'Sole proprietor', help: 'Business name registered with DTI (e.g. sari-sari store, carinderia)' },
  { id: 'corporation', label: 'Corporation / partnership / OPC', help: 'Registered with the SEC' },
  { id: 'cooperative', label: 'Cooperative', help: 'Registered with the CDA' },
  { id: 'individual', label: 'Individual / household', help: 'No business: hiring for your home (repairs, cleaning). Short-term jobs only.' },
]

export const DOC_LABELS: Record<DocType, string> = {
  dti: 'DTI Certificate of Business Name Registration',
  sec: 'SEC Certificate of Registration',
  cda: 'CDA Certificate of Registration',
  'mayors-permit': 'Mayor’s / Business Permit (Davao City BPLO), current year',
  'barangay-clearance': 'Barangay Business Clearance',
  'bir-2303': 'BIR Certificate of Registration (Form 2303)',
  'owner-id': 'Valid government ID of owner or authorized representative',
  'barangay-residency': 'Barangay Certificate of Residency',
}

// Government IDs commonly accepted in the Philippines.
export const ID_TYPES = [
  'PhilSys National ID / ePhilID',
  'Driver’s license (LTO)',
  'Passport (DFA)',
  'UMID (SSS/GSIS)',
  'PRC ID',
  'Postal ID',
  'Voter’s ID / certification (COMELEC)',
]

export function requiredDocs(kind: EmployerKind): DocType[] {
  const business: DocType[] = ['mayors-permit', 'barangay-clearance', 'bir-2303', 'owner-id']
  switch (kind) {
    case 'sole-prop':
      return ['dti', ...business]
    case 'corporation':
      return ['sec', ...business]
    case 'cooperative':
      return ['cda', ...business]
    case 'individual':
      return ['owner-id', 'barangay-residency']
  }
}

export function registrationAgency(kind: EmployerKind): 'DTI' | 'SEC' | 'CDA' | null {
  return kind === 'sole-prop' ? 'DTI' : kind === 'corporation' ? 'SEC' : kind === 'cooperative' ? 'CDA' : null
}

const digits = (s: string) => s.replace(/[\s-]/g, '')

// Format checks. Lengths follow the usual printed formats; agency number formats are lenient placeholders.
export const formats = {
  // 9-digit TIN, optionally followed by a 3 or 5 digit branch code (000 for head office).
  tin: (s: string) => /^\d{9}(\d{3}|\d{5})?$/.test(digits(s)),
  // SSS employer number: 10 digits (XX-XXXXXXX-X).
  sss: (s: string) => /^\d{10}$/.test(digits(s)),
  // PhilHealth employer number (PEN): 12 digits.
  philhealth: (s: string) => /^\d{12}$/.test(digits(s)),
  // Pag-IBIG employer ID: 12 digits.
  pagibig: (s: string) => /^\d{12}$/.test(digits(s)),
  registration: (s: string) => /^[A-Z0-9-]{5,20}$/i.test(s.trim()),
  permitNo: (s: string) => /^[A-Z0-9-]{4,20}$/i.test(s.trim()),
}

// Business permits in Davao City run January to December and are renewed by January 20.
export function permitIssue(permitYear: number, today = new Date()): string | null {
  const year = today.getFullYear()
  if (permitYear < year) return `This permit expired on Dec 31, ${permitYear}. Renew it with the City BPLO first.`
  if (permitYear > year) return 'Permit year cannot be in the future.'
  return null
}

export function permitRenewalSoon(permitYear: number, today = new Date()): boolean {
  return permitYear === today.getFullYear() && today.getMonth() === 11
}

export type Draft = Omit<Verification, 'status' | 'submittedAt' | 'reviewedAt' | 'rejectReason'>

// Everything the employer must fix before submitting, in plain words.
export function validate(d: Draft, today = new Date()): string[] {
  const errors: string[] = []
  const isBusiness = d.kind !== 'individual'
  if (!d.ownerName.trim()) errors.push(isBusiness ? 'Enter the owner or authorized representative.' : 'Enter your full name.')
  if (!d.idType) errors.push('Choose the type of government ID.')
  if (!/^[A-Z0-9]{4}$/i.test(d.idLast4)) errors.push('Enter the last 4 characters of the ID number.')
  if (isBusiness) {
    if (!d.legalName.trim()) errors.push('Enter the registered business name.')
    if (!formats.registration(d.registrationNo)) errors.push(`Enter the ${registrationAgency(d.kind)} registration number.`)
    if (!formats.tin(d.tin)) errors.push('TIN must be 9 digits, plus a 3 or 5 digit branch code if you have one.')
    if (!formats.permitNo(d.permitNo)) errors.push('Enter the Mayor’s permit number.')
    const permit = permitIssue(d.permitYear, today)
    if (permit) errors.push(permit)
  }
  if (d.sss && !formats.sss(d.sss)) errors.push('SSS employer number must be 10 digits.')
  if (d.philhealth && !formats.philhealth(d.philhealth)) errors.push('PhilHealth employer number must be 12 digits.')
  if (d.pagibig && !formats.pagibig(d.pagibig)) errors.push('Pag-IBIG employer ID must be 12 digits.')
  const missing = requiredDocs(d.kind).filter((t) => !d.documents.some((doc) => doc.type === t))
  missing.forEach((t) => errors.push(`Upload: ${DOC_LABELS[t]}.`))
  if (!d.consent) errors.push('Agree to the data privacy notice.')
  return errors
}

// Registered with SSS, PhilHealth and Pag-IBIG as an employer: required before hiring regular employees.
export function hasEmployerNumbers(v: Pick<Verification, 'sss' | 'philhealth' | 'pagibig'>): boolean {
  return Boolean(v.sss && v.philhealth && v.pagibig)
}

export const MAX_UPLOAD_KB = 5 * 1024
