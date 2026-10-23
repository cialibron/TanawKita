// Display preferences for this browser only (theme, text size, motion). Kept apart from the demo store: they
// change how the site looks, never the demo data. Applied as attributes on <html> so CSS can follow them.
import { useSyncExternalStore } from 'react'

export type Theme = 'dark' | 'light'
export type TextSize = 'normal' | 'large'

export interface Preferences {
  theme: Theme
  textSize: TextSize
  reduceMotion: boolean
}

const STORAGE_KEY = 'tanawkita:preferences'
const DEFAULTS: Preferences = { theme: 'dark', textSize: 'normal', reduceMotion: false }

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

let current = load()
const listeners = new Set<() => void>()

function apply(prefs: Preferences) {
  const root = document.documentElement
  root.dataset.theme = prefs.theme
  root.dataset.textSize = prefs.textSize
  if (prefs.reduceMotion) root.dataset.motion = 'reduce'
  else delete root.dataset.motion
  root.style.colorScheme = prefs.theme
}

apply(current)

export function setPreferences(change: Partial<Preferences>) {
  current = { ...current, ...change }
  apply(current)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Private windows can block storage; the choice still applies until the page is closed.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, () => current)
}
