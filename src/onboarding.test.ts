import { describe, expect, it } from 'vitest'
import { linkLabel, normalizeLink } from './onboarding'

describe('normalizeLink', () => {
  it('adds https to bare links', () => {
    expect(normalizeLink('linkedin.com/in/ana-reyes')).toBe('https://linkedin.com/in/ana-reyes')
  })

  it('keeps full URLs', () => {
    expect(normalizeLink('https://www.jobstreet.com.ph/profile/ana')).toBe('https://www.jobstreet.com.ph/profile/ana')
  })

  it('rejects text that is not a web link', () => {
    expect(normalizeLink('')).toBeNull()
    expect(normalizeLink('my resume')).toBeNull()
    expect(normalizeLink('localhost')).toBeNull()
  })
})

describe('linkLabel', () => {
  it('names well-known resume sites', () => {
    expect(linkLabel('https://www.linkedin.com/in/ana')).toBe('LinkedIn')
    expect(linkLabel('https://www.jobstreet.com.ph/profile/ana')).toBe('JobStreet')
    expect(linkLabel('https://drive.google.com/file/d/1')).toBe('Google Drive')
  })

  it('falls back to the site name', () => {
    expect(linkLabel('https://www.anareyes.dev/cv')).toBe('anareyes.dev')
  })
})
