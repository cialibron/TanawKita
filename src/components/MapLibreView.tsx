import { useEffect, useRef, useState } from 'react'
import { Map as LibreMap, Marker as LibreMarker, NavigationControl, Popup, setWorkerUrl, type ExpressionSpecification, type GeoJSONSource, type MapLayerMouseEvent, type MapMouseEvent } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import './maplibre.css'
import type { JobPost } from '../types'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { CompetitorPlace } from '../businessDirectory'
import { CATEGORY_STYLE, categoryLabel, estimatedFootprintMeters, yearsInBusinessLabel } from './businessCategoryStyle'
import { APPROX_RADIUS_PX, areaSquareMeters, areaTier, metersPerPixel, pickBuilding, sizeMeters, splitBuildings, type AreaShape } from './buildingHighlight'
import { BUILDINGS_3D_LAYER, FLAT_BUILDINGS_LAYER, TANAWKITA_MAP_STYLE } from './tanawkitaMapStyle'

const DAVAO_CENTER: [number, number] = [7.0731, 125.6128]

setWorkerUrl(workerUrl)

const HEAT_SOURCE = 'tanawkita-seeker-heat'
const RADIUS_SOURCE = 'tanawkita-business-radius'
const COMPETITOR_SOURCE = 'tanawkita-competitors'
const COMPETITOR_AREA_SOURCE = 'tanawkita-competitor-areas'
const AREA_3D_LAYER = 'tanawkita-competitor-area-3d'
// Business callouts show from city zoom, nearest to the map center first, capped to keep phones fast.
const LABEL_ZOOM = 11
const MAX_LABELS = 24
// 3D keeps a tilt between these angles so it never flattens back into 2D; 2D is locked flat and north-up.
const PITCH_3D = 55
const MIN_PITCH_3D = 40
const MAX_PITCH_3D = 70
type MapMode = '2d' | '3d'
// Layers that belong to only one mode. Everything else (heatmap, radius, pins) shows in both.
// The estimated-area circles lie flat on the ground in both modes; only a matched building changes between them.
const MODE_LAYERS: Record<MapMode, string[]> = {
  '2d': [FLAT_BUILDINGS_LAYER, 'tanawkita-competitor-area-fill', 'tanawkita-competitor-area-glow', 'tanawkita-competitor-area-outline'],
  '3d': [BUILDINGS_3D_LAYER, AREA_3D_LAYER],
}
// Estimated areas are drawn as stacked rings, each a little smaller, so the circle glows brighter toward the pin.
const CIRCLE_RINGS = [1, 0.72, 0.46, 0.22]
const isBuilding: ExpressionSpecification = ['==', ['get', 'tier'], 'building']
const isCircle: ExpressionSpecification = ['!=', ['get', 'tier'], 'building']
// Shaded business areas start at this zoom, the same zoom building tiles start.
const AREA_MIN_ZOOM = 13
// Building outlines are looked up from this zoom; before it, store-sized buildings are under ~10 px.
const BUILDING_MIN_ZOOM = 15.5
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

// Adds TanawKita's data layers on top of the base city plan, below its labels.
function addDataLayers(map: LibreMap) {
  if (map.getSource(HEAT_SOURCE)) return

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

  map.addSource(COMPETITOR_AREA_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  // Estimated area: a translucent circle flat on the ground, brighter toward the pin, with a soft edge ring.
  // Fill layers always lie on the map surface, so the circle stays on the floor when the map is tilted in 3D.
  map.addLayer(
    {
      id: 'tanawkita-competitor-circle-fill',
      type: 'fill',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      filter: isCircle,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'selected'], 0.17, 0.11], 'fill-antialias': false },
    },
    labelsStart,
  )
  map.addLayer(
    {
      id: 'tanawkita-competitor-circle-edge',
      type: 'line',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      filter: ['all', isCircle, ['==', ['get', 'ring'], 0]],
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', ['get', 'selected'], 2.5, 1.5],
        'line-blur': 1,
        'line-opacity': ['case', ['get', 'selected'], 0.75, 0.5],
      },
    },
    labelsStart,
  )
  // Matched building in 2D: a solid glowing shape.
  map.addLayer(
    {
      id: 'tanawkita-competitor-area-fill',
      type: 'fill',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      filter: isBuilding,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['case', ['get', 'selected'], 0.9, 0.65] },
    },
    labelsStart,
  )
  // Soft glow around the matched building, like a lit-up building on a city plan.
  map.addLayer(
    {
      id: 'tanawkita-competitor-area-glow',
      type: 'line',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      filter: isBuilding,
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['case', ['get', 'selected'], 14, 8],
        'line-blur': 10,
        'line-opacity': ['case', ['get', 'selected'], 0.55, 0.3],
      },
    },
    labelsStart,
  )
  map.addLayer(
    {
      id: 'tanawkita-competitor-area-outline',
      type: 'line',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      filter: isBuilding,
      paint: { 'line-color': '#ffe2c4', 'line-width': ['case', ['get', 'selected'], 1.5, 0.8], 'line-opacity': 0.8 },
    },
    labelsStart,
  )
  // Matched building in 3D: raised in the category color.
  map.addLayer(
    {
      id: AREA_3D_LAYER,
      type: 'fill-extrusion',
      source: COMPETITOR_AREA_SOURCE,
      minzoom: 13,
      filter: isBuilding,
      layout: { visibility: 'none' },
      paint: {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-height': 10,
        'fill-extrusion-opacity': 0.9,
      },
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

// Shaded area for each business, as precise as the zoom allows: a soft circle when zoomed out, a circle sized
// from team size in between, and the outline of the mapped building nearest the pin once it is big enough to see.
// The businesses are fictional, so a matched building is a visual guide only, not the business's real storefront.
// Returns the features plus a short signature, so callers can skip updates when nothing changed.
function businessAreas(map: LibreMap, places: CompetitorPlace[], selectedPlaceId: string | null | undefined, buildingLayer: string) {
  const zoom = map.getZoom()
  if (zoom < AREA_MIN_ZOOM) return { features: [], signature: 'hidden' }
  const bounds = map.getBounds()
  // One query for the whole view, split into single outlines once. Below this zoom no store-sized building is
  // big enough on screen to outline, so the query is skipped.
  const buildings = zoom >= BUILDING_MIN_ZOOM && map.getLayer(buildingLayer)
    ? splitBuildings(map.queryRenderedFeatures({ layers: [buildingLayer] })
      .map((feature) => feature.geometry)
      .filter((geometry): geometry is AreaShape => geometry.type === 'Polygon' || geometry.type === 'MultiPolygon'))
    : []
  const signature: string[] = [zoom.toFixed(2)]
  const features = places.flatMap((place): Feature<Polygon | MultiPolygon>[] => {
    const properties = { category: place.category, color: CATEGORY_STYLE[place.category].color, selected: place.id === selectedPlaceId }
    const mpp = metersPerPixel(place.lat, zoom)
    const footprint = estimatedFootprintMeters(place.profile.employeeCountRange)
    const building = buildings.length && bounds.contains([place.lng, place.lat]) ? pickBuilding(buildings, [place.lng, place.lat]) : null
    const buildingSize = building ? sizeMeters(building) : null
    const tier = areaTier({
      buildingMinSidePx: buildingSize ? Math.min(buildingSize.width, buildingSize.height) / mpp : undefined,
      buildingAreaM2: building ? areaSquareMeters(building.coordinates) : undefined,
      footprintMeters: footprint,
      estimateSidePx: footprint / mpp,
    })
    signature.push(`${place.id}:${tier}:${properties.selected ? 1 : 0}:${building ? `${building.minLng},${building.minLat}` : ''}`)
    if (tier === 'building' && building) return [{ type: 'Feature', properties: { ...properties, tier }, geometry: { type: 'Polygon', coordinates: building.coordinates } }]
    // An estimate circle covers about the same ground as the team-size footprint square it replaces.
    const radiusKm = tier === 'estimate' ? (footprint * 0.6) / 1000 : (APPROX_RADIUS_PX * mpp) / 1000
    return CIRCLE_RINGS.map((scale, ring) => ({ ...circleFeature(place.lat, place.lng, radiusKm * scale), properties: { ...properties, tier, ring } }))
  })
  return { features, signature: signature.join('|') }
}

// Map callout for one business: a category pin with a white badge, and a card with the business name,
// type, and how long it has been open. The tab marks it as demo data, since these businesses are fictional.
function businessCallout(place: CompetitorPlace, selected: boolean, onClick?: () => void): HTMLDivElement {
  const style = CATEGORY_STYLE[place.category]
  const years = place.profile.yearsOperating
  const container = document.createElement('div')
  container.className = 'tanawkita-map-marker'
  container.style.setProperty('--cat', style.color)
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `biz-callout${selected ? ' selected' : ''}`
  const spokenYears = years === undefined ? 'years open not listed' : years < 1 ? 'under 1 year in business' : `${years} year${years === 1 ? '' : 's'} in business`
  button.setAttribute('aria-label', `${place.name}, ${categoryLabel(place.category)}, ${spokenYears}, demo business`)
  button.setAttribute('aria-pressed', String(selected))
  const span = (className: string, text?: string) => {
    const element = document.createElement('span')
    element.className = className
    if (text) element.textContent = text
    return element
  }
  const pin = span('biz-callout-pin')
  pin.append(span('biz-callout-badge', style.glyph))
  const card = span('biz-callout-card')
  const head = span('biz-callout-head')
  const name = document.createElement('strong')
  name.className = 'biz-callout-name'
  name.textContent = place.name
  head.append(name, span('biz-callout-dot'))
  const row = (label: string, value: string) => {
    const element = span('biz-callout-row')
    const val = document.createElement('b')
    val.textContent = value
    element.append(span('', label), val)
    return element
  }
  card.append(span('biz-callout-tag', 'Demo'), head, row('Type', style.short), row('In business', yearsInBusinessLabel(years)))
  button.append(span('biz-callout-line'), pin, card)
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
  const [mode, setMode] = useState<MapMode>('2d')
  const modeRef = useRef<MapMode>('2d')
  const compassRef = useRef<NavigationControl | null>(null)
  const is3d = mode === '3d'
  const selectedJob = jobs.find((job) => job.id === selectedId)
  const focus = selectedJob ? [selectedJob.lat, selectedJob.lng] as [number, number] : business ? [business.lat, business.lng] as [number, number] : (me ?? null)

  useEffect(() => {
    if (!container.current || mapRef.current) return

    let instance: LibreMap
    try {
      instance = new LibreMap({
        container: container.current,
        style: TANAWKITA_MAP_STYLE,
        center: view ? [view.center[1], view.center[0]] : [DAVAO_CENTER[1], DAVAO_CENTER[0]],
        zoom: view?.zoom ?? zoom ?? (fill ? 14 : 13.5),
        // Opens in 2D: flat, north-up, no rotating or tilting until the 3D button is pressed.
        pitch: 0,
        bearing: 0,
        maxPitch: 0,
        dragRotate: false,
        touchPitch: false,
        // Scroll-wheel zoom needs Ctrl (Cmd on Mac); touch needs two fingers. Keeps page scrolling usable.
        cooperativeGestures: true,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Map could not be initialized')
      return
    }

    mapRef.current = instance
    instance.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    instance.touchZoomRotate.disableRotation()
    instance.keyboard.disableRotation()
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

  // Each mode shows only its own layers, so 2D never draws 3D buildings and 3D never draws the flat shapes.
  useEffect(() => {
    if (!map) return
    for (const [layerMode, ids] of Object.entries(MODE_LAYERS)) {
      for (const id of ids) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', layerMode === mode ? 'visible' : 'none')
      }
    }
  }, [map, mode])

  // Only this button changes modes. Gestures stay inside the current mode: 2D cannot tilt or rotate,
  // and 3D keeps its tilt between MIN_PITCH_3D and MAX_PITCH_3D.
  function switchMode(next: MapMode) {
    if (!map || next === modeRef.current) return
    modeRef.current = next
    setMode(next)
    if (next === '3d') {
      map.setMaxPitch(MAX_PITCH_3D)
      map.dragRotate.enable()
      map.touchPitch.enable()
      map.touchZoomRotate.enableRotation()
      map.keyboard.enableRotation()
      compassRef.current = new NavigationControl({ showZoom: false, visualizePitch: true })
      map.addControl(compassRef.current, 'bottom-right')
      map.easeTo({ pitch: PITCH_3D, bearing: -15, duration: 700 })
      // Set the tilt floor after the camera has tilted, or it would jump straight to it.
      map.once('moveend', () => {
        if (modeRef.current === '3d') map.setMinPitch(MIN_PITCH_3D)
      })
    } else {
      map.setMinPitch(0)
      map.dragRotate.disable()
      map.touchPitch.disable()
      map.touchZoomRotate.disableRotation()
      map.keyboard.disableRotation()
      if (compassRef.current) map.removeControl(compassRef.current)
      compassRef.current = null
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 })
      map.once('moveend', () => {
        if (modeRef.current === '2d') map.setMaxPitch(0)
      })
    }
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
  }, [map, places, selectedPlaceId])

  // Reshape the shaded areas whenever the map settles: their precision depends on zoom and on loaded building tiles.
  useEffect(() => {
    if (!map) return
    const source = map.getSource(COMPETITOR_AREA_SOURCE) as GeoJSONSource | undefined
    let last = ''
    const update = () => {
      const { features, signature } = businessAreas(map, places, selectedPlaceId, mode === '3d' ? BUILDINGS_3D_LAYER : FLAT_BUILDINGS_LAYER)
      // Updating the source triggers another idle event; skip it when nothing changed so this does not loop.
      if (signature === last) return
      last = signature
      source?.setData({ type: 'FeatureCollection', features })
    }
    update()
    // moveend reshapes right after a zoom; idle catches building tiles that finish loading later.
    map.on('moveend', update)
    map.on('idle', update)
    return () => {
      map.off('moveend', update)
      map.off('idle', update)
    }
  }, [map, places, selectedPlaceId, mode])

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
          onClick={() => switchMode(is3d ? '2d' : '3d')}
          aria-pressed={is3d}
          aria-label={is3d ? 'Map is 3D. Switch to flat 2D map' : 'Map is 2D. Switch to 3D buildings'}
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
