import { useState, type ReactNode } from 'react'
import type { View } from '../types'

export interface WorkspaceNavItem {
  id: string
  label: string
  icon: string
}

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
}

const VIEWS: { id: View; label: string }[] = [
  { id: 'jobseeker', label: 'Jobseeker' },
  { id: 'employer', label: 'Employer' },
  { id: 'admin', label: 'PESO admin' },
]

const VIEW_LABEL: Record<View, string> = {
  jobseeker: 'Jobseeker',
  employer: 'Employer',
  admin: 'PESO admin',
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
}: Props) {
  const [ownOpen, setOwnOpen] = useState(true)
  const [mapFullScreen, setMapFullScreen] = useState(false)
  const [detailExpanded, setDetailExpanded] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(true)
  const open = panelOpen ?? ownOpen
  const setOpen = onPanelOpenChange ?? setOwnOpen

  return (
    <main className={`mapshell${open ? ' menu-open' : ' menu-minimized'}${mapFullScreen ? ' map-fullscreen' : ''}`}>
      {!mapFullScreen && (
        <nav className="workspace-rail" aria-label={`${VIEW_LABEL[view]} navigation`}>
          <div className="workspace-mark" title="TanawKita">T</div>
          <button
            type="button"
            className="rail-toggle"
            aria-label={open ? 'Minimize left menu' : 'Maximize left menu'}
            aria-expanded={open}
            title={open ? 'Minimize menu' : 'Maximize menu'}
            onClick={() => setOpen(!open)}
          >
            {open ? '‹' : '›'}
          </button>
          <div className="rail-divider" />
          <div className="role-rail">
            {navigation.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`role-rail-button${activeNavigation === item.id ? ' active' : ''}`}
                aria-label={item.label}
                aria-pressed={activeNavigation === item.id}
                title={item.label}
                onClick={() => {
                  onNavigationChange(item.id)
                  if (!open) setOpen(true)
                }}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="role-tooltip" role="tooltip">{item.label}</span>
              </button>
            ))}
          </div>
          <div className="rail-spacer" />
          <div className="workspace-avatar" title="Demo workspace">TK</div>
        </nav>
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
          <div
            className={`dev-role-picker${roleMenuOpen ? ' open' : ''}`}
            onMouseEnter={() => setRoleMenuOpen(true)}
            onMouseLeave={() => setRoleMenuOpen(false)}
          >
            <button
              type="button"
              className="map-action-button dev-role-trigger"
              aria-haspopup="true"
              aria-expanded={roleMenuOpen}
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            >
              <span aria-hidden="true">⚙</span><span>Developer view · {VIEW_LABEL[view]}</span><span aria-hidden="true">⌄</span>
            </button>
            <div className="dev-role-menu" role="menu" aria-label="Switch demo interface">
              {VIEWS.map((item) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={view === item.id}
                  className={view === item.id ? 'active' : ''}
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id)
                    setRoleMenuOpen(false)
                    setMapFullScreen(false)
                  }}
                >
                  {item.label}{view === item.id ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </div>
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

        {detail && !mapFullScreen && (
          <section className={`workspace-detail${detailOpen ? ' detail-open' : ' detail-minimized'}${detailExpanded ? ' detail-expanded' : ''}`} aria-label="Selected item details">
            <div className="workspace-detail-controls">
              <button type="button" className="detail-expand-button" onClick={() => setDetailExpanded(!detailExpanded)}>
                {detailExpanded ? 'Minimize details' : 'Expand details'}
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
