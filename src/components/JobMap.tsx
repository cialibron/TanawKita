import type { JobPost } from '../types'
import MapLibreView from './MapLibreView'

export const DAVAO_CENTER: [number, number] = [7.0731, 125.6128]

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

export default function JobMap(props: Props) {
  return <MapLibreView {...props} />
}
