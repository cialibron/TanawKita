import type { ExpressionSpecification, LayerSpecification, Map as LibreMap, StyleSpecification } from 'maplibre-gl'

// TanawKita's own base map: a flat slate-blue city plan drawn from free OpenFreeMap (OpenMapTiles) vector tiles.
// Light blocks, dark uniform streets, plain buildings, and only place and main-road names.
// 2D and 3D each have their own building layer; MapLibreView shows one set at a time.

export const FLAT_BUILDINGS_LAYER = 'tk-buildings-flat'
export const BUILDINGS_3D_LAYER = 'tanawkita-3d-buildings'

const COLORS = {
  block: '#454e72',
  park: '#3f5675',
  water: '#262e4c',
  roadMajor: '#252c4a',
  road: '#2a3152',
  roadMinor: '#2f3759',
  path: '#3a4369',
  rail: '#6c78a6',
  building: '#5a6590',
  buildingEdge: '#3a4366',
  label: '#cfd6ee',
  labelSoft: '#a9b3d6',
  halo: '#2a3152',
}

const lines: ExpressionSpecification = ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false]
const polygons: ExpressionSpecification = ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false]
const points: ExpressionSpecification = ['match', ['geometry-type'], ['Point', 'MultiPoint'], true, false]
const notTunnel: ExpressionSpecification = ['!=', ['get', 'brunnel'], 'tunnel']

// Road width in pixels by zoom, growing quickly so streets read as wide bands at street level.
function roadWidth(stops: [number, number][]): ExpressionSpecification {
  return ['interpolate', ['exponential', 1.6], ['zoom'], ...stops.flat()] as ExpressionSpecification
}

function road(id: string, classes: string[], color: string, minzoom: number, stops: [number, number][]): LayerSpecification {
  return {
    id,
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom,
    filter: ['all', lines, notTunnel, ['match', ['get', 'class'], classes, true, false]],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': color, 'line-width': roadWidth(stops) },
  }
}

function extrusionColor([low, mid, high]: [string, string, string]): ExpressionSpecification {
  return ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 0], 0, low, 25, mid, 60, high]
}

const labelPaint = { 'text-color': COLORS.label, 'text-halo-color': COLORS.halo, 'text-halo-width': 1.4 }

const layers: LayerSpecification[] = [
  { id: 'tk-background', type: 'background', paint: { 'background-color': COLORS.block } },
  {
    id: 'tk-park',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landcover',
    filter: ['all', polygons, ['match', ['get', 'class'], ['wood', 'grass'], true, false]],
    paint: { 'fill-color': COLORS.park, 'fill-opacity': 0.7 },
  },
  {
    id: 'tk-landuse-park',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'landuse',
    filter: ['all', polygons, ['match', ['get', 'class'], ['park', 'cemetery', 'pitch', 'stadium'], true, false]],
    paint: { 'fill-color': COLORS.park, 'fill-opacity': 0.7 },
  },
  {
    id: 'tk-water',
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'water',
    filter: ['all', polygons, notTunnel],
    paint: { 'fill-color': COLORS.water },
  },
  {
    id: 'tk-waterway',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'waterway',
    filter: lines,
    paint: { 'line-color': COLORS.water, 'line-width': roadWidth([[10, 0.5], [14, 2], [18, 8]]) },
  },
  road('tk-road-path', ['path', 'track'], COLORS.path, 15, [[15, 0.6], [18, 3]]),
  road('tk-road-minor', ['minor', 'service'], COLORS.roadMinor, 13, [[13, 0.6], [14, 2], [16, 7], [18, 20]]),
  road('tk-road-mid', ['secondary', 'tertiary'], COLORS.road, 10, [[10, 0.8], [12, 2], [14, 5], [16, 13], [18, 30]]),
  road('tk-road-major', ['motorway', 'trunk', 'primary'], COLORS.roadMajor, 6, [[6, 0.6], [10, 1.6], [12, 3], [14, 7], [16, 17], [18, 38]]),
  {
    id: 'tk-rail',
    type: 'line',
    source: 'openmaptiles',
    'source-layer': 'transportation',
    minzoom: 12,
    filter: ['all', lines, ['match', ['get', 'class'], ['rail', 'transit'], true, false]],
    paint: { 'line-color': COLORS.rail, 'line-width': 1.2, 'line-dasharray': [3, 3] },
  },
  // 2D buildings: flat blocks with a thin dark edge, fading in at street zoom.
  {
    id: FLAT_BUILDINGS_LAYER,
    type: 'fill',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: 14,
    filter: polygons,
    paint: {
      'fill-color': COLORS.building,
      'fill-outline-color': COLORS.buildingEdge,
      'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.35, 15.5, 1],
    },
  },
  // 3D buildings: extruded from OSM heights, hidden until the map is switched to 3D.
  {
    id: BUILDINGS_3D_LAYER,
    type: 'fill-extrusion',
    source: 'openmaptiles',
    'source-layer': 'building',
    minzoom: 13,
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
      'fill-extrusion-color': extrusionColor(['#535e88', '#64709e', '#7a87b8']),
      'fill-extrusion-opacity': 0.95,
    },
  },
  {
    id: 'tk-road-names',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'transportation_name',
    minzoom: 14,
    filter: ['all', lines, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, ['>=', ['zoom'], 16]]],
    layout: {
      'symbol-placement': 'line',
      'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
      'text-font': ['Noto Sans Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 18, 13],
      'text-max-angle': 30,
    },
    paint: { ...labelPaint, 'text-color': COLORS.labelSoft },
  },
  {
    id: 'tk-place-local',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    minzoom: 11,
    filter: ['all', points, ['match', ['get', 'class'], ['suburb', 'quarter', 'neighbourhood', 'village', 'hamlet'], true, false]],
    layout: {
      'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
      'text-font': ['Noto Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 16, 14],
      'text-transform': 'uppercase',
      'text-letter-spacing': 0.08,
      'text-max-width': 8,
    },
    paint: labelPaint,
  },
  {
    id: 'tk-place-city',
    type: 'symbol',
    source: 'openmaptiles',
    'source-layer': 'place',
    maxzoom: 13,
    filter: ['all', points, ['match', ['get', 'class'], ['city', 'town'], true, false]],
    layout: {
      'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']],
      'text-font': ['Noto Sans Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 6, 12, 12, 18],
    },
    paint: labelPaint,
  },
]

export const TANAWKITA_MAP_STYLE: StyleSpecification = {
  version: 8,
  name: 'TanawKita city plan',
  sources: { openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' } },
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers,
}

// Light mode: a lighter shade of the same blues for city blocks, parks and buildings. Roads, paths, rail and
// water keep their dark colors, so the street network still reads clearly.
export type MapTheme = 'dark' | 'light'

type PaintProperty = Parameters<LibreMap['setPaintProperty']>[1]
type PaintValue = Parameters<LibreMap['setPaintProperty']>[2]

const THEME_PAINT: Record<MapTheme, [layer: string, property: PaintProperty, value: PaintValue][]> = {
  dark: [
    ['tk-background', 'background-color', COLORS.block],
    ['tk-park', 'fill-color', COLORS.park],
    ['tk-landuse-park', 'fill-color', COLORS.park],
    [FLAT_BUILDINGS_LAYER, 'fill-color', COLORS.building],
    [FLAT_BUILDINGS_LAYER, 'fill-outline-color', COLORS.buildingEdge],
    [BUILDINGS_3D_LAYER, 'fill-extrusion-color', extrusionColor(['#535e88', '#64709e', '#7a87b8'])],
  ],
  light: [
    ['tk-background', 'background-color', '#7183b6'],
    ['tk-park', 'fill-color', '#6688b0'],
    ['tk-landuse-park', 'fill-color', '#6688b0'],
    [FLAT_BUILDINGS_LAYER, 'fill-color', '#90a1d2'],
    [FLAT_BUILDINGS_LAYER, 'fill-outline-color', '#5d6ea3'],
    [BUILDINGS_3D_LAYER, 'fill-extrusion-color', extrusionColor(['#8595c8', '#97a6d5', '#aab7e2'])],
  ],
}

export function applyMapTheme(map: LibreMap, theme: MapTheme) {
  for (const [layer, property, value] of THEME_PAINT[theme]) {
    if (map.getLayer(layer)) map.setPaintProperty(layer, property, value)
  }
}
