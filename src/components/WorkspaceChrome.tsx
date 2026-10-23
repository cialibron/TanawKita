import { useState } from 'react'
import EyeIcon from './EyeIcon'
import { BrandEmblem } from './Logo'
import type { View } from '../types'

export interface WorkspaceNavItem {
  id: string
  label: string
  icon: string
}

const VIEWS: { id: View; label: string }[] = [
  { id: 'jobseeker', label: 'Jobseeker' },
  { id: 'employer', label: 'Employer' },
  { id: 'admin', label: 'PESO admin' },
]

export const VIEW_LABEL: Record<View, string> = {
  jobseeker: 'Jobseeker',
  employer: 'Employer',
  admin: 'PESO admin',
}

interface RailProps {
  view: View
  navigation: WorkspaceNavItem[]
  activeNavigation: string
  onNavigationChange: (id: string) => void
  // The minimize/maximize control, shown only on screens that have a left menu to collapse.
  menu?: { open: boolean; onOpenChange: (open: boolean) => void }
  // Full-screen menu: the rail widens to labeled buttons and the panel covers the map.
  fullScreen?: { on: boolean; onChange: (on: boolean) => void }
}

// The left icon rail: the current role's real navigation (never role switching).
export function WorkspaceRail({ view, navigation, activeNavigation, onNavigationChange, menu, fullScreen }: RailProps) {
  const expanded = fullScreen?.on ?? false
  return (
    <nav className={`workspace-rail${expanded ? ' expanded' : ''}`} aria-label={`${VIEW_LABEL[view]} navigation`}>
      <div className="workspace-mark tk-brand-mark" title="TanawKita"><BrandEmblem height={30} /></div>
      {menu && (
        <button
          type="button"
          className="rail-toggle"
          aria-label={menu.open ? 'Minimize left menu' : 'Maximize left menu'}
          aria-expanded={menu.open}
          title={menu.open ? 'Minimize menu' : 'Maximize menu'}
          onClick={() => {
            menu.onOpenChange(!menu.open)
            if (menu.open) fullScreen?.onChange(false)
          }}
        >
          <span aria-hidden="true">{menu.open ? '‹' : '›'}</span>
          <span className="rail-label">Minimize menu</span>
        </button>
      )}
      {fullScreen && (
        <button
          type="button"
          className="rail-toggle rail-fullscreen"
          aria-label={expanded ? 'Exit full-screen menu' : 'Show menu full screen'}
          aria-pressed={expanded}
          title={expanded ? 'Exit full screen' : 'Full-screen menu'}
          onClick={() => {
            fullScreen.onChange(!expanded)
            if (!expanded && menu && !menu.open) menu.onOpenChange(true)
          }}
        >
          <span aria-hidden="true">{expanded ? '⤡' : '⤢'}</span>
          <span className="rail-label">{expanded ? 'Exit full screen' : 'Full screen'}</span>
        </button>
      )}
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
              if (menu && !menu.open) menu.onOpenChange(true)
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            {expanded ? <span className="rail-label">{item.label}</span> : <span className="role-tooltip" role="tooltip">{item.label}</span>}
          </button>
        ))}
      </div>
      <div className="rail-spacer" />
      <div className="workspace-avatar tk-eye-avatar" title="TanawKita demo"><EyeIcon width={22} /></div>
    </nav>
  )
}

interface PickerProps {
  view: View
  onViewChange: (view: View) => void
  onSwitch?: () => void
}

// Developer-only convenience for switching demo interfaces; always placed in the upper-right.
export function DevRolePicker({ view, onViewChange, onSwitch }: PickerProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`dev-role-picker${open ? ' open' : ''}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="map-action-button dev-role-trigger" aria-haspopup="true" aria-expanded={open} aria-label={`Developer view: ${VIEW_LABEL[view]}`} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">⚙</span><span className="dev-role-label">Developer view · {VIEW_LABEL[view]}</span><span aria-hidden="true">⌄</span>
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
              setOpen(false)
              onSwitch?.()
            }}
          >
            {item.label}{view === item.id ? ' ✓' : ''}
          </button>
        ))}
      </div>
    </div>
  )
}
