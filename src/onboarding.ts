// PROTOTYPE account setup shown after sign-in. Like employer verification, files never leave the browser:
// only each file's name and size are kept, so nothing sensitive (ID photos, resumes) is stored or sent anywhere.
import { useSyncExternalStore } from 'react'
import { loadSession } from './pages/demoAuth'
import type { Role } from './types'
import { ID_TYPES } from './verification'

export type SetupStep = 'role' | 'id' | 'resume' | 'skills'

export interface StoredFile {
  fileName: string
  sizeKb: number
}

export interface ValidIdRecord {
  idType: string
  front: StoredFile
  back?: StoredFile
}

export interface ResumeRecord {
  files: StoredFile[]
  links: string[]
}

export interface AccountSetup {
  role: Role | null
  validId: ValidIdRecord | null
  resume: ResumeRecord | null
  skipped: SetupStep[]
  // True once the person reached the end of the setup panel (or chose "Finish later").
  finished: boolean
}

export const JOBSEEKER_ID_TYPES = [
  ...ID_TYPES,
  'Barangay ID / certification',
  'School ID (ages 15 to 17)',
  'Other government-issued ID',
]

export const ID_ACCEPT = 'image/*,.pdf'
// CV / resume formats people commonly have on a phone or laptop.
export const RESUME_ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.txt,.csv,.xls,.xlsx,.pages,image/*'

export const EMPTY_SETUP: AccountSetup = { role: null, validId: null, resume: null, skipped: [], finished: false }

const STORAGE_KEY = 'tanawkita:account-setup'
const listeners = new Set<() => void>()
let cache: Record<string, AccountSetup> | null = null

function readAll(): Record<string, AccountSetup> {
  if (cache) return cache
  try {
    cache = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, AccountSetup>
  } catch {
    cache = {}
  }
  return cache
}

// Setup belongs to the signed-in demo account; "Explore without an account" uses a shared guest record.
export function accountKey(): string {
  return loadSession()?.email.toLowerCase() ?? 'guest'
}

export function getSetup(key: string): AccountSetup {
  return readAll()[key] ?? EMPTY_SETUP
}

export function updateSetup(key: string, patch: Partial<AccountSetup>) {
  const all = { ...readAll(), [key]: { ...getSetup(key), ...patch } }
  cache = all
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Storage blocked: keep the setup for this page view only.
  }
  listeners.forEach((listener) => listener())
}

// Marks a step as skipped (or clears the mark once it is filled in).
export function markSkipped(key: string, step: SetupStep, skipped: boolean) {
  const current = getSetup(key).skipped.filter((s) => s !== step)
  updateSetup(key, { skipped: skipped ? [...current, step] : current })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAccountSetup(key: string): AccountSetup {
  return useSyncExternalStore(subscribe, () => getSetup(key))
}

export function toStoredFile(file: File): StoredFile {
  return { fileName: file.name, sizeKb: Math.max(1, Math.round(file.size / 1024)) }
}

// Accepts "linkedin.com/in/ana" as well as full URLs; returns null when it isn't a usable web link.
export function normalizeLink(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

const LINK_LABELS: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/i, 'LinkedIn'],
  [/(^|\.)jobstreet\.com(\.ph)?$/i, 'JobStreet'],
  [/(^|\.)kalibrr\.com$/i, 'Kalibrr'],
  [/(^|\.)indeed\.com$/i, 'Indeed'],
  [/(^|\.)github\.com$/i, 'GitHub'],
  [/(^|\.)facebook\.com$/i, 'Facebook'],
  [/(^|\.)drive\.google\.com$/i, 'Google Drive'],
  [/(^|\.)docs\.google\.com$/i, 'Google Docs'],
]

export function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname
    return LINK_LABELS.find(([pattern]) => pattern.test(host))?.[1] ?? host.replace(/^www\./, '')
  } catch {
    return url
  }
}
