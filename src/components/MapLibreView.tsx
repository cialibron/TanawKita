import { useEffect, useRef, useState } from 'react'
import { Map as LibreMap, Marker as LibreMarker, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent, type MapMouseEvent } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import './maplibre.css'
import type { JobPost } from '../types'
import type { Feature, Polygon } from 'geojson'
import type { CompetitorPlace } from '../businessDirectory'
import { CATEGORY_STYLE, categoryLabel, estimatedFootprintMeters, yearsOpenLabel } from './businessCategoryStyle'

const DAVAO_CENTER: [number, number] = [7.0731, 125.6128]

setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const HEAT_SOURCE = 'tanawkita-seeker-heat'
const RADIUS_SOURCE = 'tanawkita-business-radius'
const COMPETITOR_SOURCE = 'tanawkita-competitors'
const COMPETITOR_AREA_SOURCE = 'tanawkita-competitor-areas'
const BUILDINGS_LAYER = 'tanawkita-3d-buildings'
// Business callouts show from street level, nearest to the map center first, capped to keep phones fast.
const LABEL_ZOOM = 15
const MAX_LABELS = 24
const PITCH_3D = 55
const UNIT_SHORT = { day: 'day', hour: 'hr', task: 'task' } as const

interface Props {
  jobs?: JobPost[]
  selectedId?: string | null
  onSelect?: (jobId: string) => void
  me?: [number, number] | null
  picked?: [number, number] | null
  onPick?: (latLng: [number, number]) => void
  heat?: [number, number, number][]
  business?: { lat: number; lng: number; name: string } | null
  radiusKm?: number
  height?: number
  fill?: boolean
  zoom?: number
  places?: CompetitorPlace[]
  selectedPlaceId?: string | null
  onPlaceSelect?: (placeId: string) => void
  view?: { center: [number, number]; zoom: number }
}

function markerElement(className: string, text?: string): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'tanawkita-map-marker'
  const label = document.createElement('div')
  label.className = className
  if (text) label.textContent = text
  container.append(label)
  return container
}

function circleFeature(lat: number, lng: number, radiusKm: number): Feature<Polygon> {
  const coordinates: [number, number][] = []
  const earthRadiusKm = 6371
  const latRad = (lat * Math.PI) / 180
  for (let angle = 0; angle <= 360; angle += 6) {
    const bearing = (angle * Math.PI) / 180
    const angularDistance = radiusKm / earthRadiusKm
    const destLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing),
    )
    const destLng =
      (lng * Math.PI) / 180 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(destLat),
      )
    coordinates.push([(destLng * 180) / Math.PI, (destLat * 180) / Math.PI])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordinates] } }
}

// Square around a point, `sideMeters` wide, used for the estimated store area.
function squareFeature(lat: number, lng: number, sideMeters: number, properties: Record<string, unknown>): Feature<Polygon> {
  const half = sideMeters / 2
  const dLat = half / 111320
  const dLng = half / (111320 * Math.cos((lat * Math.PI) / 180))
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: 'Polygon',
      coordinates: [[[lng - dLng, lat - dLat], [lng + dLng, lat - dLat], [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]]],
    },
  }
}

// Diagonal stripe tile in one category color, for the hatched estimated-area fill.
function hatchImage(hex: string) {
  const size = 12
  const data = new Uint8Array(size * size * 4)
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((x + y) % size < 3) data.set([r, g, b, 235], (y * size + x) * 4)
    }
  }
  return { width: size, height: size, data }
}

// Recolor the dark OpenFreeMap base toward a navy city plan with warm gold roads.
function tintBaseStyle(map: LibreMap) {
  for (const layer of map.getStyle().layers) {
    const sourceLayer = 'source-layer' in layer ? layer['source-layer'] : undefined
    try {
      if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#0e1834')
      else if (layer.type === 'fill' && sourceLayer === 'water') map.setPaintProperty(layer.id, 'fill-color', '#071027')
      else if (layer.type === 'fill' && sourceLayer === 'building') map.setPaintProperty(layer.id, 'fill-color', '#1c2a52')
      else if (layer.type === 'fill' && (sourceLayer === 'landcover' || sourceLayer === 'park')) map.setPaintProperty(layer.id, 'fill-color', '#0f3238')
      else if (layer.type === 'fill' && sourceLayer === 'landuse') map.setPaintProperty(layer.id, 'fill-color', '#121f42')
      else if (layer.type === 'line' && sourceLayer === 'transportation') {
        const major = /motorway|trunk|primary|secondary/.test(layer.id)
        map.setPaintProperty(layer.id, 'line-color', major ? '#d6a646' : '#7d6a3e')
      }
    } catch {
      // Some layers use paint values that cannot be overridden; leave them as the base style has them.
    }
  }
}

function addDataLayers(map: LibreMap) {
  if (map.getSource(HEAT_SOURCE)) return
  tintBaseStyle(map)
  for (const [category, style] of Object.entries(CATEGORY_STYLE)) {
    if (!map.hasImage(`tk-hatch-${category}`)) map.addImage(`tk-hatch-${category}`, hatchImage(style.color))
  }

  map.addSource(HEAT_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  const labelsStart = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
  map.addLayer(
    {
      id: 'tanawkita-seeker-heat-layer',
      type: 'heatmap',
      source: HEAT_SOURCE,
      maxzoom: 16,
      paint: {
        'heatmap-weight': ['coalesce', ['get', 'weight'], 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 14, 1.8],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 14, 14, 38],
        'heatmap-opacity': 0.65,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0,
          'rgba(44,123,182,0)',
          0.2,
          '#2c7bb6',
          0.4,
          '#abd9e9',
          0.6,
          '#fdae61',
          0.8,
          '#f46d43',
          1,
          '#d7191c',
        ],
      },
    },
    labelsStart,
  )

  map.addSource(RADIUS_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer(
    {
      id: 'tanawkita-business-radius-fill',
      type: 'fill',
      source: RADIUS_SOURCE,
      paint: { 'fill-color': '#1a73e8', 'fill-opacity': 0.08 },
    },
    labelsStart,
  )
  map.addLayer(
    {
      id: 'tanawkita-business-radius-outline',
      type: 'line',
      source: RADIUS_SOURCE,
      paint: { 'line-color': '#1a73e8', 'line-width': 2, 'line-opacity': 0.9 },
    },
    labelsStart,
  )

  // Dark OpenFreeMap style has no building extrusions; add TanawKita's own 3D OSM buildings.
  // Starts hidden: the map opens in 2D, and the 3D button turns buildings on.
  if (!map.getLayer(BUILDINGS_LAYER)) {
    map.addLayer(
      {
        id: BUILDINGS_LAYER,
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'render_height'], 0],
            0,
            '#1f2d58',
            25,
            '#2a4486',
            60,
            '#3a6bc0',
          ],
          'fill-extrusion-opacity': 0.9,
        },
      },
      labelsStart,
    )
  }

  map.addSource(COMPETITOR_AREA_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer(
    {
      id: 'tanawkita-competitor-area-fill',
      type: 'fill',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'selected'], 0.32, 0.14] },
    },
    labelsStart,
  )
  map.addLayer(
    {
      id: 'tanawkita-competitor-area-hatch',
      type: 'fill',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      paint: { 'fill-pattern': ['concat', 'tk-hatch-', ['get', 'category']], 'fill-opacity': ['case', ['get', 'selected'], 0.95, 0.7] },
    },
    labelsStart,
  )
  map.addLayer(
    {
      id: 'tanawkita-competitor-area-outline',
      type: 'line',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 2, 1], 'line-blur': 0.5 },
    },
    labelsStart,
  )

  map.addSource(COMPETITOR_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 15,
    clusterRadius: 48,
  })
  map.addLayer(
    {
      id: 'tanawkita-competitor-clusters',
      type: 'circle',
      source: COMPETITOR_SOURCE,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': 'rgba(29, 45, 91, 0.92)',
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 25],
        'circle-stroke-color': '#3ee8ff',
        'circle-stroke-width': 1.5,
      },
    },
    labelsStart,
  )
  map.addLayer(
    {
      id: 'tanawkita-competitor-cluster-count',
      type: 'symbol',
      source: COMPETITOR_SOURCE,
      filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
      paint: { 'text-color': '#eef4ff' },
    },
    labelsStart,
  )
  map.addLayer(
    {
      id: 'tanawkita-competitor-points',
      type: 'circle',
      source: COMPETITOR_SOURCE,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': ['case', ['get', 'selected'], 9, 6],
        'circle-stroke-color': '#fff',
        'circle-stroke-width': ['case', ['get', 'selected'], 2.5, 1.2],
      },
    },
    labelsStart,
  )
}

// Map callout for one business: category pin, leader line, and a card with name, type, and years open.
function businessCallout(place: CompetitorPlace, selected: boolean, onClick?: () => void): HTMLDivElement {
  const style = CATEGORY_STYLE[place.category]
  const years = yearsOpenLabel(place.profile.yearsOperating)
  const container = document.createElement('div')
  container.className = 'tanawkita-map-marker'
  container.style.setProperty('--cat', style.color)
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `biz-callout${selected ? ' selected' : ''}`
  button.setAttribute('aria-label', `${place.name}, ${categoryLabel(place.category)}, ${years}`)
  button.setAttribute('aria-pressed', String(selected))
  const line = document.createElement('span')
  line.className = 'biz-callout-line'
  const pin = document.createElement('span')
  pin.className = 'biz-callout-pin'
  const glyph = document.createElement('span')
  glyph.textContent = style.glyph
  pin.append(glyph)
  const card = document.createElement('span')
  card.className = 'biz-callout-card'
  const name = document.createElement('strong')
  name.className = 'biz-callout-name'
  name.textContent = place.name
  const row = (label: string, value: string) => {
    const element = document.createElement('span')
    element.className = 'biz-callout-row'
    const key = document.createElement('span')
    key.textContent = label
    const val = document.createElement('b')
    val.textContent = value
    element.append(key, val)
    return element
  }
  card.append(name, row('Type', style.short), row('Open', years.replace(/^Open /, '')))
  button.append(line, pin, card)
  if (onClick) {
    button.addEventListener('click', (event) => {
      event.stopPropagation()
      onClick()
    })
  }
  container.append(button)
  return container
}

export default function MapLibreView({
  jobs = [],
  selectedId,
  onSelect,
  me,
  picked,
  onPick,
  heat = [],
  business,
  radiusKm = 3,
  height = 320,
  fill = false,
  zoom,
  places = [],
  selectedPlaceId,
  onPlaceSelect,
  view,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LibreMap | null>(null)
  const [map, setMap] = useState<LibreMap | null>(null)
  const [error, setError] = useState('')
  const [is3d, setIs3d] = useState(false)
  const selectedJob = jobs.find((job) => job.id === selectedId)
  const focus = selectedJob ? [selectedJob.lat, selectedJob.lng] as [number, number] : business ? [business.lat, business.lng] as [number, number] : (me ?? null)

  useEffect(() => {
    if (!container.current || mapRef.current) return

    let instance: LibreMap
    try {
      instance = new LibreMap({
        container: container.current,
        style: STYLE_URL,
        center: view ? [view.center[1], view.center[0]] : [DAVAO_CENTER[1], DAVAO_CENTER[0]],
        zoom: view?.zoom ?? zoom ?? (fill ? 14 : 13.5),
        pitch: 0,
        bearing: 0,
        // Scroll-wheel zoom needs Ctrl (Cmd on Mac); touch needs two fingers. Keeps page scrolling usable.
        cooperativeGestures: true,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Map could not be initialized')
      return
    }

    mapRef.current = instance
    instance.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right')
    // The base style references sprite images it does not ship (e.g. "wood-pattern"); fill them with a blank pixel.
    instance.on('styleimagemissing', (event) => {
      if (!instance.hasImage(event.id)) instance.addImage(event.id, { width: 1, height: 1, data: new Uint8Array(4) })
    })
    instance.on('pitchend', () => setIs3d(instance.getPitch() > 5))
    instance.on('load', () => {
      addDataLayers(instance)
      setMap(instance)
    })
    instance.on('error', (event) => {
      console.error('MapLibre error:', event.error)
      if (!instance.isStyleLoaded()) {
        setError(event.error?.message ?? 'Map style failed to load. Check your internet connection.')
      }
    })

    return () => {
      instance.remove()
      mapRef.current = null
      setMap(null)
    }
  }, []) // The map instance is created once; changes are applied by the effects below.

  useEffect(() => {
    if (!map) return
    if (view) {
      map.flyTo({ center: [view.center[1], view.center[0]], zoom: view.zoom, duration: 750 })
    } else if (zoom !== undefined) {
      map.setZoom(zoom)
    }
  }, [map, zoom, view?.center[0], view?.center[1], view?.zoom])

  useEffect(() => {
    if (!map || !focus || view) return
    map.flyTo({ center: [focus[1], focus[0]], zoom: Math.max(map.getZoom(), 14), duration: 700 })
  }, [map, focus?.[0], focus?.[1], view])

  useEffect(() => {
    if (!map || !onPick) return
    const handleClick = (event: MapMouseEvent) => onPick([event.lngLat.lat, event.lngLat.lng])
    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [map, onPick])

  useEffect(() => {
    if (!map?.getLayer(BUILDINGS_LAYER)) return
    map.setLayoutProperty(BUILDINGS_LAYER, 'visibility', is3d ? 'visible' : 'none')
  }, [map, is3d])

  function toggle3d() {
    if (!map) return
    const next = !is3d
    setIs3d(next)
    map.easeTo({ pitch: next ? PITCH_3D : 0, bearing: next ? -15 : 0, duration: 700 })
  }

  useEffect(() => {
    if (!map) return
    const source = map.getSource(HEAT_SOURCE) as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: heat.map(([lat, lng, weight]) => ({
        type: 'Feature' as const,
        properties: { weight },
        geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      })),
    })
  }, [map, heat])

  useEffect(() => {
    if (!map) return
    const source = map.getSource(RADIUS_SOURCE) as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: business && radiusKm > 0 ? [circleFeature(business.lat, business.lng, radiusKm)] : [],
    })
  }, [map, business?.lat, business?.lng, radiusKm])

  useEffect(() => {
    if (!map) return
    const source = map.getSource(COMPETITOR_SOURCE) as GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: places.map((place) => ({
        type: 'Feature' as const,
        properties: { place_id: place.id, name: place.name, category: place.category, color: CATEGORY_STYLE[place.category].color, selected: place.id === selectedPlaceId },
        geometry: { type: 'Point' as const, coordinates: [place.lng, place.lat] },
      })),
    })
    const areas = map.getSource(COMPETITOR_AREA_SOURCE) as GeoJSONSource | undefined
    areas?.setData({
      type: 'FeatureCollection',
      features: places.map((place) => squareFeature(place.lat, place.lng, estimatedFootprintMeters(place.profile.employeeCountRange), {
        category: place.category,
        color: CATEGORY_STYLE[place.category].color,
        selected: place.id === selectedPlaceId,
      })),
    })
  }, [map, places, selectedPlaceId])

  // Callout cards for businesses in view at street level (and always for the selected one).
  useEffect(() => {
    if (!map || !places.length) return
    const byId = new Map(places.map((place) => [place.id, place]))
    const markers = new Map<string, LibreMarker>()
    const render = () => {
      const wanted: string[] = []
      if (map.getZoom() >= LABEL_ZOOM) {
        const bounds = map.getBounds()
        const center = map.getCenter()
        wanted.push(...places
          .filter((place) => bounds.contains([place.lng, place.lat]))
          .sort((a, b) => Math.hypot(a.lng - center.lng, a.lat - center.lat) - Math.hypot(b.lng - center.lng, b.lat - center.lat))
          .slice(0, MAX_LABELS)
          .map((place) => place.id))
      }
      if (selectedPlaceId && !wanted.includes(selectedPlaceId)) wanted.push(selectedPlaceId)
      for (const [id, marker] of markers) {
        if (!wanted.includes(id)) {
          marker.remove()
          markers.delete(id)
        }
      }
      for (const id of wanted) {
        const place = byId.get(id)
        if (!place || markers.has(id)) continue
        const selected = id === selectedPlaceId
        const element = businessCallout(place, selected, onPlaceSelect ? () => onPlaceSelect(id) : undefined)
        if (selected) element.style.zIndex = '5'
        markers.set(id, new LibreMarker({ element, anchor: 'bottom' }).setLngLat([place.lng, place.lat]).addTo(map))
      }
    }
    render()
    map.on('moveend', render)
    return () => {
      map.off('moveend', render)
      markers.forEach((marker) => marker.remove())
    }
  }, [map, places, selectedPlaceId, onPlaceSelect])

  useEffect(() => {
    if (!map || !onPlaceSelect) return
    const onClusterClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      if (!feature) return
      const clusterId = Number(feature.properties?.cluster_id)
      const source = map.getSource(COMPETITOR_SOURCE) as GeoJSONSource
      source.getClusterExpansionZoom(clusterId).then((nextZoom) => {
        const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        map.easeTo({ center: coordinates, zoom: nextZoom, duration: 500 })
      })
    }
    const onPlaceClick = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.place_id
      if (id) onPlaceSelect(String(id))
    }
    const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
    const clearPointer = () => { map.getCanvas().style.cursor = '' }
    map.on('click', 'tanawkita-competitor-clusters', onClusterClick)
    map.on('click', 'tanawkita-competitor-points', onPlaceClick)
    map.on('mouseenter', 'tanawkita-competitor-clusters', setPointer)
    map.on('mouseenter', 'tanawkita-competitor-points', setPointer)
    map.on('mouseleave', 'tanawkita-competitor-clusters', clearPointer)
    map.on('mouseleave', 'tanawkita-competitor-points', clearPointer)
    return () => {
      map.off('click', 'tanawkita-competitor-clusters', onClusterClick)
      map.off('click', 'tanawkita-competitor-points', onPlaceClick)
      map.off('mouseenter', 'tanawkita-competitor-clusters', setPointer)
      map.off('mouseenter', 'tanawkita-competitor-points', setPointer)
      map.off('mouseleave', 'tanawkita-competitor-clusters', clearPointer)
      map.off('mouseleave', 'tanawkita-competitor-points', clearPointer)
    }
  }, [map, onPlaceSelect])

  useEffect(() => {
    if (!map || !selectedPlaceId) return
    const selected = places.find((place) => place.id === selectedPlaceId)
    if (selected) map.flyTo({ center: [selected.lng, selected.lat], zoom: Math.max(map.getZoom(), 16.5), duration: 600 })
  }, [map, selectedPlaceId, places])

  useEffect(() => {
    if (!map) return
    const markers: LibreMarker[] = []
    for (const job of jobs) {
      const selected = job.id === selectedId
      const element = markerElement(`pay-pin${selected ? ' selected' : ''}`, `₱${job.payAmount.toLocaleString()}/${UNIT_SHORT[job.payUnit]}`)
      const marker = new LibreMarker({ element, anchor: 'bottom' })
        .setLngLat([job.lng, job.lat])
        .addTo(map)
      if (onSelect) element.addEventListener('click', () => onSelect(job.id))
      const popup = document.createElement('div')
      const pay = document.createElement('strong')
      pay.textContent = `₱${job.payAmount.toLocaleString()} / ${job.payUnit}`
      const title = document.createElement('div')
      title.textContent = job.title
      popup.append(pay, title)
      marker.setPopup(new Popup({ offset: 18 }).setDOMContent(popup))
      markers.push(marker)
    }

    if (picked) markers.push(new LibreMarker({ element: markerElement('picked-pin', '📍'), anchor: 'bottom' }).setLngLat([picked[1], picked[0]]).addTo(map))
    if (me) markers.push(new LibreMarker({ element: markerElement('user-position-dot'), anchor: 'center' }).setLngLat([me[1], me[0]]).addTo(map))
    if (business) {
      markers.push(
        new LibreMarker({ element: markerElement('biz-pin', `🏪 ${business.name}`), anchor: 'bottom' })
          .setLngLat([business.lng, business.lat])
          .addTo(map),
      )
    }
    return () => markers.forEach((marker) => marker.remove())
  }, [map, jobs, selectedId, onSelect, picked?.[0], picked?.[1], me?.[0], me?.[1], business?.lat, business?.lng, business?.name])

  return (
    <div
      className="maplibre-wrap"
      style={fill ? { height: '100%', minHeight: 0 } : { height, borderRadius: 10, marginBottom: 12 }}
    >
      <div ref={container} className="maplibre-canvas" aria-label="Interactive map of Davao City" />
      {map && (
        <button
          type="button"
          className={`map-dimension-toggle${is3d ? ' is-3d' : ''}`}
          onClick={toggle3d}
          aria-pressed={is3d}
          title={is3d ? 'Switch to flat 2D map' : 'Show 3D buildings'}
        >
          <span className={is3d ? '' : 'active'}>2D</span>
          <span className={is3d ? 'active' : ''}>3D</span>
        </button>
      )}
      {error && <div className="maplibre-error" role="status">Map unavailable: {error}</div>}
    </div>
  )
}
