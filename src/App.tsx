import { useState } from 'react'
import Tabs from './components/Tabs'
import { useSession, useStore } from './store'
import { usernameFor } from './rules'
import SkillCardForm from './pages/jobseeker/SkillCardForm'
import FindJobs from './pages/jobseeker/FindJobs'
import MyApplications from './pages/jobseeker/MyApplications'
import PostJob from './pages/employer/PostJob'
import MyPosts from './pages/employer/MyPosts'
import Overview from './pages/admin/Overview'
import MyBusiness from './pages/employer/MyBusiness'
import Advisor from './pages/employer/Advisor'
import Verify from './pages/employer/Verify'
import type { Role, View } from './types'

type JobseekerTab = 'jobs' | 'applications' | 'skillcard'
type EmployerMode = 'existing' | 'advisor'
type EmployerTab = 'area' | 'post' | 'posts' | 'verify'

const VIEWS: { id: View; label: string }[] = [
  { id: 'jobseeker', label: 'Jobseeker' },
  { id: 'employer', label: 'Employer' },
  { id: 'admin', label: 'Admin' },
]

const JOBSEEKER_TABS: { id: JobseekerTab; label: string }[] = [
  { id: 'jobs', label: 'Find jobs' },
  { id: 'applications', label: 'Applications' },
  { id: 'skillcard', label: 'Skill card' },
]

const EMPLOYER_MODES: { id: EmployerMode; label: string }[] = [
  { id: 'existing', label: 'My business' },
  { id: 'advisor', label: 'Business advisor' },
]

const EMPLOYER_TABS: { id: EmployerTab; label: string }[] = [
  { id: 'area', label: 'Area' },
  { id: 'post', label: 'Post job' },
  { id: 'posts', label: 'My posts' },
  { id: 'verify', label: 'Verify' },
]

const NEW_USER = '__new__'

// Testing only: pick which jobseeker or employer you are acting as, or add one.
function ActingAs({ role }: { role: Role }) {
  const { state, dispatch } = useStore()
  const session = useSession(role)
  const prefix = `${role}-`
  const people = Object.entries(state.names)
    .filter(([id]) => id.startsWith(prefix))
    .sort(([, a], [, b]) => a.localeCompare(b))

  // Extra hint per person so testers can pick an interesting account.
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
  const [jobseekerTab, setJobseekerTab] = useState<JobseekerTab>('jobs')
  const [employerTab, setEmployerTab] = useState<EmployerTab>('area')
  const [employerMode, setEmployerMode] = useState<EmployerMode>('existing')

  const shellHeader = (
    <>
      <div className="header">
        <strong className="brand">TanawKita</strong>
        <span className="badge">Test mode</span>
      </div>
      <div className="segmented">
        <Tabs tabs={VIEWS} active={state.view} onChange={(view) => dispatch({ type: 'setView', view })} />
      </div>
    </>
  )

  // Jobseeker: the whole screen is the map; everything else lives in the side panel.
  if (state.view === 'jobseeker') {
    return (
      <FindJobs
        panelHeader={
          <>
            {shellHeader}
            <ActingAs role="jobseeker" />
            <Tabs tabs={JOBSEEKER_TABS} active={jobseekerTab} onChange={setJobseekerTab} />
          </>
        }
        panelContent={
          jobseekerTab === 'applications' ? (
            <MyApplications />
          ) : jobseekerTab === 'skillcard' ? (
            <SkillCardForm />
          ) : undefined
        }
      />
    )
  }

  // Employer: same layout, with the business area map behind the panel.
  if (state.view === 'employer') {
    return (
      <MyBusiness
        key={state.employerId}
        panelHeader={
          <>
            {shellHeader}
            <ActingAs role="employer" />
            <div className="segmented">
              <Tabs tabs={EMPLOYER_MODES} active={employerMode} onChange={setEmployerMode} />
            </div>
            {employerMode === 'existing' && (
              <Tabs tabs={EMPLOYER_TABS} active={employerTab} onChange={setEmployerTab} />
            )}
          </>
        }
        panelContent={
          employerMode === 'advisor' ? (
            <Advisor />
          ) : employerTab === 'post' ? (
            <PostJob onGetVerified={() => setEmployerTab('verify')} />
          ) : employerTab === 'posts' ? (
            <MyPosts />
          ) : employerTab === 'verify' ? (
            <Verify />
          ) : undefined
        }
      />
    )
  }

  return (
    <>
      {shellHeader}
      <Overview />
    </>
  )
}
