import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  message: string
  onUndo: () => void
  // Time is up (or the toast was closed) without undoing.
  onDone: () => void
  seconds?: number
}

// "Done · Undo" message at the bottom of the screen. Changes happen at once and can be undone for a few seconds,
// instead of asking "Are you sure?" first.
export default function UndoToast({ message, onUndo, onDone, seconds = 8 }: Props) {
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])
  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  return createPortal(
    <div className="undo-toast" role="status">
      <span>{message}</span>
      <button type="button" className="undo-toast-button" onClick={onUndo}>
        Undo
      </button>
      <button type="button" className="undo-toast-close" aria-label="Close message" onClick={onDone}>
        ×
      </button>
      <span className="undo-toast-timer" style={{ animationDuration: `${seconds}s` }} aria-hidden="true" />
    </div>,
    document.body,
  )
}
