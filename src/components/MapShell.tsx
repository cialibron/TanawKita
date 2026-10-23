import { useState, type ReactNode } from 'react'
import type { View } from '../types'
import { DevRolePicker, WorkspaceRail, VIEW_LABEL, type WorkspaceNavItem } from './WorkspaceChrome'

export type { WorkspaceNavItem }

interface Props {
  map: ReactNode
  overlay?: ReactNode
  panel: ReactNode
  navigation: WorkspaceNavItem[]
  activeNavigation: string
  onNavigationChange: (id: string) => void
  view: View
  onViewChange: (view: View) => void
  panelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
  detail?: ReactNode
  // Full-screen menu, controlled by the page when it needs to know (otherwise kept here).
  panelFullScreen?: boolean
  onPanelFullScreenChange?: (on: boolean) => void
}

// A map-first workspace. The role switch is deliberately a developer-only convenience in the top-right;
// the left rail is reserved for the current role's real navigation.
export default function MapShell({
  map,
  overlay,
  panel,
  navigation,
  activeNavigation,
  onNavigationChange,
  view,
  onViewChange,
  panelOpen,
  onPanelOpenChange,
  detail,
  panelFullScreen,
  onPanelFullScreenChange,
}: Props) {
  const [ownOpen, setOwnOpen] = useState(true)
  const [mapFullScreen, setMapFullScreen] = useState(false)
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [detailOpen, setDetailOpen] = useState(true)
  const open = panelOpen ?? ownOpen
  const setOpen = onPanelOpenChange ?? setOwnOpen
  const [ownFull, setOwnFull] = useState(false)
  const full = (panelFullScreen ?? ownFull) && open
  const setFull = onPanelFullScreenChange ?? setOwnFull

  return (
    <main className={`mapshell${open ? ' menu-open' : ' menu-minimized'}${mapFullScreen ? ' map-fullscreen' : ''}${full ? ' panel-fullscreen' : ''}`}>
      {!mapFullScreen && (
        <WorkspaceRail
          view={view}
          navigation={navigation}
          activeNavigation={activeNavigation}
          onNavigationChange={onNavigationChange}
          menu={{ open, onOpenChange: setOpen }}
          fullScreen={{ on: full, onChange: setFull }}
        />
      )}

      {!mapFullScreen && (
        <aside className={`mapshell-panel${open ? ' expanded' : ' minimized'}`} aria-label={`${VIEW_LABEL[view]} menu`}>
          <div className="panel-body">{panel}</div>
        </aside>
      )}

      <section className="mapshell-map" aria-label="Map workspace">
        {map}
        {overlay && <div className="map-overlay">{overlay}</div>}

        <div className="map-actions">
          <DevRolePicker view={view} onViewChange={onViewChange} onSwitch={() => setMapFullScreen(false)} />
          <button
            type="button"
            className="map-action-button map-fullscreen-button"
            onClick={() => setMapFullScreen(!mapFullScreen)}
            aria-label={mapFullScreen ? 'Exit full-screen map' : 'Show map full screen'}
          >
            <span aria-hidden="true">{mapFullScreen ? '⊡' : '⛶'}</span>
            <span>{mapFullScreen ? 'Show menu' : 'Full map'}</span>
          </button>
        </div>

        {detail && !mapFullScreen && !full && (
          <section className={`workspace-detail${detailOpen ? ' detail-open' : ' detail-minimized'}${detailExpanded ? ' detail-expanded' : ''}`} aria-label="Selected item details">
            <div className="workspace-detail-controls">
              <button type="button" className="detail-expand-button" onClick={() => setDetailExpanded(!detailExpanded)}>
                {detailExpanded ? 'Show less ↓' : 'Expand details ↑'}
              </button>
              <button type="button" className="detail-collapse-button" onClick={() => setDetailOpen(!detailOpen)} aria-label={detailOpen ? 'Minimize selected details' : 'Show selected details'}>
                {detailOpen ? '⌄' : '⌃'}
              </button>
            </div>
            {detailOpen && <div className="workspace-detail-content">{detail}</div>}
          </section>
        )}
      </section>
    </main>
  )
}
