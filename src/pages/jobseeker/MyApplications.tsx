import { barangayName } from '../../data/barangays'
import { payLabel } from '../../components/jobPins'
import { useSession, useStore } from '../../store'
import { STATUS_LABEL, STATUS_TONE, appliedLabel } from './applicationLabels'

interface Props {
  selectedId: string | null
  // Selecting an application shows its job on the map and in the detail panel.
  onSelect: (jobId: string | null) => void
}

export default function MyApplications({ selectedId, onSelect }: Props) {
  const { state } = useStore()
  const { userId } = useSession('jobseeker')
  const mine = state.applications.filter((a) => a.userId === userId)

  return (
    <>
      <h1>My applications</h1>
      {mine.length === 0 && <p className="muted">You have not applied to any job yet.</p>}
      {mine.length > 0 && <p className="muted">Tap an application to see the job’s details and where it is.</p>}
      <div className="job-rows">
        {mine.map((a) => {
          const job = state.jobs.find((j) => j.id === a.jobId)
          if (!job) return null
          const selected = selectedId === job.id
          return (
            <button
              type="button"
              key={a.id}
              id={`job-${job.id}`}
              className={`job-row application-row${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(selected ? null : job.id)}
            >
              <span className="job-row-top">
                <span className="job-row-pay">{payLabel(job)}</span>
                <span className={`job-badge ${STATUS_TONE[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              </span>
              <span className="job-row-places">
                <span>{job.title}</span>
                <span>{barangayName(job.barangay)}</span>
              </span>
              <span className="job-row-meta">
                <span>
                  {job.employerName} · {job.jobType}
                </span>
                <span>
                  <span className="job-row-label">APPLIED</span> {appliedLabel(a.appliedAt).toUpperCase()}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
