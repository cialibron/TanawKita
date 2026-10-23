import { useRef, useState, type FormEvent } from 'react'
import { newId } from '../ids'
import BarangaySelect from '../../components/BarangaySelect'
import { DAVAO_CENTER } from '../../components/JobMap'
import PinLocationPanel from '../../components/PinLocationPanel'
import { nearestBarangay } from '../../area'
import { barangayName } from '../../data/barangays'
import { BARANGAY_CENTERS } from '../../data/barangayGeo'
import { useSession, useStore } from '../../store'
import { checkWage } from '../../rules'
import SkillPicker from '../../components/SkillPicker'
import { withMatchGroups } from '../../components/skillCatalog'
import type { JobType, PayUnit } from '../../types'
import { hasEmployerNumbers } from '../../verification'
import { VerificationBadge } from './Verify'

// Today in the person's own time zone, as yyyy-mm-dd (the date input's format).
function todayISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// A whole number from a number field, or null when it is empty, negative, a decimal or not a number.
function wholeNumber(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number(value) : null
}

interface Props {
  // Opens the Verification tab.
  onGetVerified: () => void
}

export default function PostJob({ onGetVerified }: Props) {
  const { state, dispatch } = useStore()
  const session = useSession('employer')
  const verification = state.verifications[session.userId]
  const isIndividual = verification?.kind === 'individual'

  const [title, setTitle] = useState('')
  const [barangay, setBarangay] = useState('116')
  const [payAmount, setPayAmount] = useState('')
  const [payUnit, setPayUnit] = useState<PayUnit>('day')
  const [jobType, setJobType] = useState<JobType>('part-time')
  const [hoursPerWeek, setHoursPerWeek] = useState('24')
  const [skills, setSkills] = useState<string[]>([])
  const [workers, setWorkers] = useState('1')
  const [startDate, setStartDate] = useState('')
  const [minorsAllowed, setMinorsAllowed] = useState(false)
  const [location, setLocation] = useState<[number, number] | null>(null)
  const [pinning, setPinning] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const amount = Number(payAmount)
  const wage = payAmount === '' ? null : checkWage(amount, payUnit)

  // Set while a post is being saved, so a fast double tap on "Post job" posts once.
  const posting = useRef(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (posting.current) return
    setMessage('')
    setError('')
    if (!title.trim()) return setError('Enter a job title.')
    if (payAmount === '') return setError('Enter the pay amount.')
    if (wage && !wage.ok) return setError(wage.message)
    const hours = wholeNumber(hoursPerWeek)
    if (hours === null || hours < 1 || hours > 112) return setError('Hours per week must be a whole number from 1 to 112.')
    const workersNeeded = wholeNumber(workers)
    if (workersNeeded === null || workersNeeded < 1 || workersNeeded > 500) return setError('Workers needed must be a whole number from 1 to 500.')
    if (skills.length === 0) return setError('Pick at least one skill.')
    if (!startDate) return setError('Pick a start date.')
    if (startDate < todayISO()) return setError('The start date has passed. Pick today or a later date.')
    if (!location) return setError('Open the map and pin where the work is.')
    if (isIndividual && jobType !== 'short-term') return setError('Individuals and households can post short-term jobs only.')
    if (jobType !== 'short-term' && verification && !hasEmployerNumbers(verification)) {
      return setError(
        'Part-time and full-time employees must be covered by SSS, PhilHealth and Pag-IBIG. Add your employer numbers in Verification, or post a short-term job.',
      )
    }

    posting.current = true
    window.setTimeout(() => (posting.current = false), 1000)
    dispatch({
      type: 'postJob',
      job: {
        id: newId('job'),
        employerId: session.userId,
        employerName: session.name,
        title: title.trim(),
        barangay,
        payAmount: amount,
        payUnit,
        jobType,
        hoursPerWeek: hours,
        skills: withMatchGroups(skills),
        workers: workersNeeded,
        startDate,
        minorsAllowed,
        status: 'open',
        lat: location[0],
        lng: location[1],
      },
    })
    setLocation(null)
    setTitle('')
    setPayAmount('')
    setSkills([])
    setStartDate('')
    setMessage('Job posted.')
  }

  if (verification?.status !== 'verified') {
    const pending = verification?.status === 'pending'
    return (
      <>
        <h1>Post a job</h1>
        <div className={`card status-card ${pending ? 'pending' : 'none'}`}>
          <strong>{pending ? 'Your verification is being reviewed' : 'Get verified before posting'}</strong>
          {pending ? (
            <p className="muted">PESO staff are checking your records. You can post jobs once you are approved.</p>
          ) : (
            <>
              <p className="muted">To keep jobseekers safe, PESO checks every employer first. It takes about 5 minutes. Have these ready:</p>
              <ul className="verify-needs">
                <li>DTI, SEC or CDA registration</li>
                <li>Mayor’s permit</li>
                <li>Barangay clearance</li>
                <li>BIR 2303</li>
                <li>A valid ID</li>
              </ul>
            </>
          )}
          <button type="button" className="primary" onClick={onGetVerified}>
            {pending ? 'See my verification' : 'Get verified'}
          </button>
        </div>
      </>
    )
  }

  return (
    <form noValidate onSubmit={submit}>
      <h1>Post a job</h1>
      <p>
        <VerificationBadge employerId={session.userId} />
      </p>

      <label htmlFor="title">Job title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label htmlFor="barangay">Barangay</label>
      <BarangaySelect id="barangay" value={barangay} onChange={setBarangay} />

      <label>Work location</label>
      <button type="button" className="pin-open" onClick={() => setPinning(true)}>
        Open map to pin location
      </button>
      <p className={location ? 'ok' : 'muted'}>
        {location ? `✓ Pinned near ${barangayName(nearestBarangay(location) ?? barangay)}` : 'No location pinned yet.'}
      </p>
      {pinning && (
        <PinLocationPanel
          picked={location}
          center={BARANGAY_CENTERS[barangay] ?? DAVAO_CENTER}
          onDone={(point) => {
            setLocation(point)
            setPinning(false)
          }}
          onClose={() => setPinning(false)}
        />
      )}

      <label htmlFor="pay">Pay (₱)</label>
      <input id="pay" type="number" min="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />

      <label htmlFor="unit">Pay unit</label>
      <select id="unit" value={payUnit} onChange={(e) => setPayUnit(e.target.value as PayUnit)}>
        <option value="day">per day</option>
        <option value="hour">per hour</option>
        <option value="task">per task (pakyaw)</option>
      </select>
      {wage && <p className={wage.ok ? 'ok' : 'error'}>{wage.message}</p>}

      <label htmlFor="type">Job type</label>
      <select id="type" value={jobType} onChange={(e) => setJobType(e.target.value as JobType)}>
        <option value="short-term">Short-term</option>
        <option value="part-time" disabled={isIndividual}>
          Part-time
        </option>
        <option value="full-time" disabled={isIndividual}>
          Full-time
        </option>
      </select>
      {jobType !== 'short-term' && !hasEmployerNumbers(verification) && (
        <p className="error">Needs SSS, PhilHealth and Pag-IBIG employer numbers (add them in Verification).</p>
      )}

      <label htmlFor="hours">Hours per week</label>
      <input id="hours" type="number" inputMode="numeric" min="1" max="112" step="1" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} />

      <label htmlFor="workers">Workers needed</label>
      <input id="workers" type="number" inputMode="numeric" min="1" max="500" step="1" value={workers} onChange={(e) => setWorkers(e.target.value)} />

      <label htmlFor="start">Start date</label>
      <input id="start" type="date" min={todayISO()} value={startDate} onChange={(e) => setStartDate(e.target.value)} />

      <SkillPicker value={skills} onChange={setSkills} label="Skills wanted" placeholder="Type a skill, e.g. barista" />

      <label className="inline toggle">
        <input type="checkbox" checked={minorsAllowed} onChange={(e) => setMinorsAllowed(e.target.checked)} />
        Open to workers aged 15 to 17 (age-appropriate work only)
      </label>

      {error && <p className="error">{error}</p>}
      {message && <p className="ok">{message}</p>}

      <div className="section">
        <button type="submit" className="primary">
          Post job
        </button>
      </div>
    </form>
  )
}
