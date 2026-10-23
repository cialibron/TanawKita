// First-visit tutorial: whether this browser has already seen it. Kept apart from the demo store, so resetting
// the demo data does not bring the welcome back. Add ?welcome to the address to show it again.
const STORAGE_KEY = 'tanawkita:tutorial-seen'
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
}

const click = (selector: string) => () => document.querySelector<HTMLElement>(selector)?.click()

// Part 1, on the landing page: signing in. The last step waits for the person to sign in; the app tour follows.
export const LOGIN_TOUR: TourStep[] = [
  {
    target: '.landing-card',
    scroll: true,
    title: 'Sign in',
    text: 'Start here. This is a demo sign-in: no real account is made and nothing is sent. New? Use Create an account.',
  },
  {
    target: '.landing-card .input-wrap:has(#auth-email)',
    scroll: true,
    focusTarget: true,
    title: 'Your email',
    text: 'Type any email address, for example you@example.com.',
  },
  {
    target: '.landing-card .password-wrap',
    scroll: true,
    focusTarget: true,
    title: 'Your password',
    text: 'Type any password with 8 or more characters.',
  },
  {
    target: '.landing-card button.cta',
    scroll: true,
    waitForUser: true,
    title: 'Sign in',
    text: 'Press Sign in. The tour carries on inside the app.',
  },
]

// Part 2, the jobseeker tour. It starts on the Find jobs tab with the menu full screen (where sign-in lands);
// opening a job leaves full screen, so the later steps can point at the details and the map controls.
export const JOBSEEKER_TOUR: TourStep[] = [
  {
    target: '.workspace-rail .role-rail',
    title: 'Your tabs',
    text: 'You start on Find jobs, with the list full screen. My applications and My profile live here too. On a phone, they are in the bar along the bottom.',
  },
  {
    // A job not applied for yet, so the next steps can show Apply now.
    target: '.job-rows .job-row:not(.applied)',
    scroll: true,
    title: 'Pick a job',
    text: 'Each card shows the pay, how far the job is and how well it matches your skills. Tap a card, or a pin on the map, to open it.',
    nextLabel: 'Open this job',
    onNext: click('.job-rows .job-row:not(.applied):not(.selected)'),
  },
  {
    target: '.workspace-detail',
    title: 'Job details',
    text: 'The details show the pay, schedule, workers needed and skills. Expand them to see more about the business and where it is.',
  },
  {
    target: '.selected-job-action',
    scroll: true,
    title: 'Apply',
    text: 'Press Apply now to send your skill card to the employer. The job then shows ✓ Applied in the list and under My applications.',
  },
  {
    target: '.dev-role-picker',
    title: 'Switch views',
    text: 'Developer view switches the demo between Jobseeker, Employer and PESO Admin. It is only here for the demo.',
  },
  {
    title: 'You’re all set',
    text: 'Employers and PESO staff have their own tabs; try them from Developer view. You can see this tour again from Settings.',
  },
]
