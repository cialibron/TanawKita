import { useState, type ReactNode } from 'react'

interface Props {
  map: ReactNode
  // Floating controls over the top of the map (search, filters).
  overlay?: ReactNode
  panel: ReactNode
  // Lets a parent reopen the panel, e.g. when a pin is clicked.
  panelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
}

// Full-screen map with a side panel on the right (bottom sheet on phones).
export default function MapShell({ map, overlay, panel, panelOpen, onPanelOpenChange }: Props) {
  const [ownOpen, setOwnOpen] = useState(true)
  const open = panelOpen ?? ownOpen
  const setOpen = onPanelOpenChange ?? setOwnOpen

  return (
    <div className="mapshell">
      <div className="mapshell-map">
        {map}
        {overlay && <div className="map-overlay">{overlay}</div>}
      </div>

      <aside className={`mapshell-panel${open ? '' : ' collapsed'}`}>
        <button
          type="button"
          className="panel-handle"
          aria-label={open ? 'Hide panel' : 'Show panel'}
          onClick={() => setOpen(!open)}
        >
          {open ? '›' : '‹'}
        </button>
        <div className="panel-body">{panel}</div>
      </aside>
    </div>
  )
}
