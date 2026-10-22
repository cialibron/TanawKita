import { useEffect } from 'react'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { JobPost } from '../types'

// CARTO basemaps need a key (from .env.local). It is sent with every tile request, so it is visible in the browser.
const CARTO_KEY = import.meta.env.VITE_CARTO_KEY ?? ''
const TILE_URL = `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`

export const DAVAO_CENTER: [number, number] = [7.0731, 125.6128]

// Leaflet's default marker images break under Vite bundling, so pins are HTML div icons.
const UNIT_SHORT = { day: 'day', hour: 'hr', task: 'task' } as const

function payPin(job: JobPost, selected: boolean) {
  return L.divIcon({
    className: '',
    html: `<div class="pay-pin${selected ? ' selected' : ''}">₱${job.payAmount.toLocaleString()}/${UNIT_SHORT[job.payUnit]}</div>`,
    iconSize: undefined,
    iconAnchor: [0, 0],
  })
}

const selectedPin = L.divIcon({ className: 'job-pin selected', iconSize: [24, 24] })

export function BaseTiles() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url={TILE_URL}
      maxZoom={20}
    />
  )
}

export function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  // Depend on the numbers, not the array, so re-renders don't restart the flight.
  const lat = target?.[0]
  const lng = target?.[1]
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) map.flyTo([lat, lng], Math.max(map.getZoom(), 14))
  }, [map, lat, lng])
  return null
}

export function ClickToPick({ onPick }: { onPick: (latLng: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return null
}

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
}

export default function JobMap({ jobs = [], selectedId, onSelect, me, picked, onPick, height = 320, fill = false }: Props) {
  const selected = jobs.find((j) => j.id === selectedId)
  const target: [number, number] | null = selected ? [selected.lat, selected.lng] : (me ?? null)

  return (
    <MapContainer
      center={DAVAO_CENTER}
      zoom={fill ? 12 : 11}
      zoomControl={false}
      style={fill ? { height: '100%' } : { height, borderRadius: 10, marginBottom: 12 }}
    >
      <ZoomControl position={fill ? 'bottomleft' : 'topleft'} />
      <BaseTiles />
      <FlyTo target={target} />
      {onPick && <ClickToPick onPick={onPick} />}
      {picked && <Marker position={picked} icon={selectedPin} />}
      {me && <CircleMarker center={me} radius={8} pathOptions={{ color: '#1a7f37' }} />}
      {jobs.map((job) => (
        <Marker
          key={job.id}
          position={[job.lat, job.lng]}
          icon={payPin(job, job.id === selectedId)}
          zIndexOffset={job.id === selectedId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect?.(job.id) }}
        >
          <Popup>
            <strong>
              ₱{job.payAmount.toLocaleString()} / {job.payUnit}
            </strong>
            <br />
            {job.title}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
