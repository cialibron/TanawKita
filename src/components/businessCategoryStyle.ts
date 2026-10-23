import { BUSINESS_CATEGORIES, type BusinessCategoryId } from '../businessDirectory'

// One color and glyph per business type, shared by map pins, estimated-area shading, and the detail card.
export const CATEGORY_STYLE: Record<BusinessCategoryId, { color: string; glyph: string; short: string }> = {
  cafe: { color: '#c98a4b', glyph: '☕', short: 'Café' },
  restaurant: { color: '#ff7a45', glyph: '🍲', short: 'Restaurant' },
  bakery: { color: '#ffc94a', glyph: '🥖', short: 'Bakery' },
  grocery: { color: '#7ed957', glyph: '🛒', short: 'Grocery' },
  pharmacy: { color: '#3ee8a0', glyph: '💊', short: 'Pharmacy' },
  laundry: { color: '#3ee8ff', glyph: '🧺', short: 'Laundry' },
  salon: { color: '#ff4fa3', glyph: '✂️', short: 'Salon' },
  construction: { color: '#f5a524', glyph: '🏗️', short: 'Construction' },
  delivery: { color: '#4d8dff', glyph: '📦', short: 'Delivery' },
  agriculture: { color: '#9bd34d', glyph: '🌾', short: 'Farm co-op' },
  repair: { color: '#a3a9b8', glyph: '🔧', short: 'Repair' },
  education: { color: '#b48cff', glyph: '📚', short: 'Learning' },
  'digital-services': { color: '#5ad1ff', glyph: '🖨️', short: 'Printing' },
  hospitality: { color: '#ff8cc6', glyph: '🛏️', short: 'Lodging' },
}

export function categoryLabel(id: BusinessCategoryId): string {
  return BUSINESS_CATEGORIES.find((item) => item.id === id)?.label ?? CATEGORY_STYLE[id].short
}

// Rough store footprint (side of a square, in meters) from the team size range. This is a visual estimate
// for the shaded area, not a surveyed lot size.
export function estimatedFootprintMeters(employeeCountRange: string | undefined): number {
  const low = Number.parseInt(employeeCountRange ?? '', 10)
  if (!Number.isFinite(low) || low <= 1) return 12
  if (low < 5) return 16
  if (low < 10) return 22
  if (low < 20) return 30
  if (low < 50) return 40
  return 55
}

export function yearsOpenLabel(years: number | undefined): string {
  if (years === undefined) return 'Years open not listed'
  if (years < 1) return 'Opened this year'
  return `Open ${years} yr${years === 1 ? '' : 's'}`
}
