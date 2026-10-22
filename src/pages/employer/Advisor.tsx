import { useState, type FormEvent } from 'react'
import BarangaySelect from '../../components/BarangaySelect'
import { ADVISOR_RADIUS_KM, adviseBusinesses, BUDGETS, HIRE_SIZES, type AdvisorInput, type AdvisorResult, type Budget, type HireSize } from '../../advisor'
import { barangayName } from '../../data/barangays'
import { SKILLS } from '../../rules'
import { useSession, useStore } from '../../store'

// Steps every new business in Davao City goes through, shown under each suggestion.
const REGISTRATION_STEPS = [
  'Register the business name with DTI (online)',
  'Get a barangay clearance, then a Mayor’s permit from the City BPLO',
  'Register with BIR',
  'Post your first jobs on TanawKita to hire nearby',
]

export default function Advisor() {
  const { state } = useStore()
  const session = useSession('employer')
  const [barangay, setBarangay] = useState(state.businesses[session.userId]?.barangay ?? '116')
  const [budget, setBudget] = useState<Budget>('low')
  const [hireSize, setHireSize] = useState<HireSize>('small')
  const [skills, setSkills] = useState<string[]>([])
  const [result, setResult] = useState<AdvisorResult | null>(null)
  const [asked, setAsked] = useState<AdvisorInput | null>(null)
  const [error, setError] = useState('')

  function toggleSkill(s: string) {
    setSkills(skills.includes(s) ? skills.filter((x) => x !== s) : [...skills, s])
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const input = { barangay, budget, skills, hireSize }
    const advice = adviseBusinesses(input)
    setError(advice ? '' : 'No map location for this barangay yet. Pick a nearby one.')
    setResult(advice)
    setAsked(input)
  }

  return (
    <>
      <h1>Business advisor</h1>
      <p className="muted">
        Planning a new business? Answer 4 questions. Ideas are ranked using CBMS data for the area within{' '}
        {ADVISOR_RADIUS_KM} km of the barangay.
      </p>

      <form className="card" onSubmit={submit}>
        <label htmlFor="adv-barangay">1. Where do you want to open?</label>
        <BarangaySelect id="adv-barangay" value={barangay} onChange={setBarangay} />

        <label>2. How much can you invest to start?</label>
        <div className="row">
          {BUDGETS.map((b) => (
            <button key={b.id} type="button" className={`chip${budget === b.id ? ' active' : ''}`} onClick={() => setBudget(b.id)}>
              {b.label}
            </button>
          ))}
        </div>

        <label>3. What can you or your family do well?</label>
        <div className="row">
          {SKILLS.map((s) => (
            <button key={s} type="button" className={`chip${skills.includes(s) ? ' active' : ''}`} onClick={() => toggleSkill(s)}>
              {s}
            </button>
          ))}
        </div>

        <label>4. How many people could you hire?</label>
        <div className="row">
          {HIRE_SIZES.map((h) => (
            <button key={h.id} type="button" className={`chip${hireSize === h.id ? ' active' : ''}`} onClick={() => setHireSize(h.id)}>
              {h.label}
            </button>
          ))}
        </div>

        <div className="section">
          <button type="submit" className="primary">
            Suggest businesses
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {result && asked && (
        <>
          <h2>Around {barangayName(asked.barangay)}</h2>
          <div className="stats">
            <div className="card stat">
              <div className="stat-value">{result.area.households.toLocaleString()}</div>
              <div className="muted">Households (possible customers)</div>
            </div>
            <div className="card stat">
              <div className="stat-value">{result.area.jobseekerPool.toLocaleString()}</div>
              <div className="muted">People looking for work</div>
            </div>
          </div>

          <h2>Top ideas</h2>
          {result.suggestions.length === 0 && <p className="muted">No ideas fit this budget yet. Try a higher budget.</p>}
          {result.suggestions.slice(0, 3).map((s, i) => (
            <details key={s.idea.id} className="card idea" open={i === 0}>
              <summary>
                <span className="row spread">
                  <strong>
                    {i + 1}. {s.idea.name}
                  </strong>
                  <span className="match">{s.score}/100</span>
                </span>
                <span className="muted">
                  Start from about ₱{s.idea.startCost.toLocaleString()} · around {s.idea.workers} worker(s)
                </span>
              </summary>
              {s.reasons.length > 0 && (
                <>
                  <h3>Why here</h3>
                  <ul>
                    {s.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </>
              )}
              {s.cautions.length > 0 && (
                <>
                  <h3>Watch out</h3>
                  <ul className="caution">
                    {s.cautions.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </>
              )}
              <h3>How to start</h3>
              <ol>
                {[...s.idea.steps, ...REGISTRATION_STEPS].map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </details>
          ))}
          <p className="muted">
            Prototype advice from area statistics only. Costs are rough guesses; talk to a DTI Negosyo Center before investing.
          </p>
        </>
      )}
    </>
  )
}
