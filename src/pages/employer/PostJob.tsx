import { useState, type FormEvent } from 'react'
import BarangaySelect from '../../components/BarangaySelect'
import JobMap from '../../components/JobMap'
import { useSession, useStore } from '../../store'
import { checkWage, SKILLS } from '../../rules'
import type { JobType, PayUnit } from '../../types'
import { hasEmployerNumbers } from '../../verification'
import { VerificationBadge } from './Verify'

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
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const amount = Number(payAmount)
  const wage = payAmount === '' ? null : checkWage(amount, payUnit)

  function toggleSkill(s: string) {
    setSkills(skills.includes(s) ? skills.filter((x) => x !== s) : [...skills, s])
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    if (!title.trim()) return setError('Enter a job title.')
    if (payAmount === '') return setError('Enter the pay amount.')
    if (wage && !wage.ok) return setError(wage.message)
    if (skills.length === 0) return setError('Pick at least one skill.')
    if (!startDate) return setError('Pick a start date.')
    if (!location) return setError('Tap the map to mark where the work is.')
    if (isIndividual && jobType !== 'short-term') return setError('Individuals and households can post short-term jobs only.')
    if (jobType !== 'short-term' && verification && !hasEmployerNumbers(verification)) {
      return setError(
        'Part-time and full-time employees must be covered by SSS, PhilHealth and Pag-IBIG. Add your employer numbers in Verification, or post a short-term job.',
      )
    }

    dispatch({
      type: 'postJob',
      job: {
        id: `job-${Date.now()}`,
        employerId: session.userId,
        employerName: session.name,
        title: title.trim(),
        barangay,
        payAmount: amount,
        payUnit,
        jobType,
        hoursPerWeek: Number(hoursPerWeek),
        skills,
        workers: Number(workers),
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
          <p className="muted">
            {pending
              ? 'PESO staff are checking your records. You can post jobs once you are approved.'
              : 'To protect jobseekers, only employers with checked government records can post jobs. It takes about 5 minutes with your DTI/SEC/CDA registration, Mayor’s permit, barangay clearance, BIR 2303 and a valid ID.'}
          </p>
          <button type="button" className="primary" onClick={onGetVerified}>
            {pending ? 'See my verification' : 'Get verified'}
          </button>
        </div>
      </>
    )
  }

  return (
    <form onSubmit={submit}>
      <h1>Post a job</h1>
      <p>
        <VerificationBadge employerId={session.userId} />
      </p>

      <label htmlFor="title">Job title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />

      <label htmlFor="barangay">Barangay</label>
      <BarangaySelect id="barangay" value={barangay} onChange={setBarangay} />

      <label>Work location (tap the map)</label>
      <JobMap picked={location} onPick={setLocation} height={240} />

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
      <input id="hours" type="number" min="1" max="112" value={hoursPerWeek} onChange={(e) => setHoursPerWeek(e.target.value)} />

      <label htmlFor="workers">Workers needed</label>
      <input id="workers" type="number" min="1" value={workers} onChange={(e) => setWorkers(e.target.value)} />

      <label htmlFor="start">Start date</label>
      <input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />

      <h2>Skills wanted</h2>
      {SKILLS.map((s) => (
        <label key={s} className="inline">
          <input type="checkbox" checked={skills.includes(s)} onChange={() => toggleSkill(s)} />
          {s}
        </label>
      ))}

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
