import { useState, type ReactNode } from 'react'
import LandingMap from '../../components/LandingMap'
import Logo from '../../components/Logo'
import { DevRolePicker, WorkspaceRail, type WorkspaceNavItem } from '../../components/WorkspaceChrome'
import { barangayName } from '../../data/barangays'
import { accountKey, linkLabel, useAccountSetup, type SetupStep } from '../../onboarding'
import { DAYS, usernameFor } from '../../rules'
import { useSession, useStore } from '../../store'
import type { PayUnit, View } from '../../types'
import SkillCardForm from './SkillCardForm'
import { chosenSkills } from '../../components/skillCatalog'
import background from '../../assets/brand/bg-4.svg'
// Shares the landing page's faint-map styles (.landing-map).
import '../../landing.css'

type Section = 'profile' | 'skills' | 'availability' | 'preferences'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'profile', label: 'My profile' },
  { id: 'skills', label: 'Skills & experience' },
  { id: 'availability', label: 'Availability & pay' },
  { id: 'preferences', label: 'Work preferences' },
]

const UNIT_LABEL: Record<PayUnit, string> = { day: 'day', hour: 'hour', task: 'task' }

interface Props {
  view: View
  onViewChange: (view: View) => void
  navigation: WorkspaceNavItem[]
  activeNavigation: string
  onNavigationChange: (id: string) => void
  // Test-mode account picker from App, shown where the reference puts its account switcher.
  actingAs: ReactNode
  onSignOut: () => void
  // Opens the account setup panel at one step (for parts skipped during setup).
  onOpenSetup: (step: SetupStep) => void
}

// Trimmed: some barangay names in the shared data carry a trailing space.
const place = (code: string) => barangayName(code).trim()

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

// A label/value pair. Missing optional data reads "Not set" rather than a placeholder value.
function Field({ label, children }: { label: string; children?: ReactNode }) {
  const empty = children === undefined || children === null || children === ''
  return (
    <div className="profile-field">
      <dt>{label}</dt>
      <dd className={empty ? 'not-set' : undefined}>{empty ? 'Not set' : children}</dd>
    </div>
  )
}

function Chips({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <span className="profile-chips">
      {items.map((item) => (
        <span key={item} className="profile-chip">{item}</span>
      ))}
    </span>
  )
}

// One row of the account setup card: its value, or "Not set up" with an Add button.
function SetupRow({ label, value, onAdd }: { label: string; value: ReactNode; onAdd: () => void }) {
  return (
    <div className="setup-row">
      <div>
        <dt>{label}</dt>
        <dd className={value ? undefined : 'not-set'}>{value || 'Not set up'}</dd>
      </div>
      <button type="button" className={value ? 'profile-edit' : 'profile-add'} onClick={onAdd}>
        {value ? (
          <>Edit <span aria-hidden="true">✎</span></>
        ) : (
          <><span aria-hidden="true">+</span> Add</>
        )}
      </button>
    </div>
  )
}

function Card({ title, onEdit, children }: { title: string; onEdit?: () => void; children: ReactNode }) {
  return (
    <section className="profile-card">
      <header>
        <h3>{title}</h3>
        {onEdit && (
          <button type="button" className="profile-edit" onClick={onEdit}>
            Edit <span aria-hidden="true">✎</span>
          </button>
        )}
      </header>
      {children}
    </section>
  )
}

// Full-page "My profile / skill card" for jobseekers: same role rail and developer switch as the map screens,
// with the skill card shown as read-only cards and the existing SkillCardForm as its edit mode.
export default function ProfilePage({ view, onViewChange, navigation, activeNavigation, onNavigationChange, actingAs, onSignOut, onOpenSetup }: Props) {
  const { state } = useStore()
  const setup = useAccountSetup(accountKey())
  const session = useSession('jobseeker')
  const card = state.skillCards[session.userId]
  const [section, setSection] = useState<Section>('profile')
  const [editing, setEditing] = useState(false)
  const edit = () => setEditing(true)

  const payUnit = card?.expectedPayUnit ?? 'day'
  const pay = card?.expectedPay != null ? `₱${card.expectedPay.toLocaleString('en-PH')} / ${UNIT_LABEL[payUnit]}` : undefined

  const setupCard = (
    <Card title="Account setup">
      <dl className="setup-rows">
        <SetupRow
          label="Account type"
          value={setup.role === 'employer' ? 'Employer' : setup.role === 'jobseeker' ? 'Jobseeker' : null}
          onAdd={() => onOpenSetup('role')}
        />
        <SetupRow
          label="Valid ID"
          value={setup.validId && `${setup.validId.idType} · ${setup.validId.back ? 'front and back' : 'front'} added`}
          onAdd={() => onOpenSetup('id')}
        />
        <SetupRow
          label="Resume"
          value={
            setup.resume && (
              <Chips items={[...setup.resume.files.map((f) => f.fileName), ...setup.resume.links.map(linkLabel)]} />
            )
          }
          onAdd={() => onOpenSetup('resume')}
        />
      </dl>
    </Card>
  )

  let content: ReactNode
  if (editing || !card) {
    content = (
      <>
        {/* Setup parts can be added even before there is a skill card. */}
        {!card && !editing && section === 'profile' && setupCard}
        <section className="profile-card profile-form-card">
          {!card && !editing ? (
            <div className="profile-empty">
              <h3>No skill card yet</h3>
              <p>Create your skill card so employers near you can find you and jobs can be matched to your skills.</p>
              <button type="button" className="primary" onClick={edit}>Create skill card</button>
            </div>
          ) : (
            <SkillCardForm key={session.userId} onSaved={() => setEditing(false)} onCancel={() => setEditing(false)} />
          )}
        </section>
      </>
    )
  } else if (section === 'profile') {
    content = (
      <>
        {setupCard}
        <Card title="Personal information" onEdit={edit}>
          <dl className="profile-grid">
            <Field label="Full name">{card.name}</Field>
            <Field label="Username">{usernameFor(card.userId)}</Field>
            <Field label="Age">{card.age}</Field>
            {card.age < 18 && <Field label="Guardian consent">{card.guardianConsent ? 'Given' : 'Not given'}</Field>}
            <Field label="Employment status">{card.employmentStatus}</Field>
            <Field label="Education">{card.education}</Field>
            <Field label="Languages">{card.languages?.join(', ')}</Field>
          </dl>
        </Card>
        <Card title="Location" onEdit={edit}>
          <dl className="profile-grid">
            <Field label="Barangay">{place(card.barangay)}</Field>
            <Field label="City">Davao City</Field>
            <Field label="Usual commute">{card.commuteMode}</Field>
            <Field label="Phone / internet access">{card.digitalAccess}</Field>
          </dl>
        </Card>
      </>
    )
  } else if (section === 'skills') {
    content = (
      <Card title="Skills & experience" onEdit={edit}>
        <dl className="profile-grid">
          <Field label="Skills"><Chips items={chosenSkills(card.skills)} /></Field>
          <Field label="Years of experience">{card.yearsExperience}</Field>
          <Field label="Certifications"><Chips items={card.certifications} /></Field>
          <Field label="About me">{card.profileSummary}</Field>
        </dl>
      </Card>
    )
  } else if (section === 'availability') {
    content = (
      <Card title="Availability & pay" onEdit={edit}>
        <dl className="profile-grid">
          <Field label="Hours per week">{`${card.hoursWanted} hrs`}</Field>
          <Field label="Expected pay">{pay}</Field>
          <Field label="Can start">
            {card.canStartInDays == null ? undefined : card.canStartInDays === 0 ? 'Right away' : `Within ${card.canStartInDays} days`}
          </Field>
          <Field label="Days available">
            <span className="profile-days">
              {DAYS.map((day) => (
                <span key={day} className={`profile-day${card.daysAvailable.includes(day) ? ' on' : ''}`}>{day}</span>
              ))}
            </span>
          </Field>
        </dl>
      </Card>
    )
  } else {
    content = (
      <Card title="Work preferences">
        <dl className="profile-grid">
          <Field label="Preferred roles"><Chips items={card.preferredRoles} /></Field>
          <Field label="Preferred sectors"><Chips items={card.preferredSectors} /></Field>
          <Field label="Job types"><Chips items={card.preferredJobTypes} /></Field>
        </dl>
      </Card>
    )
  }

  return (
    <main className="profile-shell" style={{ backgroundImage: `url("${background}")` }}>
      {/* Same backdrop as the landing page, without its motion: brand background plus a still, faint map. */}
      <LandingMap still />
      <WorkspaceRail view={view} navigation={navigation} activeNavigation={activeNavigation} onNavigationChange={onNavigationChange} />

      <div className="profile-main">
        <header className="profile-topbar">
          <Logo height={40} />
          <span className="badge">Demo</span>
          <div className="profile-topbar-actions">
            <DevRolePicker view={view} onViewChange={onViewChange} />
            <span className="profile-avatar small" aria-hidden="true">{initials(session.name)}</span>
          </div>
        </header>

        <div className="profile-content">
          <h1>Account settings</h1>

          <div className="profile-panel">
            <aside className="profile-sidebar">
              <div className="profile-acting">{actingAs}</div>
              <nav className="profile-sections" aria-label="Profile sections">
                {SECTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={section === item.id && !editing ? 'active' : undefined}
                    aria-current={section === item.id && !editing ? 'page' : undefined}
                    onClick={() => {
                      setSection(item.id)
                      setEditing(false)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <button type="button" className="danger" onClick={onSignOut}>Sign out</button>
              </nav>
            </aside>

            <div className="profile-body">
              <h2>{editing ? (card ? 'Edit skill card' : 'Create skill card') : SECTIONS.find((s) => s.id === section)?.label}</h2>

              {!editing && (
              <section className="profile-card profile-summary">
                <span className="profile-avatar" aria-hidden="true">{initials(session.name)}</span>
                <div>
                  <strong>{session.name}</strong>
                  <span>{card?.preferredRoles?.[0] ?? 'Jobseeker'}</span>
                  <span className="muted">{card ? `${place(card.barangay)}, Davao City` : 'Davao City'}</span>
                </div>
                {card && (
                  <button type="button" className="profile-edit" onClick={edit}>
                    Edit <span aria-hidden="true">✎</span>
                  </button>
                )}
              </section>
              )}

              {content}
            </div>
          </div>
          <p className="profile-map-credit">
            Map:{' '}
            <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> ©{' '}
            <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ©{' '}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors
          </p>
        </div>
      </div>
    </main>
  )
}
