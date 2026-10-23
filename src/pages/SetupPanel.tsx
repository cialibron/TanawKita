import { useState, type ChangeEvent, type ReactNode } from 'react'
import Logo from '../components/Logo'
import {
  ID_ACCEPT,
  JOBSEEKER_ID_TYPES,
  linkLabel,
  markSkipped,
  normalizeLink,
  RESUME_ACCEPT,
  toStoredFile,
  updateSetup,
  useAccountSetup,
  type ResumeRecord,
  type SetupStep,
  type StoredFile,
  type ValidIdRecord,
} from '../onboarding'
import { useSession, useStore } from '../store'
import type { Role } from '../types'
import { MAX_UPLOAD_KB } from '../verification'
import Verify from './employer/Verify'
import SkillCardForm from './jobseeker/SkillCardForm'

interface Props {
  accountKey: string
  // Display name of the signed-in account, used to act as that person once a role is picked.
  accountName: string | null
  initialRole?: Role
  // Open straight at one step, e.g. from a profile "Add" button.
  startAt?: SetupStep
  // Only show `startAt`, then close (no welcome or summary screens).
  single?: boolean
  onClose: () => void
}

const STEP_TITLES: Record<SetupStep, string> = {
  role: 'Account type',
  id: 'Valid ID',
  resume: 'Resume',
  skills: 'Skill card',
}

const EMPLOYER_STEP_TITLES: Partial<Record<SetupStep, string>> = { id: 'Business verification' }

function stepsFor(role: Role): SetupStep[] {
  return role === 'employer' ? ['role', 'id'] : ['role', 'id', 'resume', 'skills']
}

function fileTooBig(file: File): string | null {
  return file.size / 1024 > MAX_UPLOAD_KB ? `${file.name} is over 5 MB. Choose a smaller file.` : null
}

function FileChip({ file, onRemove }: { file: StoredFile; onRemove?: () => void }) {
  return (
    <span className="setup-file">
      <span aria-hidden="true">📄</span> {file.fileName} <span className="setup-file-size">{file.sizeKb} KB</span>
      {onRemove && (
        <button type="button" aria-label={`Remove ${file.fileName}`} onClick={onRemove}>×</button>
      )}
    </span>
  )
}

// Post-sign-in setup page (a full screen of its own, not a pop-up): account type, then ID, resume and skill card
// for jobseekers, or business verification for employers. Every step can be skipped; anything skipped can be
// added later from the profile.
export default function SetupPanel({ accountKey, accountName, initialRole, startAt, single = false, onClose }: Props) {
  const { state, dispatch } = useStore()
  const setup = useAccountSetup(accountKey)
  const jobseeker = useSession('jobseeker')
  const employer = useSession('employer')

  const [role, setRole] = useState<Role | null>(setup.role ?? initialRole ?? null)
  // The role the remaining steps follow; when the account type is skipped, use the interface already open.
  const flowRole: Role = role ?? (state.view === 'employer' ? 'employer' : 'jobseeker')
  const steps = single && startAt ? [startAt] : stepsFor(flowRole)
  const [index, setIndex] = useState(() => Math.max(0, steps.indexOf(startAt ?? 'role')))
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [idType, setIdType] = useState(setup.validId?.idType ?? '')
  const [idFront, setIdFront] = useState<StoredFile | null>(setup.validId?.front ?? null)
  const [idBack, setIdBack] = useState<StoredFile | null>(setup.validId?.back ?? null)
  const [resumeFiles, setResumeFiles] = useState<StoredFile[]>(setup.resume?.files ?? [])
  const [links, setLinks] = useState<string[]>(setup.resume?.links ?? [])
  const [linkInput, setLinkInput] = useState('')

  const step = steps[Math.min(index, steps.length - 1)]
  const stepTitle = (s: SetupStep) => (flowRole === 'employer' && EMPLOYER_STEP_TITLES[s]) || STEP_TITLES[s]

  function advance() {
    setError('')
    if (single) return onClose()
    if (index + 1 < steps.length) return setIndex(index + 1)
    updateSetup(accountKey, { finished: true })
    setDone(true)
  }

  function finishLater() {
    updateSetup(accountKey, { finished: true })
    onClose()
  }

  function applyRole(next: Role) {
    if (accountName) dispatch({ type: 'actAs', role: next, name: accountName })
    dispatch({ type: 'setView', view: next })
  }

  function skip() {
    markSkipped(accountKey, step, true)
    // Still act as the signed-in person, so later steps (and the profile) show their own details.
    if (step === 'role' && accountName) dispatch({ type: 'actAs', role: flowRole, name: accountName })
    advance()
  }

  function next() {
    if (step === 'role') {
      if (!role) return setError('Choose jobseeker or employer, or press Skip.')
      updateSetup(accountKey, { role })
      markSkipped(accountKey, 'role', false)
      applyRole(role)
    } else if (step === 'id' && flowRole === 'jobseeker') {
      if (!idType || !idFront) return setError('Choose your ID type and add a photo of the front, or press Skip.')
      const validId: ValidIdRecord = { idType, front: idFront, ...(idBack ? { back: idBack } : {}) }
      updateSetup(accountKey, { validId })
      markSkipped(accountKey, 'id', false)
    } else if (step === 'id' && flowRole === 'employer') {
      // Business verification saves itself through its own form; Next just moves on.
      markSkipped(accountKey, 'id', !state.verifications[employer.userId])
    } else if (step === 'resume') {
      if (resumeFiles.length === 0 && links.length === 0) return setError('Add a resume file or a link, or press Skip.')
      const resume: ResumeRecord = { files: resumeFiles, links }
      updateSetup(accountKey, { resume })
      markSkipped(accountKey, 'resume', false)
    } else if (step === 'skills') {
      if (!state.skillCards[jobseeker.userId]) return setError('Save your skill card first, or press Skip.')
      markSkipped(accountKey, 'skills', false)
    }
    advance()
  }

  function pickId(side: 'front' | 'back', e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const tooBig = fileTooBig(file)
    if (tooBig) return setError(tooBig)
    setError('')
    if (side === 'front') setIdFront(toStoredFile(file))
    else setIdBack(toStoredFile(file))
  }

  function addResumeFiles(e: ChangeEvent<HTMLInputElement>) {
    const picked = [...(e.target.files ?? [])]
    e.target.value = ''
    const tooBig = picked.map(fileTooBig).find(Boolean)
    if (tooBig) setError(tooBig)
    else setError('')
    const ok = picked.filter((file) => !fileTooBig(file)).map(toStoredFile)
    setResumeFiles([...resumeFiles.filter((f) => !ok.some((n) => n.fileName === f.fileName)), ...ok])
  }

  function addLink() {
    const url = normalizeLink(linkInput)
    if (!url) return setError('Enter a web link, like linkedin.com/in/your-name.')
    setError('')
    if (!links.includes(url)) setLinks([...links, url])
    setLinkInput('')
  }

  let body: ReactNode
  if (done) {
    const rows: { label: string; value: string | null }[] =
      flowRole === 'employer'
        ? [
            { label: 'Account type', value: setup.role ? 'Employer' : null },
            { label: 'Business verification', value: state.verifications[employer.userId] ? 'Submitted for PESO review' : null },
          ]
        : [
            { label: 'Account type', value: setup.role ? 'Jobseeker' : null },
            { label: 'Valid ID', value: setup.validId?.idType ?? null },
            {
              label: 'Resume',
              value: setup.resume ? `${setup.resume.files.length} file(s), ${setup.resume.links.length} link(s)` : null,
            },
            { label: 'Skill card', value: state.skillCards[jobseeker.userId] ? 'Saved' : null },
          ]
    body = (
      <>
        <h2>You’re all set</h2>
        <p className="setup-lead">
          {rows.some((r) => !r.value)
            ? flowRole === 'employer'
              ? 'You can finish anything you skipped from Business verification in the menu.'
              : 'You can add anything you skipped from My profile, using its Add buttons.'
            : 'Everything is filled in.'}
        </p>
        <ul className="setup-summary">
          {rows.map((r) => (
            <li key={r.label}>
              <span>{r.label}</span>
              <strong className={r.value ? 'ok' : 'skipped'}>{r.value ? `✓ ${r.value}` : 'Skipped'}</strong>
            </li>
          ))}
        </ul>
      </>
    )
  } else if (step === 'role') {
    body = (
      <>
        <h2>Are you looking for work or hiring?</h2>
        <p className="setup-lead">We’ll set up TanawKita for you. You can change this later.</p>
        <div className="setup-roles" role="radiogroup" aria-label="Account type">
          {(
            [
              { id: 'jobseeker', icon: '⌕', title: 'I’m a jobseeker', text: 'Find paid work near home and apply with your skill card.' },
              { id: 'employer', icon: '▦', title: 'I’m an employer', text: 'Post jobs, get verified and find workers nearby.' },
            ] as const
          ).map((option) => (
            <button
              type="button"
              key={option.id}
              role="radio"
              aria-checked={role === option.id}
              className={`setup-role${role === option.id ? ' selected' : ''}`}
              onClick={() => {
                setRole(option.id)
                setError('')
              }}
            >
              <span className="setup-role-icon" aria-hidden="true">{option.icon}</span>
              <strong>{option.title}</strong>
              <span>{option.text}</span>
            </button>
          ))}
        </div>
      </>
    )
  } else if (step === 'id' && flowRole === 'employer') {
    body = (
      <>
        <h2>Verify your business</h2>
        <p className="setup-lead">
          Employers need the owner’s valid ID plus their business records (DTI, SEC or CDA, and the Mayor’s permit).
          PESO staff review these before your jobs go live.
        </p>
        <div className="setup-form">
          <Verify />
        </div>
      </>
    )
  } else if (step === 'id') {
    body = (
      <>
        <h2>Add a valid ID</h2>
        <p className="setup-lead">Employers see that your ID was provided. Your ID itself is never shown to them.</p>
        <div className="setup-form">
          <label htmlFor="setup-id-type">ID type</label>
          <select id="setup-id-type" value={idType} onChange={(e) => setIdType(e.target.value)}>
            <option value="">Choose an ID…</option>
            {JOBSEEKER_ID_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="setup-uploads">
            <label className="setup-drop">
              <input type="file" accept={ID_ACCEPT} onChange={(e) => pickId('front', e)} />
              <strong>Front of ID</strong>
              <span>Photo or PDF, up to 5 MB</span>
              {idFront && <FileChip file={idFront} />}
            </label>
            <label className="setup-drop">
              <input type="file" accept={ID_ACCEPT} onChange={(e) => pickId('back', e)} />
              <strong>Back of ID (optional)</strong>
              <span>Photo or PDF, up to 5 MB</span>
              {idBack && <FileChip file={idBack} />}
            </label>
          </div>
        </div>
      </>
    )
  } else if (step === 'resume') {
    body = (
      <>
        <h2>Add your resume</h2>
        <p className="setup-lead">Upload your CV or resume, or add a link to an online profile. You can add more than one.</p>
        <div className="setup-form">
          <label className="setup-drop wide">
            <input type="file" accept={RESUME_ACCEPT} multiple onChange={addResumeFiles} />
            <strong>Upload resume files</strong>
            <span>PDF, Word (.doc/.docx), CSV, spreadsheet, text or a photo, up to 5 MB each</span>
          </label>
          {resumeFiles.length > 0 && (
            <div className="setup-files">
              {resumeFiles.map((f) => (
                <FileChip key={f.fileName} file={f} onRemove={() => setResumeFiles(resumeFiles.filter((x) => x !== f))} />
              ))}
            </div>
          )}

          <label htmlFor="setup-link">Resume or profile link</label>
          <div className="setup-link-row">
            <input
              id="setup-link"
              type="url"
              inputMode="url"
              placeholder="linkedin.com/in/your-name"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addLink()
                }
              }}
            />
            <button type="button" onClick={addLink}>Add link</button>
          </div>
          {links.length > 0 && (
            <ul className="setup-links">
              {links.map((url) => (
                <li key={url}>
                  <strong>{linkLabel(url)}</strong>
                  <a href={url} target="_blank" rel="noreferrer">{url}</a>
                  <button type="button" aria-label={`Remove ${linkLabel(url)} link`} onClick={() => setLinks(links.filter((l) => l !== url))}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </>
    )
  } else {
    body = (
      <>
        <h2>Fill in your skill card</h2>
        <p className="setup-lead">This is what employers see and how jobs are matched to you.</p>
        <div className="setup-form">
          <SkillCardForm
            key={jobseeker.userId}
            onSaved={() => {
              markSkipped(accountKey, 'skills', false)
              advance()
            }}
          />
        </div>
      </>
    )
  }

  return (
    <main className="setup-page" aria-labelledby="setup-title">
      <header className="setup-topbar">
        <Logo height={40} />
        <span className="badge">Demo</span>
        {!done && (
          <button type="button" className="setup-later" onClick={single ? onClose : finishLater}>
            {single ? 'Close' : 'Finish later'}
          </button>
        )}
      </header>

      <div className="setup-scroll">
        <div className="setup-inner">
          <div className="setup-header">
            <span className="setup-kicker">{single ? 'Update your account' : 'Set up your account'}</span>
            <h1 id="setup-title">{done ? 'Setup complete' : stepTitle(step)}</h1>
          </div>

          {!single && !done && (
            <ol className="setup-progress" aria-label="Setup steps">
              {steps.map((s, i) => (
                <li key={s} className={i === index ? 'current' : i < index ? 'past' : undefined} aria-current={i === index ? 'step' : undefined}>
                  <span>{i + 1}</span> {stepTitle(s)}
                </li>
              ))}
            </ol>
          )}

          <div className="setup-body">
            {body}
            {error && <p className="setup-error" role="alert">{error}</p>}
            <p className="setup-note">Prototype: files stay on this device. Only their names are kept, and nothing is checked or sent.</p>
          </div>
        </div>
      </div>

      <footer className="setup-footer">
        {done ? (
          <button type="button" className="setup-next" onClick={onClose}>Start using TanawKita</button>
        ) : (
          <>
            {!single && index > 0 && (
              <button type="button" className="setup-back" onClick={() => { setError(''); setIndex(index - 1) }}>Back</button>
            )}
            <span className="setup-spacer" />
            <button type="button" className="setup-skip" onClick={skip}>Skip</button>
            <button type="button" className="setup-next" onClick={next}>
              {single ? 'Save' : index + 1 < steps.length ? 'Next' : 'Finish'}
            </button>
          </>
        )}
      </footer>
    </main>
  )
}
