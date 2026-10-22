import MapLibreView from './MapLibreView'
import type { CompetitorPlace } from '../businessDirectory'

interface Props {
  heat: [number, number, number][]
  business: { lat: number; lng: number; name: string } | null
  radiusKm: number
  onPick?: (latLng: [number, number]) => void
  height?: number
  // Fill the parent instead of a fixed-height rounded box.
  fill?: boolean
  places?: CompetitorPlace[]
  selectedPlaceId?: string | null
  onPlaceSelect?: (placeId: string) => void
  mapView?: { center: [number, number]; zoom: number }
}

// Employer map: business search radius, workforce heat, plus optional OSM competitor locations.
export default function AreaMap({ mapView, ...props }: Props) {
  return <MapLibreView {...props} zoom={props.business ? 14 : 12.5} view={mapView} />
}
