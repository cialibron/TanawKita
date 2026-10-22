import { useState } from 'react'
import { useStore } from '../../store'
import { DOC_LABELS, hasEmployerNumbers, KINDS, permitIssue, registrationAgency, type Verification } from '../../verification'

// What PESO staff should confirm with each agency before approving. Prototype: these are reminders, not live lookups.
function checklist(v: Verification): string[] {
  const agency = registrationAgency(v.kind)
  if (!agency) return ['ID photo matches the name given', 'Barangay residency certificate is recent and signed']
  return [
    `${agency} record found for “${v.legalName}” (${agency === 'DTI' ? 'BNRS online search' : agency === 'SEC' ? 'SEC eSPARC / Company Registration' : 'CDA registry'})`,
    `Mayor’s permit ${v.permitNo} is valid for ${v.permitYear} (City BPLO)`,
    'Barangay business clearance is for the same address',
    `TIN on BIR 2303 matches ${v.tin}`,
    'Owner or representative ID matches the name given',
  ]
}

function Review({ employerId, v }: { employerId: string; v: Verification }) {
  const { state, dispatch } = useStore()
  const items = checklist(v)
  const [checked, setChecked] = useState<boolean[]>(items.map(() => false))
  const [reason, setReason] = useState('')
  const permit = v.kind === 'individual' ? null : permitIssue(v.permitYear)

  return (
    <div className="card">
      <div className="row spread">
        <strong>{v.legalName || v.ownerName}</strong>
        <span className="badge">{KINDS.find((k) => k.id === v.kind)?.label}</span>
      </div>
      <div className="muted">
        Account: {state.names[employerId] ?? employerId} · submitted {new Date(v.submittedAt).toLocaleDateString()}
      </div>
      <dl className="summary">
        {v.kind !== 'individual' && (
          <>
            <dt>{registrationAgency(v.kind)} no.</dt>
            <dd>{v.registrationNo}</dd>
            <dt>TIN</dt>
            <dd>{v.tin}</dd>
            <dt>Mayor’s permit</dt>
            <dd>
              {v.permitNo} ({v.permitYear}){permit && <span className="error"> · {permit}</span>}
            </dd>
          </>
        )}
        <dt>Owner / rep</dt>
        <dd>
          {v.ownerName} · {v.idType} ending {v.idLast4}
        </dd>
        <dt>SSS / PhilHealth / Pag-IBIG</dt>
        <dd>{hasEmployerNumbers(v) ? 'All given' : 'Missing: short-term jobs only'}</dd>
      </dl>
      <h3>Documents</h3>
      <ul>
        {v.documents.map((d) => (
          <li key={d.type}>
            {DOC_LABELS[d.type]}: <span className="muted">{d.fileName}</span>
          </li>
        ))}
      </ul>
      <h3>Staff checklist</h3>
      {items.map((item, i) => (
        <label key={item} className="inline checklist">
          <input
            type="checkbox"
            checked={checked[i]}
            onChange={() => setChecked(checked.map((c, j) => (j === i ? !c : c)))}
          />
          {item}
        </label>
      ))}
      <label htmlFor={`reason-${employerId}`}>Reason if rejecting</label>
      <input
        id={`reason-${employerId}`}
        value={reason}
        placeholder="e.g. Mayor’s permit number not found"
        onChange={(e) => setReason(e.target.value)}
      />
      <div className="row section">
        <button
          type="button"
          className="primary"
          disabled={!checked.every(Boolean) || permit !== null}
          onClick={() => dispatch({ type: 'reviewVerification', employerId, approve: true })}
        >
          Approve
        </button>
        <button
          type="button"
          disabled={!reason.trim()}
          onClick={() => dispatch({ type: 'reviewVerification', employerId, approve: false, reason: reason.trim() })}
        >
          Reject
        </button>
      </div>
    </div>
  )
}

export default function Verifications() {
  const { state } = useStore()
  const all = Object.entries(state.verifications)
  const pending = all.filter(([, v]) => v.status === 'pending')
  const verified = all.filter(([, v]) => v.status === 'verified').length
  const rejected = all.filter(([, v]) => v.status === 'rejected').length

  return (
    <>
      <h2>Employer verification</h2>
      <p className="muted">
        {pending.length} waiting · {verified} verified · {rejected} rejected. Approve only after every item is checked.
      </p>
      {pending.length === 0 && <p className="card muted">No employers waiting for review.</p>}
      {pending.map(([id, v]) => (
        <Review key={id} employerId={id} v={v} />
      ))}
    </>
  )
}
