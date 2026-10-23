import { useState, type FormEvent } from 'react'
import BarangaySelect from '../../components/BarangaySelect'
import { useSession, useStore } from '../../store'
import { ageGate, DAYS } from '../../rules'
import SkillPicker from '../../components/SkillPicker'
import { chosenSkills, withMatchGroups } from '../../components/skillCatalog'
import type { SkillCard } from '../../types'

interface Props {
  // Optional hooks for hosts like the profile page, which shows this form as its edit mode.
  onSaved?: () => void
  onCancel?: () => void
}

export default function SkillCardForm({ onSaved, onCancel }: Props = {}) {
  const { state, dispatch } = useStore()
  const session = useSession('jobseeker')
  const existing = state.skillCards[session.userId]

  const [age, setAge] = useState(existing ? String(existing.age) : '')
  const [barangay, setBarangay] = useState(existing?.barangay ?? '116')
  const [skills, setSkills] = useState<string[]>(chosenSkills(existing?.skills ?? []))
  const [hoursWanted, setHoursWanted] = useState(existing ? String(existing.hoursWanted) : '24')
  const [days, setDays] = useState<string[]>(existing?.daysAvailable ?? [])
  const [expectedPay, setExpectedPay] = useState(existing?.expectedPay != null ? String(existing.expectedPay) : '')
  const [consent, setConsent] = useState(existing?.guardianConsent ?? false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const ageNumber = Number(age)
  const gate = age === '' ? null : ageGate(ageNumber)

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    if (gate === null) return setError('Enter your age.')
    if (gate === 'blocked') return setError('Workers under 15 cannot register yet.')
    if (gate === 'consent' && !consent) return setError('Workers aged 15 to 17 need a parent or guardian consent.')
    if (skills.length === 0) return setError('Pick at least one skill.')
    if (days.length === 0) return setError('Pick at least one day you are available.')

    const card: SkillCard = {
      ...existing,
      userId: session.userId,
      name: session.name,
      age: ageNumber,
      barangay,
      skills: withMatchGroups(skills),
      hoursWanted: Number(hoursWanted),
      daysAvailable: days,
      expectedPay: expectedPay === '' ? null : Number(expectedPay),
      expectedPayUnit: 'day',
      guardianConsent: gate === 'consent' ? consent : false,
    }
    dispatch({ type: 'saveSkillCard', card })
    setMessage('Skill card saved.')
    onSaved?.()
  }

  return (
    <form className="skill-card-form" onSubmit={submit}>
      <h1>{existing ? 'Your skill card' : 'Create your skill card'}</h1>

      <label htmlFor="age">Age</label>
      <input id="age" type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} />

      {gate === 'consent' && (
        <label className="inline">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          My parent or guardian has agreed to this (required for ages 15 to 17)
        </label>
      )}

      <label htmlFor="barangay">Barangay</label>
      <BarangaySelect id="barangay" value={barangay} onChange={setBarangay} />

      <SkillPicker value={skills} onChange={setSkills} label="Skills" />

      <label htmlFor="hours">Hours I want per week</label>
      <input id="hours" type="number" min="1" max="112" value={hoursWanted} onChange={(e) => setHoursWanted(e.target.value)} />

      <h2>Days available</h2>
      {DAYS.map((d) => (
        <label key={d} className="inline">
          <input type="checkbox" checked={days.includes(d)} onChange={() => toggle(days, d, setDays)} />
          {d}
        </label>
      ))}

      <label htmlFor="expected">Expected pay per day, optional (₱)</label>
      <input id="expected" type="number" min="0" value={expectedPay} onChange={(e) => setExpectedPay(e.target.value)} />

      {error && <p className="error">{error}</p>}
      {message && <p className="ok">{message}</p>}

      <div className="section">
        <button type="submit" className="primary">
          Save skill card
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
