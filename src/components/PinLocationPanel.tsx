import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import JobMap from './JobMap'
import { nearestBarangay } from '../area'
import { barangayName } from '../data/barangays'

interface Props {
  // The pin already chosen, if any; the panel starts with it.
  picked: [number, number] | null
  // Where the map opens when nothing is pinned yet, e.g. the chosen barangay.
  center: [number, number]
  onDone: (latLng: [number, number]) => void
  onClose: () => void
}

// Map panel for pinning where a job is. Opens over the whole workspace; the pin is only kept on "Use this location".
export default function PinLocationPanel({ picked, center, onDone, onClose }: Props) {
  const [draft, setDraft] = useState(picked)
  // Opening view only; moving the pin does not move the map.
  const [view] = useState(() => ({ center: picked ?? center, zoom: 16 }))
  const closeRef = useRef<HTMLButtonElement>(null)
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

  const near = draft && nearestBarangay(draft)

  return createPortal(
    <div className="pin-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className="pin-panel" role="dialog" aria-modal="true" aria-labelledby="pin-title">
        <header>
          <div>
            <h2 id="pin-title">Pin the work location</h2>
            <p>Tap the map where the work is. Tap again to move the pin.</p>
          </div>
          <button ref={closeRef} type="button" className="settings-close" aria-label="Close map" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="pin-map">
          <JobMap fill picked={draft} onPick={setDraft} view={view} />
        </div>
        <footer>
          <span className={draft ? 'ok' : 'muted'}>{draft ? `✓ Pinned${near ? ` near ${barangayName(near)}` : ''}` : 'No pin yet'}</span>
          <span className="pin-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="primary" disabled={!draft} onClick={() => draft && onDone(draft)}>
              Use this location
            </button>
          </span>
        </footer>
      </section>
    </div>,
    document.body,
  )
}
