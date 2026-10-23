import type { MultiPolygon, Polygon, Position } from 'geojson'

// Level of detail for a business's shaded area, from coarse to exact:
// 'approximate' soft circle when zoomed out, 'estimate' square sized from team size,
// 'building' outline of the mapped building under (or right next to) the pin once it is big enough on screen.
export type AreaTier = 'approximate' | 'estimate' | 'building'
export type AreaShape = Polygon | MultiPolygon

// On-screen size (px) a shape needs before it is drawn at that precision.
export const MIN_BUILDING_PX = 10
export const MIN_ESTIMATE_PX = 14
// The soft circle stays this many pixels wide in radius at any zoom.
export const APPROX_RADIUS_PX = 9
// How far from the pin a building can be and still count as the pin's building.
export const SNAP_METERS = 12
// A building more than this many times the estimated store area (a mall, a market hall) is not shaded whole;
// the estimate square is shown instead so a small business does not look like it fills the building.
export const MAX_BUILDING_RATIO = 4

// One building outline with its bounding box, for quick nearby checks.
export interface BuildingPolygon {
  coordinates: Position[][]
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

const metersPerDegreeLat = 110540
const metersPerDegreeLng = (lat: number) => 111320 * Math.cos((lat * Math.PI) / 180)

// MapLibre zoom levels use 512 px tiles.
export function metersPerPixel(lat: number, zoom: number): number {
  return (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom)
}

// Map tiles merge many buildings into one feature, so split every feature into single outlines.
// The same outline can come back more than once (from neighboring tiles); keep one copy.
export function splitBuildings(geometries: AreaShape[]): BuildingPolygon[] {
  const seen = new Set<string>()
  const result: BuildingPolygon[] = []
  for (const geometry of geometries) {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    for (const coordinates of polygons) {
      const outer = coordinates[0]
      if (!outer?.length) continue
      const key = `${outer.length}:${outer[0][0]},${outer[0][1]}:${outer[1]?.[0]},${outer[1]?.[1]}`
      if (seen.has(key)) continue
      seen.add(key)
      let minLng = Infinity
      let maxLng = -Infinity
      let minLat = Infinity
      let maxLat = -Infinity
      for (const [x, y] of outer) {
        minLng = Math.min(minLng, x)
        maxLng = Math.max(maxLng, x)
        minLat = Math.min(minLat, y)
        maxLat = Math.max(maxLat, y)
      }
      result.push({ coordinates, minLng, minLat, maxLng, maxLat })
    }
  }
  return result
}

function insideRing([x, y]: Position, ring: Position[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function containsPoint(coordinates: Position[][], point: Position): boolean {
  const [outer, ...holes] = coordinates
  return insideRing(point, outer) && !holes.some((hole) => insideRing(point, hole))
}

// Meters from a point to the nearest edge of the outline, 0 when inside. Flat approximation, fine at building scale.
export function distanceMeters(coordinates: Position[][], point: Position): number {
  if (containsPoint(coordinates, point)) return 0
  const [lng, lat] = point
  const kx = metersPerDegreeLng(lat)
  let best = Infinity
  for (const ring of coordinates) {
    for (let i = 1; i < ring.length; i++) {
      const ax = (ring[i - 1][0] - lng) * kx
      const ay = (ring[i - 1][1] - lat) * metersPerDegreeLat
      const bx = (ring[i][0] - lng) * kx
      const by = (ring[i][1] - lat) * metersPerDegreeLat
      const dx = bx - ax
      const dy = by - ay
      const lengthSq = dx * dx + dy * dy
      const t = lengthSq ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq)) : 0
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy))
    }
  }
  return best
}

// Width and height of the outline's bounding box, in meters.
export function sizeMeters(building: BuildingPolygon): { width: number; height: number } {
  return {
    width: (building.maxLng - building.minLng) * metersPerDegreeLng((building.minLat + building.maxLat) / 2),
    height: (building.maxLat - building.minLat) * metersPerDegreeLat,
  }
}

// Floor area of the outline in square meters (outer ring minus holes).
export function areaSquareMeters(coordinates: Position[][]): number {
  const lat = coordinates[0][0][1]
  const kx = metersPerDegreeLng(lat)
  const ringArea = (ring: Position[]) => {
    let sum = 0
    for (let i = 1; i < ring.length; i++) sum += ring[i - 1][0] * kx * ring[i][1] * metersPerDegreeLat - ring[i][0] * kx * ring[i - 1][1] * metersPerDegreeLat
    return Math.abs(sum) / 2
  }
  const [outer, ...holes] = coordinates
  return ringArea(outer) - holes.reduce((total, hole) => total + ringArea(hole), 0)
}

// The single building outline under the point, or the nearest one within `maxMeters`.
export function pickBuilding(buildings: BuildingPolygon[], point: Position, maxMeters = SNAP_METERS): BuildingPolygon | null {
  const [lng, lat] = point
  const padLng = maxMeters / metersPerDegreeLng(lat)
  const padLat = maxMeters / metersPerDegreeLat
  let best: BuildingPolygon | null = null
  let bestDistance = Infinity
  for (const building of buildings) {
    // Skip outlines whose box is clearly out of reach before measuring edges.
    if (lng < building.minLng - padLng || lng > building.maxLng + padLng || lat < building.minLat - padLat || lat > building.maxLat + padLat) continue
    const distance = distanceMeters(building.coordinates, point)
    if (distance < bestDistance) {
      best = building
      bestDistance = distance
    }
  }
  return best && bestDistance <= maxMeters ? best : null
}

// Pick the most precise tier that is big enough to read at this zoom and honest about the business's size.
export function areaTier({
  buildingMinSidePx,
  buildingAreaM2,
  footprintMeters,
  estimateSidePx,
}: {
  buildingMinSidePx?: number
  buildingAreaM2?: number
  footprintMeters: number
  estimateSidePx: number
}): AreaTier {
  const buildingFits = buildingAreaM2 !== undefined && buildingAreaM2 <= MAX_BUILDING_RATIO * footprintMeters ** 2
  if (buildingFits && buildingMinSidePx !== undefined && buildingMinSidePx >= MIN_BUILDING_PX) return 'building'
  if (estimateSidePx >= MIN_ESTIMATE_PX) return 'estimate'
  return 'approximate'
}
