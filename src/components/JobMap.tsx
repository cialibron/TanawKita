import { useEffect, useRef, useState } from 'react'
import type { JobPost } from '../types'
import type { CompetitorPlace } from '../businessDirectory'
import MapLibreView from './MapLibreView'

export const DAVAO_CENTER: [number, number] = [7.0731, 125.6128]

// Pin highlights appear from this zoom level (street level) upward.
const HIGHLIGHT_ZOOM = 14.5
const SAMPLE_MS = 150
const EARTH_CIRCUMFERENCE_M = 40075016.686
const TILE_SIZE = 512

interface Props {
  jobs?: JobPost[]
  selectedId?: string | null
  onSelect?: (jobId: string) => void
  me?: [number, number] | null
  picked?: [number, number] | null
  onPick?: (latLng: [number, number]) => void
  height?: number
  // Fill the parent instead of a fixed-height rounded box.
  fill?: boolean
  // Hiring businesses, drawn with the same glowing area as the competitor map.
  places?: CompetitorPlace[]
  selectedPlaceId?: string | null
  placeLabels?: boolean
}

function metersBetween(a: JobPost, b: JobPost): number {
  const toRad = Math.PI / 180
  const x = (b.lng - a.lng) * toRad * Math.cos(((a.lat + b.lat) / 2) * toRad)
  const y = (b.lat - a.lat) * toRad
  return Math.hypot(x, y) * 6371000
}

// Stopgap until MapLibreView exposes the map instance: estimate the zoom from how far apart the job pins
// are on screen versus on the ground. Pay pins are created in `jobs` order, so the n-th pin is jobs[n].
function estimateZoom(root: HTMLElement, jobs: JobPost[]): number | null {
  const pins = Array.from(root.querySelectorAll<HTMLElement>('.tanawkita-map-marker:has(.pay-pin)'))
  const count = Math.min(pins.length, jobs.length, 12)
  const zooms: number[] = []
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const meters = metersBetween(jobs[i], jobs[j])
      if (meters < 150) continue
      const a = pins[i].getBoundingClientRect()
      const b = pins[j].getBoundingClientRect()
      const pixels = Math.hypot(a.left - b.left, a.top - b.top)
      if (pixels < 1) continue
      const lat = ((jobs[i].lat + jobs[j].lat) / 2) * (Math.PI / 180)
      zooms.push(Math.log2((EARTH_CIRCUMFERENCE_M * Math.cos(lat) * pixels) / (TILE_SIZE * meters)))
    }
  }
  if (!zooms.length) return null
  zooms.sort((x, y) => x - y)
  return zooms[Math.floor(zooms.length / 2)]
}

export default function JobMap(props: Props) {
  const root = useRef<HTMLDivElement>(null)
  const [zoomedIn, setZoomedIn] = useState(false)
  // Pages pass a fresh jobs array on each render; keep the sampler running and just read the latest list.
  const jobs = useRef<JobPost[]>([])
  useEffect(() => {
    jobs.current = props.jobs ?? []
  }, [props.jobs])

  useEffect(() => {
    let last = 0
    let frame = requestAnimationFrame(function tick(now) {
      if (now - last > SAMPLE_MS && root.current) {
        last = now
        const zoom = estimateZoom(root.current, jobs.current)
        setZoomedIn(zoom !== null && zoom >= HIGHLIGHT_ZOOM)
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div ref={root} className={`job-map-layer${zoomedIn ? ' map-zoomed-in' : ''}`}>
      <MapLibreView {...props} />
    </div>
  )
}
