import { useState, type ReactNode } from 'react'
import MapShell, { type WorkspaceNavItem } from './components/MapShell'
import JobMap from './components/JobMap'
import { useSession, useStore } from './store'
import { usernameFor } from './rules'
import { clearSession, loadSession } from './auth'
import Landing from './pages/Landing'
import SetupPanel from './pages/SetupPanel'
import { accountKey, getSetup, type SetupStep } from './onboarding'
import ProfilePage from './pages/jobseeker/ProfilePage'
import FindJobs from './pages/jobseeker/FindJobs'
import MyApplications from './pages/jobseeker/MyApplications'
import PostJob from './pages/employer/PostJob'
import MyPosts from './pages/employer/MyPosts'
import Overview from './pages/admin/Overview'
import Verifications from './pages/admin/Verifications'
import MyBusiness from './pages/employer/MyBusiness'
import MarketResearch from './pages/employer/MarketResearch'
import Verify from './pages/employer/Verify'
import type { Role, View } from './types'
import type { CompetitorPlace, CompetitorSearchMode } from './businessDirectory'

type JobseekerSection = 'jobs' | 'applications' | 'skillcard'
type EmployerSection = 'area' | 'franchise' | 'competitors' | 'post' | 'posts' | 'verify'
type AdminSection = 'overview' | 'verifications'

const JOBSEEKER_NAV: WorkspaceNavItem[] = [
  { id: 'jobs', label: 'Find jobs', icon: '⌕' },
  { id: 'applications', label: 'My applications', icon: '▤' },
  { id: 'skillcard', label: 'My profile / skill card', icon: '◉' },
]

const EMPLOYER_NAV: WorkspaceNavItem[] = [
  { id: 'area', label: 'Business overview', icon: '▦' },
  { id: 'franchise', label: 'Franchise planning', icon: '✧' },
  { id: 'competitors', label: 'Competitor map', icon: '◎' },
  { id: 'post', label: 'Post a job', icon: '+' },
  { id: 'posts', label: 'My job posts', icon: '▤' },
  { id: 'verify', label: 'Business verification', icon: '✓' },
]

const ADMIN_NAV: WorkspaceNavItem[] = [
  { id: 'overview', label: 'PESO overview', icon: '▦' },
  { id: 'verifications', label: 'Verification review', icon: '✓' },
]

const NEW_USER = '__new__'

// Test-mode account picker; it is intentionally separate from the user-facing role navigation.
function ActingAs({ role }: { role: Role }) {
  const { state, dispatch } = useStore()
  const session = useSession(role)
  const prefix = `${role}-`
  const people = Object.entries(state.names)
    .filter(([id]) => id.startsWith(prefix))
    .sort(([, a], [, b]) => a.localeCompare(b))

  function hint(id: string): string {
    if (role === 'employer') {
      const status = state.verifications[id]?.status ?? 'none'
      return status === 'verified' ? '✓ verified' : status === 'none' ? 'not verified' : status
    }
    const card = state.skillCards[id]
    return card ? `${card.age} yrs` : 'no skill card'
  }

  function change(value: string) {
    const name = value === NEW_USER ? prompt(role === 'jobseeker' ? 'Jobseeker full name' : 'Business name')?.trim() : state.names[value]
    if (name) dispatch({ type: 'actAs', role, name })
  }

  return (
    <label className="acting-as">
      <span className="muted">Acting as</span>
      <select value={session.userId} onChange={(e) => change(e.target.value)}>
        {people.map(([id, name]) => (
          <option key={id} value={id}>
            {name} · {usernameFor(id)} · {hint(id)}
          </option>
        ))}
        <option value={NEW_USER}>+ New {role}…</option>
      </select>
    </label>
  )
}

export default function App() {
  const { state, dispatch } = useStore()
  const [jobseekerSection, setJobseekerSection] = useState<JobseekerSection>('jobs')
  const [employerSection, setEmployerSection] = useState<EmployerSection>('area')
  const [adminSection, setAdminSection] = useState<AdminSection>('overview')
  const [competitorPlaces, setCompetitorPlaces] = useState<CompetitorPlace[]>([])
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorPlace | null>(null)
  const [competitorMode, setCompetitorMode] = useState<CompetitorSearchMode>('local')
  // Landing page first; a demo sign-in (or "Explore without an account") opens the workspace.
  const [entered, setEntered] = useState(() => loadSession() !== null)
  // Account setup panel: opened after sign-in, or for one step from a profile "Add" button.
  const [setupRequest, setSetupRequest] = useState<{ initialRole?: Role; startAt?: SetupStep; single?: boolean } | null>(null)
  const changeView = (view: View) => dispatch({ type: 'setView', view })

  if (!entered) {
    return (
      <Landing
        onExplore={() => setEntered(true)}
        onEnter={(_user, signup) => {
          if (signup) {
            dispatch({ type: 'actAs', role: signup.role, name: signup.name })
            dispatch({ type: 'setView', view: signup.role })
          }
          setEntered(true)
          if (!getSetup(accountKey()).finished) setSetupRequest({ initialRole: signup?.role })
        }}
      />
    )
  }

  function signOut() {
    clearSession()
    setSetupRequest(null)
    setEntered(false)
  }

  const shellHeader = (
    <div className="workspace-heading">
      <div className="header">
        <strong className="brand">TanawKita</strong>
        <span className="row">
          <span className="badge">Demo</span>
          <button type="button" className="badge sign-out" onClick={signOut}>
            Sign out
          </button>
        </span>
      </div>
      <p className="workspace-caption">Davao City · Local employment map</p>
    </div>
  )

  let screen: ReactNode
  if (state.view === 'jobseeker' && jobseekerSection === 'skillcard') {
    screen = (
      <ProfilePage
        view={state.view}
        onViewChange={changeView}
        navigation={JOBSEEKER_NAV}
        activeNavigation={jobseekerSection}
        onNavigationChange={(id) => setJobseekerSection(id as JobseekerSection)}
        actingAs={<ActingAs role="jobseeker" />}
        onSignOut={signOut}
        onOpenSetup={(step) => setSetupRequest({ startAt: step, single: true })}
      />
    )
  } else if (state.view === 'jobseeker') {
    screen = (
      <FindJobs
        view={state.view}
        onViewChange={changeView}
        navigation={JOBSEEKER_NAV}
        activeNavigation={jobseekerSection}
        onNavigationChange={(id) => setJobseekerSection(id as JobseekerSection)}
        panelHeader={
          <>
            {shellHeader}
            <ActingAs role="jobseeker" />
          </>
        }
        panelContent={
          jobseekerSection === 'applications' ? <MyApplications /> : undefined
        }
      />
    )
  } else if (state.view === 'employer') {
    screen = (
      <MyBusiness
        key={state.employerId}
        view={state.view}
        onViewChange={changeView}
        navigation={EMPLOYER_NAV}
        activeNavigation={employerSection}
        onNavigationChange={(id) => {
          const section = id as EmployerSection
          setEmployerSection(section)
          if (section !== 'franchise' && section !== 'competitors') {
            setCompetitorPlaces([])
            setSelectedCompetitor(null)
            setCompetitorMode('local')
          }
        }}
        competitorPlaces={competitorPlaces}
        selectedCompetitor={selectedCompetitor}
        competitorMode={competitorMode}
        onSelectedCompetitorChange={setSelectedCompetitor}
        panelHeader={
          <>
            {shellHeader}
            <ActingAs role="employer" />
          </>
        }
        panelContent={
          employerSection === 'franchise' || employerSection === 'competitors' ? (
            <MarketResearch
              mode={employerSection === 'franchise' ? 'franchise' : 'city'}
              business={state.businesses[state.employerId] ?? null}
              onPlacesChange={setCompetitorPlaces}
              onSelectedPlaceChange={setSelectedCompetitor}
              onMapModeChange={setCompetitorMode}
            />
          ) : employerSection === 'post' ? (
            <PostJob onGetVerified={() => setEmployerSection('verify')} />
          ) : employerSection === 'posts' ? (
            <MyPosts />
          ) : employerSection === 'verify' ? (
            <Verify />
          ) : undefined
        }
      />
    )
  } else {
    screen = (
      <MapShell
        navigation={ADMIN_NAV}
        activeNavigation={adminSection}
        onNavigationChange={(id) => setAdminSection(id as AdminSection)}
        view={state.view}
        onViewChange={changeView}
        map={<JobMap fill jobs={state.jobs.filter((job) => job.status === 'open')} />}
        panel={
          <>
            {shellHeader}
            {adminSection === 'overview' ? <Overview /> : <Verifications />}
          </>
        }
      />
    )
  }

  return (
    <>
      {screen}
      {setupRequest && (
        <SetupPanel
          key={`${setupRequest.startAt ?? 'all'}-${accountKey()}`}
          accountKey={accountKey()}
          accountName={loadSession()?.name ?? null}
          initialRole={setupRequest.initialRole}
          startAt={setupRequest.startAt}
          single={setupRequest.single}
          onClose={() => setSetupRequest(null)}
        />
      )}
    </>
  )
}
