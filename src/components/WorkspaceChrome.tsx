import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import EyeIcon from './EyeIcon'
import { BrandEmblem } from './Logo'
import SettingsPanel from './SettingsPanel'
import { setPreferences, usePreferences } from '../preferences'
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
      <RailEyeMenu />
    </nav>
  )
}

// The eye button at the bottom of the rail: opens a small menu with Settings and a dark/light mode switch.
// The menu and the Settings panel are rendered on the page body, so they sit above every other open panel.
function RailEyeMenu() {
  const { theme } = usePreferences()
  const [open, setOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Where the menu opens: beside the eye button, bottom-aligned with it.
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)

  function toggle() {
    const box = wrap.current?.getBoundingClientRect()
    // Beside the rail on wide screens; above the button on phones, where the rail is a bottom bar.
    const phone = window.matchMedia('(max-width: 720px)').matches
    if (box && phone) setAnchor({ left: Math.max(8, Math.min(box.left, window.innerWidth - 228)), bottom: window.innerHeight - box.top + 8 })
    else if (box) setAnchor({ left: box.right + 12, bottom: window.innerHeight - box.bottom })
    setOpen(!open)
  }

  // Close the menu on a click outside it or on Escape.
  useEffect(() => {
    if (!open) return
    const inside = (target: Node) => Boolean(wrap.current?.contains(target) || menu.current?.contains(target))
    const onPointer = (e: PointerEvent) => !inside(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const light = theme === 'light'
  return (
    <div className="rail-eye" ref={wrap}>
      <button
        type="button"
        className={`workspace-avatar tk-eye-avatar rail-eye-button${open ? ' open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Settings and theme"
        title="Settings and theme"
        onClick={toggle}
      >
        <EyeIcon width={22} />
      </button>
      {open && anchor && createPortal(
        <div ref={menu} className="rail-eye-menu" role="menu" aria-label="Settings and theme" style={{ left: anchor.left, bottom: anchor.bottom }}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setSettingsOpen(true)
            }}
          >
            <span aria-hidden="true" className="rail-eye-icon">⚙</span> Settings
          </button>
          <button type="button" role="menuitemcheckbox" aria-checked={light} onClick={() => setPreferences({ theme: light ? 'dark' : 'light' })}>
            <span aria-hidden="true" className="rail-eye-icon">{light ? '☀' : '☾'}</span>
            Light mode
            <span aria-hidden="true" className={`settings-switch small${light ? ' on' : ''}`}><span /></span>
          </button>
        </div>,
        document.body,
      )}
      {settingsOpen && createPortal(<SettingsPanel onClose={() => setSettingsOpen(false)} />, document.body)}
    </div>
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
