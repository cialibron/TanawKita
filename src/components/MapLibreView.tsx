import { useEffect, useRef, useState } from 'react'
import { Map as LibreMap, Marker as LibreMarker, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent, type MapMouseEvent } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import './maplibre.css'
import PitchToggleControl from './PitchToggleControl'
import type { JobPost } from '../types'
import type { Feature, Polygon } from 'geojson'
import type { CompetitorPlace } from '../businessDirectory'

const DAVAO_CENTER: [number, number] = [7.0731, 125.6128]

setWorkerUrl(workerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const HEAT_SOURCE = 'tanawkita-seeker-heat'
const RADIUS_SOURCE = 'tanawkita-business-radius'
const COMPETITOR_SOURCE = 'tanawkita-competitors'
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

  // Dark OpenFreeMap style has no building extrusions; add TanawKita's own 3D OSM buildings.
  if (!map.getLayer('tanawkita-3d-buildings')) {
    map.addLayer(
      {
        id: 'tanawkita-3d-buildings',
        type: 'fill-extrusion',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['get', 'render_height'], 0],
            0,
            '#34383c',
            25,
            '#176a86',
            60,
            '#28a8d0',
          ],
          'fill-extrusion-opacity': 0.9,
        },
      },
      labelsStart,
    )
  }

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
        'circle-color': '#e7a72f',
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 25],
        'circle-stroke-color': '#fff2c2',
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
      paint: { 'text-color': '#201a0c' },
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
        'circle-color': ['case', ['get', 'selected'], '#ffd158', '#2bb6df'],
        'circle-radius': ['case', ['get', 'selected'], 10, 6],
        'circle-stroke-color': '#fff',
        'circle-stroke-width': ['case', ['get', 'selected'], 2.5, 1.5],
      },
    },
    labelsStart,
  )
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
        pitch: 48,
        bearing: -15,
        cooperativeGestures: true,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Map could not be initialized')
      return
    }

    mapRef.current = instance
    // Bottom corners stack newest-on-top, so the 2D/3D toggle is added first to sit under the compass.
    instance.addControl(new PitchToggleControl(), 'bottom-right')
    instance.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right')
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
        properties: { place_id: place.id, name: place.name, category: place.category, selected: place.id === selectedPlaceId },
        geometry: { type: 'Point' as const, coordinates: [place.lng, place.lat] },
      })),
    })
  }, [map, places, selectedPlaceId])

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
    if (selected) map.flyTo({ center: [selected.lng, selected.lat], zoom: Math.max(map.getZoom(), 15), duration: 600 })
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
      <div ref={container} className="maplibre-canvas" aria-label="Interactive 3D map of Davao City" />
      {error && <div className="maplibre-error" role="status">Map unavailable: {error}</div>}
    </div>
  )
}
