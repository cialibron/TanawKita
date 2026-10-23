import { describe, expect, it } from 'vitest'
import type { MultiPolygon, Polygon, Position } from 'geojson'
import { areaSquareMeters, areaTier, containsPoint, distanceMeters, metersPerPixel, pickBuilding, sizeMeters, splitBuildings } from './buildingHighlight'

// A square outline about 22 m wide (d = 0.0001°) near Roxas Ave.
const ring = (lng: number, lat: number, d = 0.0001): Position[][] => [[[lng - d, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng - d, lat + d], [lng - d, lat - d]]]
const square = (lng: number, lat: number, d?: number): Polygon => ({ type: 'Polygon', coordinates: ring(lng, lat, d) })

describe('building highlight helpers', () => {
  const pin = [125.6095, 7.0738]

  it('finds whether the pin is inside a building and how far away one is', () => {
    expect(containsPoint(ring(pin[0], pin[1]), pin)).toBe(true)
    expect(distanceMeters(ring(pin[0], pin[1]), pin)).toBe(0)
    // Outline 0.0003° east: its west edge is 0.0002° (~22 m) from the pin.
    expect(distanceMeters(ring(pin[0] + 0.0003, pin[1]), pin)).toBeCloseTo(22, 0)
  })

  it('measures a building in meters and square meters', () => {
    const [building] = splitBuildings([square(pin[0], pin[1])])
    const { width, height } = sizeMeters(building)
    expect(width).toBeCloseTo(22.1, 0)
    expect(height).toBeCloseTo(22.1, 0)
    expect(areaSquareMeters(building.coordinates)).toBeCloseTo(22.1 * 22.1, -1)
  })

  it('splits merged tile features into single outlines and drops repeats', () => {
    // Map tiles merge many buildings into one feature; only the one at the pin should be picked.
    const merged: MultiPolygon = { type: 'MultiPolygon', coordinates: [ring(pin[0], pin[1]), ring(pin[0] + 0.002, pin[1]), ring(pin[0] - 0.002, pin[1])] }
    const buildings = splitBuildings([merged, square(pin[0], pin[1])])
    expect(buildings).toHaveLength(3)
    expect(pickBuilding(buildings, pin)?.coordinates).toEqual(ring(pin[0], pin[1]))
  })

  it('prefers the building under the pin, then a very close one, and ignores far ones', () => {
    const under = ring(pin[0], pin[1])
    const touching = ring(pin[0] + 0.0002, pin[1]) // west edge ~11 m from the pin
    expect(pickBuilding(splitBuildings([{ type: 'Polygon', coordinates: touching }, { type: 'Polygon', coordinates: under }]), pin)?.coordinates).toEqual(under)
    expect(pickBuilding(splitBuildings([{ type: 'Polygon', coordinates: touching }]), pin)?.coordinates).toEqual(touching)
    expect(pickBuilding(splitBuildings([square(pin[0] + 0.0004, pin[1])]), pin)).toBeNull()
  })

  it('gets more precise as the shapes grow on screen', () => {
    expect(areaTier({ estimateSidePx: 4, footprintMeters: 16 })).toBe('approximate')
    expect(areaTier({ estimateSidePx: 20, footprintMeters: 16 })).toBe('estimate')
    expect(areaTier({ estimateSidePx: 20, footprintMeters: 16, buildingMinSidePx: 6, buildingAreaM2: 300 })).toBe('estimate')
    expect(areaTier({ estimateSidePx: 20, footprintMeters: 16, buildingMinSidePx: 12, buildingAreaM2: 300 })).toBe('building')
  })

  it('does not shade a whole mall for a small business', () => {
    // 16 m estimate → 256 m²; a 5,000 m² building is far too big.
    expect(areaTier({ estimateSidePx: 20, footprintMeters: 16, buildingMinSidePx: 200, buildingAreaM2: 5000 })).toBe('estimate')
  })

  it('uses 512 px tiles for meters per pixel', () => {
    expect(metersPerPixel(0, 0)).toBeCloseTo(78271.5, 0)
  })
})
