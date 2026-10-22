import { useEffect } from 'react'
import { Circle, MapContainer, Marker, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import './leafletGlobal'
import 'leaflet.heat'
import { BaseTiles, ClickToPick, DAVAO_CENTER, FlyTo } from './JobMap'

// Each heat point spreads over this many meters on the ground, at every zoom level.
const HEAT_RADIUS_M = 350
// Overlapping points needed for full red. Lower = hotter map.
const HEAT_MAX = 12

function radiusPx(map: L.Map) {
  const metersPerPixel = (40075016 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / 2 ** (map.getZoom() + 8)
  return Math.max(4, Math.min(150, HEAT_RADIUS_M / metersPerPixel))
}

// Heat sized in meters, so zooming in shows finer detail instead of the same blobs.
function HeatLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap()
  useEffect(() => {
    const options = () => {
      const radius = radiusPx(map)
      return { radius, blur: radius * 0.8 }
    }
    const layer = L.heatLayer(points, {
      ...options(),
      // maxZoom 0 turns off leaflet.heat's own fading when zoomed out; the radius above handles scale.
      maxZoom: 0,
      max: HEAT_MAX,
      minOpacity: 0.05,
      gradient: { 0.2: '#2c7bb6', 0.45: '#abd9e9', 0.65: '#fdae61', 0.85: '#f46d43', 1: '#d7191c' },
    }).addTo(map)
    const resize = () => layer.setOptions(options())
    // leaflet.heat only repositions its canvas on moveend, so also redo it when the map box changes size.
    const reposition = () => (layer as unknown as { _reset: () => void })._reset()
    map.on('zoomend', resize)
    map.on('resize', reposition)
    // The full-screen layout can settle after the map mounts; re-measure once it has.
    const settle = setTimeout(() => {
      map.invalidateSize()
      reposition()
    }, 200)
    return () => {
      clearTimeout(settle)
      map.off('zoomend', resize)
      map.off('resize', reposition)
      layer.remove()
    }
  }, [map, points])
  return null
}

const businessIcon = (label: string) =>
  L.divIcon({ className: '', html: `<div class="biz-pin">🏪 ${label}</div>`, iconSize: undefined, iconAnchor: [0, 0] })

interface Props {
  heat: [number, number, number][]
  business: { lat: number; lng: number; name: string } | null
  radiusKm: number
  onPick?: (latLng: [number, number]) => void
  height?: number
  // Fill the parent instead of a fixed-height rounded box.
  fill?: boolean
}

// Employer view: business pin, search radius and the heatmap of people looking for work.
export default function AreaMap({ heat, business, radiusKm, onPick, height = 360, fill = false }: Props) {
  const center: [number, number] = business ? [business.lat, business.lng] : DAVAO_CENTER
  return (
    <MapContainer
      center={center}
      zoom={14}
      zoomControl={false}
      style={fill ? { height: '100%' } : { height, borderRadius: 10, marginBottom: 12 }}
    >
      <ZoomControl position="bottomleft" />
      <BaseTiles />
      <HeatLayer points={heat} />
      <FlyTo target={business ? center : null} />
      {onPick && <ClickToPick onPick={onPick} />}
      {business && (
        <>
          <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: '#1a73e8', weight: 2, fillOpacity: 0.05 }} />
          <Marker position={center} icon={businessIcon(business.name)} zIndexOffset={1000} />
        </>
      )}
    </MapContainer>
  )
}
