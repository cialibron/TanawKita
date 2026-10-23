// Aerial photo of a map point, built from free Esri World Imagery tiles (no API key), with a link to open the
// same point in Google Maps. Demo points are approximate, so the caption says so instead of naming a storefront.
const ZOOM = 18
const TILE = 256
const TILE_URL = (x: number, y: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${y}/${x}`

function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`
}

interface Props {
  lat: number
  lng: number
  label: string
}

export default function LocationPhoto({ lat, lng, label }: Props) {
  // Fractional tile position of the point (Web Mercator).
  const n = 2 ** ZOOM
  const fx = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const fy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  const cx = Math.floor(fx)
  const cy = Math.floor(fy)
  // A 3×3 block of tiles around the point, shifted so the point sits in the middle of the frame.
  const offsetX = (fx - cx + 1) * TILE
  const offsetY = (fy - cy + 1) * TILE
  const tiles = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ x: cx + dx, y: cy + dy, dx, dy })))
  const mapsUrl = googleMapsUrl(lat, lng)

  return (
    <figure className="location-photo">
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="location-photo-frame" aria-label={`Open ${label} in Google Maps`}>
        <span className="location-photo-tiles" style={{ left: `calc(50% - ${offsetX}px)`, top: `calc(50% - ${offsetY}px)` }}>
          {tiles.map((t) => (
            <img
              key={`${t.x}-${t.y}`}
              src={TILE_URL(t.x, t.y)}
              alt=""
              width={TILE}
              height={TILE}
              loading="lazy"
              style={{ left: (t.dx + 1) * TILE, top: (t.dy + 1) * TILE }}
            />
          ))}
        </span>
        <span className="location-photo-pin" aria-hidden="true" />
      </a>
      <figcaption>
        <span>Aerial view · approximate demo location</span>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="location-photo-link">
          View on Google Maps <span aria-hidden="true">↗</span>
        </a>
        <small>Imagery © Esri, Maxar, Earthstar Geographics</small>
      </figcaption>
    </figure>
  )
}
