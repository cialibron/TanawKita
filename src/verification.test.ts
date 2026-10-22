import { describe, expect, it } from 'vitest'
import { formats, permitIssue, requiredDocs, validate, type Draft } from './verification'

const today = new Date('2026-10-22T00:00:00')

const soleProp: Draft = {
  kind: 'sole-prop',
  legalName: 'Lola Nena Kitchen',
  registrationNo: '3456780',
  tin: '123-456-789-000',
  permitNo: 'BP-2026-10230',
  permitYear: 2026,
  ownerName: 'Nena Cruz',
  idType: 'PhilSys National ID / ePhilID',
  idLast4: '1234',
  sss: '',
  philhealth: '',
  pagibig: '',
  documents: requiredDocs('sole-prop').map((type) => ({ type, fileName: `${type}.pdf`, sizeKb: 100 })),
  consent: true,
}

describe('formats', () => {
  it('accepts a 9-digit TIN with or without a branch code', () => {
    expect(formats.tin('123-456-789')).toBe(true)
    expect(formats.tin('123-456-789-000')).toBe(true)
    expect(formats.tin('123-456-789-00000')).toBe(true)
    expect(formats.tin('12345678')).toBe(false)
  })

  it('checks SSS, PhilHealth and Pag-IBIG employer number lengths', () => {
    expect(formats.sss('03-1234567-1')).toBe(true)
    expect(formats.sss('03-123456-1')).toBe(false)
    expect(formats.philhealth('01-234567890-1')).toBe(true)
    expect(formats.pagibig('2010-1234-5678')).toBe(true)
    expect(formats.pagibig('2010-1234-567')).toBe(false)
  })
})

describe('permitIssue', () => {
  it('only accepts this year’s Mayor’s permit', () => {
    expect(permitIssue(2026, today)).toBeNull()
    expect(permitIssue(2025, today)).toMatch(/expired/)
    expect(permitIssue(2027, today)).toMatch(/future/)
  })
})

describe('requiredDocs', () => {
  it('asks businesses for registration, permits and BIR, and individuals for ID and residency', () => {
    expect(requiredDocs('sole-prop')).toContain('dti')
    expect(requiredDocs('corporation')).toContain('sec')
    expect(requiredDocs('cooperative')).toContain('cda')
    expect(requiredDocs('sole-prop')).toContain('bir-2303')
    expect(requiredDocs('individual')).toEqual(['owner-id', 'barangay-residency'])
  })
})

describe('validate', () => {
  it('passes a complete sole proprietor', () => {
    expect(validate(soleProp, today)).toEqual([])
  })

  it('lists every problem in plain words', () => {
    const errors = validate(
      { ...soleProp, tin: '123', permitYear: 2025, documents: [], consent: false, sss: '123' },
      today,
    )
    expect(errors.some((e) => e.startsWith('TIN'))).toBe(true)
    expect(errors.some((e) => e.includes('expired'))).toBe(true)
    expect(errors.some((e) => e.startsWith('SSS'))).toBe(true)
    expect(errors.filter((e) => e.startsWith('Upload'))).toHaveLength(5)
    expect(errors).toContain('Agree to the data privacy notice.')
  })

  it('does not ask individuals for business records', () => {
    const individual: Draft = {
      ...soleProp,
      kind: 'individual',
      legalName: '',
      registrationNo: '',
      tin: '',
      permitNo: '',
      documents: requiredDocs('individual').map((type) => ({ type, fileName: `${type}.jpg`, sizeKb: 80 })),
    }
    expect(validate(individual, today)).toEqual([])
  })
})
