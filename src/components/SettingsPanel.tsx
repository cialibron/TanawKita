import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clearSession } from '../pages/demoAuth'
import { setPreferences, usePreferences } from '../preferences'
import { useStore } from '../store'
import { replayTutorial } from '../pages/tutorial'

interface Props {
  onClose: () => void
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (id: T) => void }) {
  return (
    <div className="settings-row">
      <span className="settings-row-label">{label}</span>
      <div className="settings-segmented" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button key={option.id} type="button" role="radio" aria-checked={value === option.id} className={value === option.id ? 'active' : ''} onClick={() => onChange(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Switch({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="settings-row">
      <span>
        <span className="settings-row-label">{label}</span>
        {hint && <span className="settings-row-hint">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`settings-switch${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
        <span aria-hidden="true" />
      </button>
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-group">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

// User settings for this browser: how the site looks, the demo account, and the demo data saved on this device.
export default function SettingsPanel({ onClose }: Props) {
  const prefs = usePreferences()
  const { state, dispatch } = useStore()
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  // Latest close handler, so a new function from the parent does not re-run the focus effect.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function signOut() {
    clearSession()
    window.location.reload()
  }

  return (
    <div className="settings-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header>
          <h2 id="settings-title">Settings</h2>
          <button ref={closeRef} type="button" className="settings-close" aria-label="Close settings" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="settings-body">
          <Group title="Appearance">
            <Segmented
              label="Theme"
              value={prefs.theme}
              options={[
                { id: 'dark', label: 'Dark' },
                { id: 'light', label: 'Light' },
              ]}
              onChange={(theme) => setPreferences({ theme })}
            />
            <Segmented
              label="Text size"
              value={prefs.textSize}
              options={[
                { id: 'normal', label: 'Normal' },
                { id: 'large', label: 'Large' },
              ]}
              onChange={(textSize) => setPreferences({ textSize })}
            />
            <Switch label="Reduce motion" hint="Turns off panel and button animations." on={prefs.reduceMotion} onChange={(reduceMotion) => setPreferences({ reduceMotion })} />
          </Group>

          <Group title="Getting started">
            <p className="settings-note">See the welcome screen and the step-by-step tour of Find jobs again.</p>
            <button
              type="button"
              className="settings-secondary"
              onClick={() => {
                onClose()
                replayTutorial()
              }}
            >
              Show the tour again
            </button>
          </Group>

          <Group title="Demo data on this device">
            <p className="settings-note">Your skill card, applications and job posts are saved only in this browser.</p>
            {resetDone ? (
              <p className="settings-done">✓ Demo data reset to the starting sample.</p>
            ) : confirmReset ? (
              <div className="settings-confirm">
                <span>Erase your changes and start over?</span>
                <button type="button" className="settings-danger" onClick={() => { const view = state.view; dispatch({ type: 'reset' }); dispatch({ type: 'setView', view }); setConfirmReset(false); setResetDone(true) }}>
                  Yes, reset
                </button>
                <button type="button" className="settings-secondary" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="settings-secondary" onClick={() => setConfirmReset(true)}>
                Reset demo data
              </button>
            )}
          </Group>

          <Group title="Account">
            <p className="settings-note">This is a demo sign-in for the prototype. It is not a secure account.</p>
            <button type="button" className="settings-secondary" onClick={signOut}>
              Sign out
            </button>
          </Group>

          <Group title="About">
            <p className="settings-note">
              TanawKita is a prototype for the CBMS Innovation Challenge. Businesses, jobs and people shown are fictional sample records at
              approximate locations, not real DTI, PESO or CBMS records.
            </p>
            <p className="settings-note">Map data © OpenStreetMap contributors · tiles by OpenFreeMap.</p>
          </Group>
        </div>
      </section>
    </div>
  )
}
