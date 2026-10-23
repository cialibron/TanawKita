import { useState } from 'react'
import { barangayName } from '../../data/barangays'
import { useSession, useStore } from '../../store'
import { DAYS } from '../../rules'
import { chosenSkills } from '../../components/skillCatalog'
import type { JobPost, JobStatus } from '../../types'

const JOB_STATUSES: JobStatus[] = ['open', 'paused', 'filled']

export default function MyPosts() {
  const { state, dispatch } = useStore()
  const { userId } = useSession('employer')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const myJobs = state.jobs.filter((j) => j.employerId === userId)

  function setJobStatus(job: JobPost, status: JobStatus) {
    dispatch({ type: 'updateJob', jobId: job.id, status })
  }

  return (
    <>
      <h1>My posts</h1>
      {myJobs.length === 0 && <p className="muted">You have not posted a job yet.</p>}

      {myJobs.map((job) => {
        const applications = state.applications.filter((a) => a.jobId === job.id)
        const isOpen = selectedId === job.id
        return (
          <div key={job.id} className="card">
            <button type="button" className="link" onClick={() => setSelectedId(isOpen ? null : job.id)}>
              <div className="pay">
                ₱{job.payAmount.toLocaleString()} / {job.payUnit === 'task' ? 'task' : job.payUnit}
              </div>
              <div>{job.title}</div>
              <div className="muted">
                {barangayName(job.barangay)} · {job.status} · {applications.length} applicant(s)
              </div>
            </button>

            {isOpen && (
              <div className="section">
                <div className="row">
                  {JOB_STATUSES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={job.status === s ? 'primary' : ''}
                      onClick={() => setJobStatus(job, s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <h2>Applicants</h2>
                {applications.length === 0 && <p className="muted">No applicants yet.</p>}
                {applications.map((app) => {
                  const card = state.skillCards[app.userId]
                  if (!card) return null
                  return (
                    <div key={app.id} className="card">
                      <strong>{card.name}</strong>
                      <div className="muted">
                        {card.age >= 18 ? '18 and over' : 'Under 18'} · {barangayName(card.barangay)} · {card.hoursWanted} hrs/week
                      </div>
                      <div className="muted">
                        Skills: {chosenSkills(card.skills).join(', ')}
                      </div>
                      <div className="muted">
                        Available: {DAYS.filter((d) => card.daysAvailable.includes(d)).join(', ')}
                        {card.expectedPay != null && ` · Expects ₱${card.expectedPay}/day`}
                      </div>
                      <div className="row section">
                        <span className="muted">Status: {app.status}</span>
                        <button
                          type="button"
                          disabled={app.status !== 'applied'}
                          onClick={() => dispatch({ type: 'setStatus', applicationId: app.id, status: 'shortlisted' })}
                        >
                          Shortlist
                        </button>
                        <button
                          type="button"
                          disabled={app.status === 'hired'}
                          onClick={() => dispatch({ type: 'setStatus', applicationId: app.id, status: 'hired' })}
                        >
                          Mark hired
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
