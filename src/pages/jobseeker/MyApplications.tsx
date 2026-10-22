import { barangayName } from '../../data/barangays'
import { useSession, useStore } from '../../store'
import type { ApplicationStatus } from '../../types'

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
}

export default function MyApplications() {
  const { state } = useStore()
  const { userId } = useSession('jobseeker')
  const mine = state.applications.filter((a) => a.userId === userId)

  return (
    <>
      <h1>My applications</h1>
      {mine.length === 0 && <p className="muted">You have not applied to any job yet.</p>}
      {mine.map((a) => {
        const job = state.jobs.find((j) => j.id === a.jobId)
        if (!job) return null
        return (
          <div key={a.id} className="card">
            <div className="pay">
              ₱{job.payAmount.toLocaleString()} / {job.payUnit === 'task' ? 'task' : job.payUnit}
            </div>
            <div>{job.title}</div>
            <div className="muted">
              {job.employerName} · {barangayName(job.barangay)}
            </div>
            <div className="ok">{STATUS_LABEL[a.status]}</div>
          </div>
        )
      })}
    </>
  )
}
