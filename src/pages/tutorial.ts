// First-visit tutorial: whether this browser has already seen it. Kept apart from the demo store, so resetting
// the demo data does not bring the welcome back. Add ?welcome to the address to show it again.
// v2: the tour was rewritten (phone and desktop steps, shorter cards), so everyone sees it once more.
const STORAGE_KEY = 'tanawkita:tutorial-seen-v2'
const REPLAY_EVENT = 'tanawkita:replay-tutorial'

export function tutorialSeen(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('welcome')) return false
    return localStorage.getItem(STORAGE_KEY) === 'yes'
  } catch {
    return false
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, 'yes')
  } catch {
    // Private windows can block storage; the welcome then shows again on the next visit.
  }
}

// Settings → "Show the tour again". The app listens and opens the welcome screen.
export function replayTutorial() {
  window.dispatchEvent(new Event(REPLAY_EVENT))
}

export function onReplayTutorial(listener: () => void): () => void {
  window.addEventListener(REPLAY_EVENT, listener)
  return () => window.removeEventListener(REPLAY_EVENT, listener)
}

export interface TourStep {
  // CSS selector of the real control to spotlight; none shows the card in the middle of the screen.
  target?: string
  title: string
  text: string
  // Run when the person presses Next, e.g. open the first job so the next step can point at its details.
  onNext?: () => void
  // Shown instead of "Next", e.g. "Open this job".
  nextLabel?: string
  // Scroll the control into view first (e.g. a card inside the side panel's list).
  scroll?: boolean
  // Put the keyboard focus in the control (e.g. a text field) instead of on the Next button.
  focusTarget?: boolean
  // The person has to do this step themselves (e.g. sign in); there is no Next button.
  waitForUser?: boolean
  // Only on phones (the bottom tab bar layout) or only on wider screens (the left rail layout).
  only?: 'phone' | 'desktop'
}

// The same breakpoint as the phone layout in index.css.
export const isPhone = () => window.matchMedia('(max-width: 720px)').matches

// The steps for the current screen size, checked when the tour starts.
export function forScreen(steps: TourStep[]): TourStep[] {
  const phone = isPhone()
  return steps.filter((step) => !step.only || (step.only === 'phone') === phone)
}

const click = (selector: string) => () => document.querySelector<HTMLElement>(selector)?.click()

// Part 1, on the landing page: signing in. The last step waits for the person to sign in; the app tour follows.
export const LOGIN_TOUR: TourStep[] = [
  {
    only: 'desktop',
    target: '.landing-card',
    scroll: true,
    title: 'Sign in',
    text: 'Sign in here. It is a demo: nothing is sent or saved online.',
  },
  {
    // Phones: the whole card is taller than the screen, so the spotlight goes on its heading.
    only: 'phone',
    target: '.landing-card .landing-card-head',
    scroll: true,
    title: 'Sign in',
    text: 'Sign in here. It is a demo: nothing is sent or saved online.',
  },
  {
    target: '.landing-card .input-wrap:has(#auth-email)',
    scroll: true,
    focusTarget: true,
    title: 'Your email',
    text: 'Type any email, like you@example.com.',
  },
  {
    target: '.landing-card .password-wrap',
    scroll: true,
    focusTarget: true,
    title: 'Your password',
    text: 'Type any password of 8 or more characters.',
  },
  {
    target: '.landing-card button.cta',
    scroll: true,
    waitForUser: true,
    title: 'Sign in',
    text: 'Press Sign in to continue.',
  },
]

// Part 2, the jobseeker tour. It starts on the Find jobs tab with the menu full screen (where sign-in lands); the
// job details pop up over the list, and full screen ends after Apply, before the steps that point at the map.
// Phones and wider screens lay the app out differently (bottom tab bar vs. left rail beside the map), so some
// steps are for one or the other.
export const JOBSEEKER_TOUR: TourStep[] = [
  {
    only: 'desktop',
    target: '.workspace-rail .role-rail',
    title: 'Your tabs',
    text: 'Find jobs, My applications and My profile are here.',
  },
  {
    only: 'phone',
    target: '.workspace-rail .role-rail',
    title: 'Your tabs',
    text: 'Jobs, Applied and Profile are in this bar.',
  },
  {
    // A job not applied for yet, so the next steps can show Apply now.
    target: '.job-rows .job-row:not(.applied)',
    scroll: true,
    title: 'Pick a job',
    text: 'Each card shows the pay and distance. Tap one to open it.',
    nextLabel: 'Open this job',
    onNext: click('.job-rows .job-row:not(.applied):not(.selected)'),
  },
  {
    target: '.workspace-detail',
    title: 'Job details',
    text: 'Pay, hours and skills. Expand to see more.',
  },
  {
    target: '.selected-job-action',
    scroll: true,
    title: 'Apply',
    text: 'Apply now sends your skill card to the employer.',
    onNext: click('.workspace-rail .rail-fullscreen[aria-pressed="true"]'),
  },
  {
    only: 'desktop',
    target: '.dev-role-picker',
    title: 'Switch views',
    text: 'Demo only: switch to the Employer or PESO view.',
  },
  {
    only: 'phone',
    target: '.workspace-rail .rail-toggle',
    title: 'Map or list',
    text: 'Map shows the jobs on a map. List brings you back.',
    nextLabel: 'Show the map',
    onNext: click('.workspace-rail .rail-toggle'),
  },
  {
    only: 'phone',
    target: '.dev-role-picker',
    title: 'Switch views',
    text: 'Demo only: switch to the Employer or PESO view.',
    nextLabel: 'Back to the list',
    onNext: click('.mapshell.menu-minimized .workspace-rail .rail-toggle'),
  },
  {
    target: '.workspace-rail .rail-eye',
    title: 'Settings',
    text: 'Light or dark mode, bigger text, and this tour again.',
  },
  {
    title: 'You’re all set',
    text: 'Start looking for work. You can replay this tour in Settings.',
  },
]
