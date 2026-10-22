import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { seedState } from '../data/seed'
import { BARANGAY_CENTERS } from '../data/barangayGeo'
import { distanceKm } from '../rules'

const CARTO_KEY = import.meta.env.VITE_CARTO_KEY ?? ''
const DARK_TILES = `https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`

// Places the background tours, in order: pilot barangays first, then other parts of the city.
const STOPS: { center: [number, number]; zoom: number }[] = [
  { center: [7.0731, 125.6128], zoom: 13 }, // Poblacion (city center)
  { center: [7.0492, 125.5479], zoom: 14 }, // Talomo
  { center: [7.0539, 125.5989], zoom: 14 }, // Bucana
  { center: [7.1905, 125.6488], zoom: 14 }, // Tibungco
  { center: [7.0213, 125.4986], zoom: 13 }, // Toril
  { center: [7.1, 125.62], zoom: 12 }, // Davao Gulf and city overview
]

// Glowing pins: every sample job, plus barangay centers near each tour stop so every stop has activity.
const PIN_COLORS = ['orange', 'pink', 'cyan', 'gold'] as const
const PIN_POINTS: [number, number][] = (() => {
  const points: [number, number][] = seedState.jobs.map((j) => [j.lat, j.lng])
  for (const stop of STOPS) {
    Object.values(BARANGAY_CENTERS)
      .filter((c) => distanceKm(stop.center, c) <= 3)
      .slice(0, 6)
      .forEach((c) => points.push(c))
  }
  return points
})()

const PINS = PIN_POINTS.map((point, i) => ({
  point,
  icon: L.divIcon({
    className: '',
    // Every third pin also shows a pulsing "activity" ring.
    html: `<span class="map-dot map-dot-${PIN_COLORS[i % PIN_COLORS.length]}${i % 3 === 0 ? ' active' : ''}" style="animation-delay:${(i % 7) * 0.4}s"></span>`,
    iconSize: [0, 0],
  }),
}))

// Route lines: each pin linked to its nearest neighbour, without duplicates.
const ROUTES: [number, number][][] = (() => {
  const seen = new Set<string>()
  const routes: [number, number][][] = []
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
      routes.push([a, PIN_POINTS[best]])
    }
  })
  return routes
})()

const PAUSE_MS = 6000
const FLIGHT_S = 3.5

// Glides to the next stop every few seconds. Stays on the first stop for users who prefer reduced motion.
function Tour() {
  const map = useMap()
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let i = 0
    const timer = setInterval(
      () => {
        i = (i + 1) % STOPS.length
        map.flyTo(STOPS[i].center, STOPS[i].zoom, { duration: FLIGHT_S, easeLinearity: 0.2 })
      },
      PAUSE_MS + FLIGHT_S * 1000,
    )
    return () => clearInterval(timer)
  }, [map])
  return null
}

// Faint, non-interactive map of Davao City behind the landing page.
export default function LandingMap() {
  return (
    <div className="landing-map" aria-hidden="true">
      <MapContainer
        center={STOPS[0].center}
        zoom={STOPS[0].zoom}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        // Credit is shown as page text instead (the map's edges fade out); see Landing.
        attributionControl={false}
        style={{ height: '100%', background: 'transparent' }}
      >
        {/* keepBuffer: extra tiles around the view so the edges stay filled while gliding. */}
        <TileLayer url={DARK_TILES} maxZoom={20} keepBuffer={8} />
        {ROUTES.map((line, i) => (
          <Polyline key={i} positions={line} pathOptions={{ className: 'map-route', color: '#5ce1ff', weight: 1.5 }} />
        ))}
        {PINS.map((p, i) => (
          <Marker key={i} position={p.point} icon={p.icon} interactive={false} keyboard={false} />
        ))}
        <Tour />
      </MapContainer>
    </div>
  )
}
