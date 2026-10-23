import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import { userIdFor } from './rules'
import { seedState } from './data/seed'
import type { Verification } from './verification'
import type { AppState, Application, ApplicationStatus, Business, JobPost, JobStatus, Role, Session, SkillCard, View } from './types'

// v9: 5 demo businesses with 1 job each, at their checked locations; older saved data is ignored.
const STORAGE_KEY = 'tanawkita:v9'

export type Action =
  | { type: 'setView'; view: View }
  | { type: 'actAs'; role: Role; name: string }
  | { type: 'reset' }
  // Undo for a reset: puts back the data from just before it.
  | { type: 'restore'; state: AppState }
  | { type: 'setBusiness'; employerId: string; business: Business }
  | { type: 'submitVerification'; employerId: string; verification: Verification }
  | { type: 'reviewVerification'; employerId: string; approve: boolean; reason?: string }
  | { type: 'saveSkillCard'; card: SkillCard }
  | { type: 'postJob'; job: JobPost }
  | { type: 'updateJob'; jobId: string; status: JobStatus }
  | { type: 'apply'; application: Application }
  | { type: 'withdraw'; applicationId: string }
  | { type: 'setStatus'; applicationId: string; status: ApplicationStatus }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setView':
      return { ...state, view: action.view }
    case 'actAs': {
      const userId = userIdFor(action.role, action.name)
      const names = { ...state.names, [userId]: action.name }
      return action.role === 'jobseeker'
        ? { ...state, names, jobseekerId: userId }
        : { ...state, names, employerId: userId }
    }
    case 'reset':
      return seedState
    case 'restore':
      return action.state
    case 'setBusiness':
      return { ...state, businesses: { ...state.businesses, [action.employerId]: action.business } }
    case 'submitVerification':
      return { ...state, verifications: { ...state.verifications, [action.employerId]: action.verification } }
    case 'reviewVerification': {
      const current = state.verifications[action.employerId]
      if (!current) return state
      const reviewed: Verification = {
        ...current,
        status: action.approve ? 'verified' : 'rejected',
        reviewedAt: new Date().toISOString(),
        rejectReason: action.approve ? undefined : action.reason,
      }
      return { ...state, verifications: { ...state.verifications, [action.employerId]: reviewed } }
    }
    case 'saveSkillCard':
      return { ...state, skillCards: { ...state.skillCards, [action.card.userId]: action.card } }
    case 'postJob':
      // A double tap can send the same post twice; keep the first.
      if (state.jobs.some((j) => j.id === action.job.id)) return state
      return { ...state, jobs: [action.job, ...state.jobs] }
    case 'updateJob':
      return {
        ...state,
        jobs: state.jobs.map((j) => (j.id === action.jobId ? { ...j, status: action.status } : j)),
      }
    case 'apply': {
      // One application per jobseeker per job, so a double tap on Apply now cannot add a second one.
      const { id, jobId, userId } = action.application
      if (state.applications.some((a) => a.id === id || (a.jobId === jobId && a.userId === userId))) return state
      return {
        ...state,
        applications: [action.application, ...state.applications],
        // Undo after a withdraw brings back the same application, so it must not stay marked as withdrawn.
        withdrawnApplicationIds: state.withdrawnApplicationIds?.filter((w) => w !== id),
      }
    }
    case 'withdraw':
      return {
        ...state,
        applications: state.applications.filter((a) => a.id !== action.applicationId),
        withdrawnApplicationIds: [...(state.withdrawnApplicationIds ?? []), action.applicationId],
      }
    case 'setStatus':
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.applicationId ? { ...a, status: action.status } : a,
        ),
      }
  }
}

function mergeById<T extends { id: string }>(seed: T[], saved: T[]): T[] {
  const records = new Map(seed.map((item) => [item.id, item]))
  // Existing saved records win on duplicate IDs, preserving the user's edits and statuses.
  for (const item of saved) records.set(item.id, item)
  return [...records.values()]
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      // Keep prior demo/user data and add only rows that are new in the expanded local simulation.
      if (Array.isArray(parsed.jobs) && Array.isArray(parsed.applications) && parsed.names && parsed.businesses && parsed.verifications && parsed.skillCards && parsed.jobseekerId && parsed.employerId) {
        return {
          ...seedState,
          ...parsed,
          names: { ...seedState.names, ...parsed.names },
          businesses: { ...seedState.businesses, ...parsed.businesses },
          verifications: { ...seedState.verifications, ...parsed.verifications },
          skillCards: { ...seedState.skillCards, ...parsed.skillCards },
          jobs: mergeById(seedState.jobs, parsed.jobs),
          applications: mergeById(seedState.applications, parsed.applications).filter(
            (a) => !parsed.withdrawnApplicationIds?.includes(a.id),
          ),
        }
      }
    }
  } catch {
    // Storage blocked or corrupt: fall back to the seed data.
  }
  return seedState
}

interface StoreValue {
  state: AppState
  dispatch: Dispatch<Action>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage full or blocked: the app keeps working in memory.
    }
  }, [state])

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside StoreProvider')
  return value
}

export function useSession(role: Role): Session {
  const { state } = useStore()
  const userId = role === 'jobseeker' ? state.jobseekerId : state.employerId
  return { role, userId, name: state.names[userId] ?? userId }
}

/** Wipes saved data without needing React, for the crash screen. */
export function clearSavedState() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing saved to clear.
  }
}
