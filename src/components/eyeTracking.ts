// The brand eyes (logo, pin emblem, map pins and the small eye icon) look toward the cursor instead of running a
// looping animation. One shared listener moves every pupil group on screen, at most once per frame.
// Off when the user prefers reduced motion (system setting or Settings → Reduce motion).

// How far a pupil can move inside its eye, in the eye artwork's own units (the eye is 31 x 17).
const MAX_X = 5
const MAX_Y = 2.5
const SELECTOR = '.tk-logo-look, .tk-eye-look'

let pointer: { x: number; y: number } | null = null
let frame = 0

function reducedMotion(): boolean {
  return document.documentElement.dataset.motion === 'reduce' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function update() {
  frame = 0
  const still = reducedMotion() || !pointer
  for (const element of document.querySelectorAll<HTMLElement>(SELECTOR)) {
    if (still) {
      element.style.transform = ''
      continue
    }
    const box = element.getBoundingClientRect()
    if (!box.width) continue
    const dx = pointer!.x - (box.left + box.width / 2)
    const dy = pointer!.y - (box.top + box.height / 2)
    const distance = Math.hypot(dx, dy) || 1
    // Full reach once the cursor is about 120 px away; closer in, the pupil moves proportionally less.
    const reach = Math.min(1, distance / 120)
    element.style.transform = `translate(${((dx / distance) * MAX_X * reach).toFixed(2)}px, ${((dy / distance) * MAX_Y * reach).toFixed(2)}px)`
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(update)
}

if (typeof window !== 'undefined' && !(window as { __tkEyes?: boolean }).__tkEyes) {
  ;(window as { __tkEyes?: boolean }).__tkEyes = true
  window.addEventListener(
    'pointermove',
    (event) => {
      pointer = { x: event.clientX, y: event.clientY }
      schedule()
    },
    { passive: true },
  )
  // The page moves under a still cursor when scrolling or when the map pans, so re-aim then too.
  window.addEventListener('scroll', schedule, { passive: true, capture: true })
  document.addEventListener('pointerleave', () => {
    pointer = null
    schedule()
  })
  // Eyes that appear later (map pins, new rows) pick up the current direction.
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true })
}
