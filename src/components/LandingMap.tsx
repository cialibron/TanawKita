import { useEffect, useRef } from 'react'
import { Map as LibreMap, Marker as LibreMarker, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, LineString } from 'geojson'
import { seedState } from '../data/seed'
import { BARANGAY_CENTERS } from '../data/barangayGeo'
import { distanceKm } from '../rules'

setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const ROUTE_SOURCE = 'landing-routes'

// Places the background tours, in order: pilot barangays first, then other parts of the city.
const STOPS: { center: [number, number]; zoom: number; bearing: number }[] = [
  { center: [7.0731, 125.6128], zoom: 13.4, bearing: -12 }, // Poblacion (city center)
  { center: [7.0492, 125.5479], zoom: 14.2, bearing: 18 }, // Talomo
  { center: [7.0539, 125.5989], zoom: 14.2, bearing: -24 }, // Bucana
  { center: [7.1905, 125.6488], zoom: 14, bearing: 10 }, // Tibungco
  { center: [7.0213, 125.4986], zoom: 13.4, bearing: -8 }, // Toril
  { center: [7.1, 125.62], zoom: 12.2, bearing: 0 }, // Davao Gulf and city overview
]

// Glowing pins: a spread of sample job locations, plus barangay centers near each tour stop so every stop has activity.
const MAX_JOB_PINS = 110
const PIN_COLORS = ['orange', 'pink', 'cyan', 'gold'] as const
const PIN_POINTS: [number, number][] = (() => {
  const jobs = seedState.jobs
  const step = Math.max(1, Math.ceil(jobs.length / MAX_JOB_PINS))
  const points: [number, number][] = jobs.filter((_, i) => i % step === 0).map((j) => [j.lat, j.lng])
  for (const stop of STOPS) {
    Object.values(BARANGAY_CENTERS)
      .filter((c) => distanceKm(stop.center, c) <= 3)
      .slice(0, 6)
      .forEach((c) => points.push(c))
  }
  return points
})()

// Route lines: each pin linked to its nearest neighbour, without duplicates.
const ROUTES: FeatureCollection<LineString> = (() => {
  const seen = new Set<string>()
  const features: FeatureCollection<LineString>['features'] = []
  PIN_POINTS.forEach((a, i) => {
    let best = -1
    let bestKm = Infinity
    PIN_POINTS.forEach((b, j) => {
      const km = distanceKm(a, b)
      if (j !== i && km > 0.05 && km < bestKm) {
        bestKm = km
        best = j
      }
    })
    const key = [i, best].sort((x, y) => x - y).join('-')
    if (best >= 0 && bestKm < 4 && !seen.has(key)) {
      seen.add(key)
      const b = PIN_POINTS[best]
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [[a[1], a[0]], [b[1], b[0]]] },
      })
    }
  })
  return { type: 'FeatureCollection', features }
})()

// MapLibre has no dash offset, so the "flowing" routes cycle through shifted dash patterns.
const DASH_FRAMES: number[][] = [
  [0, 4, 3],
  [0.5, 4, 2.5],
  [1, 4, 2],
  [1.5, 4, 1.5],
  [2, 4, 1],
  [2.5, 4, 0.5],
  [3, 4, 0],
  [0, 0.5, 3, 3.5],
  [0, 1, 3, 3],
  [0, 1.5, 3, 2.5],
  [0, 2, 3, 2],
  [0, 2.5, 3, 1.5],
  [0, 3, 3, 1],
  [0, 3.5, 3, 0.5],
]

const PAUSE_MS = 6000
const FLIGHT_MS = 3500

// Faint, non-interactive map of Davao City behind the landing page: decorative only.
// `still` shows only the map (no pins, routes or tour), e.g. behind the profile page.
export default function LandingMap({ still = false }: { still?: boolean }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const first = STOPS[0]

    let map: LibreMap
    try {
      map = new LibreMap({
        container: container.current,
        style: STYLE_URL,
        center: [first.center[1], first.center[0]],
        zoom: first.zoom,
        bearing: still ? 0 : first.bearing,
        pitch: still ? 0 : 45,
        interactive: false,
        // Credit is shown as page text instead (the map's edges fade out); see Landing.
        attributionControl: false,
      })
    } catch {
      // No WebGL: the landing page still works on its background art alone.
      return
    }

    if (still) return () => map.remove()

    const markers = PIN_POINTS.map((point, i) => {
      const el = document.createElement('span')
      el.className = 'landing-pin'
      const dot = document.createElement('span')
      // Every third pin also shows a pulsing "activity" ring.
      dot.className = `map-dot map-dot-${PIN_COLORS[i % PIN_COLORS.length]}${i % 3 === 0 ? ' active' : ''}`
      dot.style.animationDelay = `${(i % 7) * 0.4}s`
      el.appendChild(dot)
      return new LibreMarker({ element: el }).setLngLat([point[1], point[0]]).addTo(map)
    })

    const timers: number[] = []
    map.on('load', () => {
      map.addSource(ROUTE_SOURCE, { type: 'geojson', data: ROUTES })
      map.addLayer({
        id: ROUTE_SOURCE,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round' },
        paint: { 'line-color': '#5ce1ff', 'line-width': 1.5, 'line-opacity': 0.55, 'line-dasharray': DASH_FRAMES[0] },
      })

      if (reduceMotion) return
      let frame = 0
      timers.push(
        window.setInterval(() => {
          frame = (frame + 1) % DASH_FRAMES.length
          if (map.getLayer(ROUTE_SOURCE)) map.setPaintProperty(ROUTE_SOURCE, 'line-dasharray', DASH_FRAMES[frame])
        }, 90),
      )
    })

    // Glides to the next stop every few seconds. Stays on the first stop for users who prefer reduced motion.
    if (!reduceMotion) {
      let stop = 0
      timers.push(
        window.setInterval(() => {
          stop = (stop + 1) % STOPS.length
          const next = STOPS[stop]
          map.flyTo({ center: [next.center[1], next.center[0]], zoom: next.zoom, bearing: next.bearing, duration: FLIGHT_MS, curve: 1.2 })
        }, PAUSE_MS + FLIGHT_MS),
      )
    }

    return () => {
      timers.forEach((t) => window.clearInterval(t))
      markers.forEach((m) => m.remove())
      map.remove()
    }
  }, [still])

  return <div ref={container} className="landing-map" aria-hidden="true" />
}
