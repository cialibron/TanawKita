import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isPhone, type TourStep } from './tutorial'

interface Props {
  steps: TourStep[]
  // Finished or skipped.
  onDone: () => void
  // When this tour is one part of a longer one: the number of steps before it, and the steps in all parts.
  numbering?: { before: number; total: number }
}

interface Box {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 6
const CARD_W = 340
const GAP = 14

// Where the spotlighted control is, padded a little. Null while it is not on screen yet (e.g. the details panel
// is still opening) or while something else covers it (e.g. the full-width menu on a phone); the card then sits
// in the middle of the screen.
function targetBox(selector?: string): Box | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  const x = Math.min(Math.max(r.left + r.width / 2, 0), window.innerWidth - 1)
  const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 20), 0), window.innerHeight - 1)
  const top = document.elementsFromPoint(x, y).find((hit) => !hit.closest('.tour'))
  if (!top || !(el.contains(top) || top.contains(el))) return null
  const boxTop = Math.max(r.top - PAD, 0)
  const left = Math.max(r.left - PAD, 0)
  return {
    top: boxTop,
    left,
    width: Math.min(r.right + PAD, window.innerWidth) - left,
    height: Math.min(r.bottom + PAD, window.innerHeight) - boxTop,
  }
}

const same = (a: Box | null, b: Box | null) =>
  a === b || (a !== null && b !== null && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)

// The visible screen height: on phones the on-screen keyboard shrinks it, and the card must stay above it.
const screenHeight = () => window.visualViewport?.height ?? window.innerHeight

// Phones: the card is docked full width, at the bottom where a thumb reaches it, so it does not jump around.
// It moves to the top when the control being explained is in the lower half of the screen, or when the step
// needs the keyboard (which comes up from the bottom).
function dockedPosition(box: Box | null, cardH: number, keyboard: boolean): { top: number; left: number } {
  const vh = screenHeight()
  const low = box !== null && box.top + box.height / 2 > vh / 2
  return { top: low || keyboard ? 8 : Math.max(vh - cardH - 8, 8), left: 8 }
}

// The step card goes beside the spotlight: below it if there is room, else above, else to its side.
function cardPosition(box: Box | null, cardH: number): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(CARD_W, vw - 32)
  if (!box) return { top: Math.max((vh - cardH) / 2, 16), left: (vw - width) / 2 }
  const clampLeft = (x: number) => Math.min(Math.max(x, 16), vw - width - 16)
  const clampTop = (y: number) => Math.min(Math.max(y, 16), vh - cardH - 16)
  if (box.top + box.height + GAP + cardH <= vh - 16) return { top: box.top + box.height + GAP, left: clampLeft(box.left) }
  if (box.top - GAP - cardH >= 16) return { top: box.top - GAP - cardH, left: clampLeft(box.left) }
  if (box.left + box.width + GAP + width <= vw - 16) return { top: clampTop(box.top), left: box.left + box.width + GAP }
  return { top: clampTop(box.top), left: clampLeft(box.left - GAP - width) }
}

// A step-by-step tour over the real screen: everything is dimmed except the control being explained, which stays
// clickable, and a short card beside it has Back, Next and Skip.
export default function GuidedTour({ steps, onDone, numbering }: Props) {
  const [index, setIndex] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [cardH, setCardH] = useState(180)
  const cardRef = useRef<HTMLElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const step = steps[index]
  const last = index === steps.length - 1
  const before = numbering?.before ?? 0
  const total = numbering?.total ?? steps.length
  // Steps the person does themselves (signing in) have no Next; the tour moves on when they do it.
  const waiting = Boolean(step.waitForUser)
  const phone = isPhone()
  // Re-place the card when the visible screen changes size, e.g. when the phone keyboard opens or closes.
  const [, setViewport] = useState(0)
  useEffect(() => {
    const viewport = window.visualViewport
    const onResize = () => setViewport((n) => n + 1)
    viewport?.addEventListener('resize', onResize)
    window.addEventListener('resize', onResize)
    return () => {
      viewport?.removeEventListener('resize', onResize)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // Follow the control as the page settles, scrolls or resizes.
  useEffect(() => {
    // Scroll the control into view inside its panel, without moving the page itself. On phones it goes to the
    // middle of the screen, clear of the card docked at the top or bottom.
    if (step.target && step.scroll) {
      const page = document.scrollingElement
      const pageTop = page?.scrollTop ?? 0
      document.querySelector(step.target)?.scrollIntoView({ block: isPhone() ? 'center' : 'nearest' })
      if (page) page.scrollTop = pageTop
    }
    let frame = 0
    const track = () => {
      const next = targetBox(step.target)
      setBox((prev) => (same(prev, next) ? prev : next))
      frame = requestAnimationFrame(track)
    }
    track()
    return () => cancelAnimationFrame(frame)
  }, [step.target, step.scroll])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [index, box])

  useEffect(() => {
    // A text field, or the button the person has to press themselves, gets the focus; otherwise Next does.
    // Not text fields on phones: focusing one pops the keyboard up over the screen before the person has read the
    // card. They tap the field themselves when ready.
    const field = ((step.focusTarget && !isPhone()) || step.waitForUser) && step.target ? document.querySelector(step.target) : null
    const control = field?.matches('input, select, textarea, button') ? field : field?.querySelector('input, select, textarea')
    if (control instanceof HTMLElement) control.focus()
    else nextRef.current?.focus()
  }, [index, step.focusTarget, step.waitForUser, step.target])

  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  }, [onDone])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && done.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function next() {
    step.onNext?.()
    if (last) onDone()
    else setIndex(index + 1)
  }

  // Dim everything except the spotlight: an even-odd polygon with the spotlight cut out, so clicks inside the
  // hole reach the real control and clicks elsewhere are blocked.
  const hole = box
    ? `, ${box.left}px ${box.top}px, ${box.left + box.width}px ${box.top}px, ${box.left + box.width}px ${box.top + box.height}px, ${box.left}px ${box.top + box.height}px, ${box.left}px ${box.top}px`
    : ''
  const dimClip = `polygon(evenodd, 0 0, 100vw 0, 100vw 100vh, 0 100vh, 0 0${hole})`
  const position = phone ? dockedPosition(box, cardH, Boolean(step.focusTarget)) : cardPosition(box, cardH)

  return (
    <div className="tour">
      <div className="tour-dim" style={{ clipPath: dimClip }} />
      {box && <div className="tour-spotlight" style={box} aria-hidden="true" />}
      <section
        ref={cardRef}
        className={`tour-card${phone ? ' docked' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-text"
        style={{ top: position.top, left: position.left, width: phone ? window.innerWidth - 16 : Math.min(CARD_W, window.innerWidth - 32) }}
      >
        <p className="tour-count">
          Step {before + index + 1} of {total}
        </p>
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-text">{step.text}</p>
        <div className="tour-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={i === before + index ? 'active' : i < before + index ? 'done' : ''} />
          ))}
        </div>
        <footer>
          {(!last || waiting) && (
            <button type="button" className="tour-skip" onClick={onDone}>
              Skip tour
            </button>
          )}
          <span className="tour-nav">
            {index > 0 && (
              <button type="button" className="tour-back" onClick={() => setIndex(index - 1)}>
                Back
              </button>
            )}
            {!waiting && (
              <button ref={nextRef} type="button" className="tour-next" onClick={next}>
                {last ? 'Start exploring' : (step.nextLabel ?? 'Next')}
              </button>
            )}
          </span>
        </footer>
      </section>
    </div>
  )
}
