import { describe, expect, it } from 'vitest'
import { openedLabel } from './businessCategoryStyle'

describe('business card labels', () => {
  const now = new Date('2026-10-23T00:00:00')

  it('shows the year opened and age in years', () => {
    expect(openedLabel(4, now)).toBe('2022 · 4 yrs')
    expect(openedLabel(1, now)).toBe('2025 · 1 yr')
    expect(openedLabel(0.5, now)).toBe('2026 · Under 1 yr')
  })

  it('says when the years in business are not listed', () => {
    expect(openedLabel(undefined, now)).toBe('Not listed')
  })
})
