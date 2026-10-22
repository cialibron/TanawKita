// PROTOTYPE sign-in. Nothing leaves the browser: there is no server, and passwords are never stored.
// Any well-formed email with a password of 8+ characters signs in; shorter passwords show the "incorrect" error
// so testers can see how a failed sign-in looks.

export const MIN_PASSWORD = 8
const SESSION_KEY = 'tanawkita:signed-in'

export interface SignedInUser {
  email: string
  name: string
  provider: 'email' | 'google' | 'facebook'
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function emailError(email: string): string | null {
  if (!email.trim()) return 'Enter your email address.'
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter an email like name@example.com.'
  return null
}

// Sign-up checks the length rule; sign-in only checks that something was typed.
export function passwordError(password: string, mode: 'signin' | 'signup'): string | null {
  if (!password) return 'Enter your password.'
  if (mode === 'signup' && password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  return null
}

export function nameError(name: string): string | null {
  return name.trim() ? null : 'Enter your full name or business name.'
}

// "jun.delacruz@gmail.com" -> "Jun Delacruz"
export function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function signIn(email: string, password: string, delayMs = 1200): Promise<SignedInUser> {
  await wait(delayMs)
  if (password.length < MIN_PASSWORD) throw new Error('Email or password is incorrect.')
  return { email: email.trim(), name: nameFromEmail(email), provider: 'email' }
}

export async function signInWith(provider: 'google' | 'facebook', delayMs = 1000): Promise<SignedInUser> {
  await wait(delayMs)
  return { email: `demo.user@${provider}.example`, name: 'Demo User', provider }
}

// "Remember me" keeps the session in localStorage; otherwise it ends when the tab closes.
export function saveSession(user: SignedInUser, remember: boolean) {
  try {
    clearSession()
    ;(remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(user))
  } catch {
    // Storage blocked: the user stays signed in for this page view only.
  }
}

export function loadSession(): SignedInUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SignedInUser) : null
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Nothing to clear.
  }
}
