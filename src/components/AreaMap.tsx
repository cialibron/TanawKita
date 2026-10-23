import MapLibreView from './MapLibreView'
import type { CompetitorPlace } from '../businessDirectory'
import type { JobPost } from '../types'

interface Props {
  heat: [number, number, number][]
  business: { lat: number; lng: number; name: string } | null
  radiusKm: number
  onPick?: (latLng: [number, number]) => void
  height?: number
  // Fill the parent instead of a fixed-height rounded box.
  fill?: boolean
  // Same look as the jobseeker job map: the business as a callout over a glowing circle (its building colored),
  // and pay tags for jobs posted away from the business.
  places?: CompetitorPlace[]
  selectedPlaceId?: string | null
  onPlaceSelect?: (placeId: string) => void
  jobs?: JobPost[]
  // Demo jobseeker profiles (synthetic) inside the search circle, drawn as small dots.
  people?: [number, number][]
}

// Employer map: business search radius and workforce heat, drawn in the job map's style.
export default function AreaMap(props: Props) {
  const hasCallout = (props.places?.length ?? 0) > 0
  return (
    // The callout already names the business, so the plain business pin is hidden when one is shown.
    <div className={`area-map${hasCallout ? ' has-callout' : ''}`}>
      <MapLibreView {...props} areaStyle="pin-circle" zoom={props.business ? 14 : 12.5} />
    </div>
  )
}
