import { useEffect, useRef } from 'react'
import { Map as LibreMap, Marker as LibreMarker, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, LineString } from 'geojson'
import { seedState } from '../data/seed'
import { BARANGAY_CENTERS } from '../data/barangayGeo'
import { distanceKm } from '../rules'

setWorkerUrl(workerUrl)

// Same free OpenFreeMap dark style as the app's main map: no API key needed.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

// Places the background tours, in order: pilot barangays first, then other parts of the city. [lat, lng]
const STOPS: { center: [number, number]; zoom: number }[] = [
  { center: [7.0731, 125.6128], zoom: 13 }, // Poblacion (city center)
  { center: [7.0492, 125.5479], zoom: 14 }, // Talomo
  { center: [7.0539, 125.5989], zoom: 14 }, // Bucana
  { center: [7.1905, 125.6488], zoom: 14 }, // Tibungco
  { center: [7.0213, 125.4986], zoom: 13 }, // Toril
  { center: [7.1, 125.62], zoom: 12 }, // Davao Gulf and city overview
]

// Glowing pins: a spread-out sample of jobs, plus barangay centers near each tour stop so every stop has activity.
// Capped so the pins stay decorative and light on phones (the seed has hundreds of jobs).
const MAX_JOB_PINS = 12
const PIN_COLORS = ['orange', 'pink', 'cyan', 'gold'] as const
const PIN_POINTS: [number, number][] = (() => {
  const step = Math.max(1, Math.floor(seedState.jobs.length / MAX_JOB_PINS))
  const points: [number, number][] = seedState.jobs
    .filter((_, i) => i % step === 0)
    .slice(0, MAX_JOB_PINS)
    .map((j) => [j.lat, j.lng])
  for (const stop of STOPS) {
    Object.values(BARANGAY_CENTERS)
      .filter((c) => distanceKm(stop.center, c) <= 3)
      .slice(0, 6)
      .forEach((c) => points.push(c))
  }
  return points
})()

// Route lines: each pin linked to its nearest neighbour, without duplicates.
const ROUTES: Feature<LineString>[] = (() => {
  const seen = new Set<string>()
  const routes: Feature<LineString>[] = []
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
      routes.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[a[1], a[0]], [b[1], b[0]]] } })
    }
  })
  return routes
})()

const PAUSE_MS = 6000
const FLIGHT_MS = 3500

const toLngLat = ([lat, lng]: [number, number]): [number, number] => [lng, lat]

// Faint, non-interactive map of Davao City behind the landing page. Glides to the next stop every few seconds;
// stays on the first stop for users who prefer reduced motion.
export default function LandingMap() {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const map = new LibreMap({
      container: container.current,
      style: STYLE_URL,
      center: toLngLat(STOPS[0].center),
      zoom: STOPS[0].zoom,
      interactive: false,
      // Credit is shown as page text instead (the map's edges fade out); see Landing.
      attributionControl: false,
    })

    map.on('load', () => {
      map.addSource('landing-routes', { type: 'geojson', data: { type: 'FeatureCollection', features: ROUTES } })
      map.addLayer({
        id: 'landing-routes',
        type: 'line',
        source: 'landing-routes',
        paint: { 'line-color': '#5ce1ff', 'line-width': 1.5, 'line-opacity': 0.55, 'line-dasharray': [2, 3] },
      })
    })

    const markers = PIN_POINTS.map((point, i) => {
      const el = document.createElement('div')
      // Every third pin also shows a pulsing "activity" ring.
      el.innerHTML = `<span class="map-dot map-dot-${PIN_COLORS[i % PIN_COLORS.length]}${i % 3 === 0 ? ' active' : ''}" style="animation-delay:${(i % 7) * 0.4}s"></span>`
      return new LibreMarker({ element: el }).setLngLat(toLngLat(point)).addTo(map)
    })

    let timer: ReturnType<typeof setInterval> | undefined
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let i = 0
      timer = setInterval(() => {
        i = (i + 1) % STOPS.length
        map.flyTo({ center: toLngLat(STOPS[i].center), zoom: STOPS[i].zoom, duration: FLIGHT_MS, curve: 1.2 })
      }, PAUSE_MS + FLIGHT_MS)
    }

    return () => {
      clearInterval(timer)
      markers.forEach((m) => m.remove())
      map.remove()
    }
  }, [])

  return <div className="landing-map" aria-hidden="true" ref={container} />
}
