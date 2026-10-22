import L from 'leaflet'

// leaflet.heat is an old plugin that attaches itself to a global L, so expose it before the plugin loads.
;(window as unknown as { L: typeof L }).L = L
