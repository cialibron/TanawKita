import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useSession, useStore } from '../../store'
import {
  DOC_LABELS,
  hasEmployerNumbers,
  ID_TYPES,
  KINDS,
  MAX_UPLOAD_KB,
  permitRenewalSoon,
  registrationAgency,
  requiredDocs,
  validate,
  type DocType,
  type Draft,
  type EmployerKind,
} from '../../verification'

const THIS_YEAR = new Date().getFullYear()

export function VerificationBadge({ employerId }: { employerId: string }) {
  const { state } = useStore()
  const v = state.verifications[employerId]
  if (v?.status !== 'verified') return null
  return (
    <span className="badge verified" title="Documents checked by PESO staff">
      ✓ {v.kind === 'individual' ? 'Verified individual' : 'Verified business'}
    </span>
  )
}

export default function Verify() {
  const { state, dispatch } = useStore()
  const session = useSession('employer')
  const existing = state.verifications[session.userId]
  const [editing, setEditing] = useState(!existing || existing.status === 'rejected')
  const [draft, setDraft] = useState<Draft>(
    existing ?? {
      kind: 'sole-prop',
      legalName: session.name,
      registrationNo: '',
      tin: '',
      permitNo: '',
      permitYear: THIS_YEAR,
      ownerName: '',
      idType: '',
      idLast4: '',
      sss: '',
      philhealth: '',
      pagibig: '',
      documents: [],
      consent: false,
    },
  )
  const [errors, setErrors] = useState<string[]>([])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft({ ...draft, [key]: value })
  const isBusiness = draft.kind !== 'individual'
  const agency = registrationAgency(draft.kind)

  function upload(type: DocType, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeKb = Math.round(file.size / 1024)
    if (sizeKb > MAX_UPLOAD_KB) {
      setErrors([`${file.name} is over 5 MB. Take a smaller photo or scan.`])
      return
    }
    const others = draft.documents.filter((d) => d.type !== type)
    set('documents', [...others, { type, fileName: file.name, sizeKb }])
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    // Keep only the documents that the chosen employer type needs.
    const needed = requiredDocs(draft.kind)
    const clean = { ...draft, documents: draft.documents.filter((d) => needed.includes(d.type)) }
    const problems = validate(clean)
    setErrors(problems)
    if (problems.length) return
    dispatch({
      type: 'submitVerification',
      employerId: session.userId,
      verification: { ...clean, status: 'pending', submittedAt: new Date().toISOString() },
    })
    setEditing(false)
  }

  if (existing && !editing) {
    return (
      <>
        <h1>Verification</h1>
        <div className={`card status-card ${existing.status}`}>
          {existing.status === 'verified' && (
            <>
              <strong>✓ Verified {existing.kind === 'individual' ? 'individual' : 'business'}</strong>
              <p className="muted">Your jobs show a verified badge and rank higher for jobseekers.</p>
            </>
          )}
          {existing.status === 'pending' && (
            <>
              <strong>Waiting for PESO review</strong>
              <p className="muted">Staff check your records with DTI/SEC/CDA, BIR and the City BPLO. You can post jobs once approved.</p>
            </>
          )}
        </div>
        <dl className="summary">
          <dt>Type</dt>
          <dd>{KINDS.find((k) => k.id === existing.kind)?.label}</dd>
          {existing.kind !== 'individual' && (
            <>
              <dt>Registered name</dt>
              <dd>{existing.legalName}</dd>
              <dt>{registrationAgency(existing.kind)} no.</dt>
              <dd>{existing.registrationNo}</dd>
              <dt>Mayor’s permit</dt>
              <dd>
                {existing.permitNo} ({existing.permitYear})
              </dd>
            </>
          )}
          <dt>Documents</dt>
          <dd>{existing.documents.length} uploaded</dd>
          <dt>SSS / PhilHealth / Pag-IBIG</dt>
          <dd>{hasEmployerNumbers(existing) ? 'All registered' : 'Not all given'}</dd>
        </dl>
        {permitRenewalSoon(existing.permitYear) && (
          <p className="error">Your Mayor’s permit expires Dec 31. Renew with the City BPLO by January 20.</p>
        )}
        <button type="button" onClick={() => setEditing(true)}>
          Update my records
        </button>
      </>
    )
  }

  return (
    <>
      <h1>Get verified</h1>
      <p className="muted">
        Jobseekers only see jobs from verified employers. This protects workers from fake or illegal job offers.
      </p>
      {existing?.status === 'rejected' && (
        <div className="card status-card rejected">
          <strong>Not approved</strong>
          <p>{existing.rejectReason || 'PESO staff could not confirm your records.'} Fix the details and submit again.</p>
        </div>
      )}

      <form className="card" onSubmit={submit}>
        <h2>1. What kind of employer are you?</h2>
        {KINDS.map((k) => (
          <label key={k.id} className="choice">
            <input type="radio" name="kind" checked={draft.kind === k.id} onChange={() => set('kind', k.id as EmployerKind)} />
            <span>
              <strong>{k.label}</strong>
              <span className="muted"> · {k.help}</span>
            </span>
          </label>
        ))}

        {isBusiness && (
          <>
            <h2>2. Business records</h2>
            <label htmlFor="v-legal">Registered business name</label>
            <input id="v-legal" value={draft.legalName} onChange={(e) => set('legalName', e.target.value)} />

            <label htmlFor="v-reg">{agency} registration number</label>
            <input id="v-reg" value={draft.registrationNo} onChange={(e) => set('registrationNo', e.target.value)} />

            <label htmlFor="v-tin">TIN (from BIR Form 2303)</label>
            <input id="v-tin" inputMode="numeric" placeholder="000-000-000-000" value={draft.tin} onChange={(e) => set('tin', e.target.value)} />

            <div className="row">
              <div className="grow">
                <label htmlFor="v-permit">Mayor’s permit number</label>
                <input id="v-permit" value={draft.permitNo} onChange={(e) => set('permitNo', e.target.value)} />
              </div>
              <div>
                <label htmlFor="v-year">Year</label>
                <select id="v-year" value={draft.permitYear} onChange={(e) => set('permitYear', Number(e.target.value))}>
                  {[THIS_YEAR, THIS_YEAR - 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        <h2>{isBusiness ? '3. Owner or authorized representative' : '2. About you'}</h2>
        <label htmlFor="v-owner">Full name</label>
        <input id="v-owner" value={draft.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
        <label htmlFor="v-idtype">Government ID</label>
        <select id="v-idtype" value={draft.idType} onChange={(e) => set('idType', e.target.value)}>
          <option value="">Choose an ID</option>
          {ID_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <label htmlFor="v-id4">Last 4 characters of the ID number</label>
        <input
          id="v-id4"
          maxLength={4}
          value={draft.idLast4}
          onChange={(e) => set('idLast4', e.target.value.toUpperCase())}
        />
        <p className="muted">We keep only the last 4 characters, never the full ID number.</p>

        <h2>{isBusiness ? '4' : '3'}. Employer numbers (needed for regular employees)</h2>
        <p className="muted">
          Required before hiring part-time or full-time employees. Optional for short tasks (<span lang="fil">pakyaw</span>).
        </p>
        <label htmlFor="v-sss">SSS employer number</label>
        <input id="v-sss" inputMode="numeric" placeholder="00-0000000-0" value={draft.sss} onChange={(e) => set('sss', e.target.value)} />
        <label htmlFor="v-ph">PhilHealth employer number (PEN)</label>
        <input id="v-ph" inputMode="numeric" placeholder="00-000000000-0" value={draft.philhealth} onChange={(e) => set('philhealth', e.target.value)} />
        <label htmlFor="v-pi">Pag-IBIG employer ID</label>
        <input id="v-pi" inputMode="numeric" placeholder="0000-0000-0000" value={draft.pagibig} onChange={(e) => set('pagibig', e.target.value)} />

        <h2>{isBusiness ? '5' : '4'}. Upload documents</h2>
        <p className="muted">Clear photo or PDF, up to 5 MB each. Test mode: files stay on this device and are not uploaded.</p>
        {requiredDocs(draft.kind).map((type) => {
          const doc = draft.documents.find((d) => d.type === type)
          return (
            <div key={type} className={`upload${doc ? ' done' : ''}`}>
              <div>
                <div>{DOC_LABELS[type]}</div>
                {doc && (
                  <div className="muted">
                    ✓ {doc.fileName} · {doc.sizeKb} KB
                  </div>
                )}
              </div>
              <label className="upload-button">
                {doc ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*,.pdf" onChange={(e) => upload(type, e)} hidden />
              </label>
            </div>
          )
        })}

        <h2>{isBusiness ? '6' : '5'}. Data privacy</h2>
        <label className="inline">
          <input type="checkbox" checked={draft.consent} onChange={(e) => set('consent', e.target.checked)} />
          I agree that PESO Davao may process these records only to verify me as an employer, under the Data Privacy Act of
          2012 (RA 10173). I confirm the documents are genuine.
        </label>

        {errors.length > 0 && (
          <ul className="error">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <div className="section">
          <button type="submit" className="primary">
            Submit for review
          </button>
        </div>
      </form>
    </>
  )
}
