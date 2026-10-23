import { useState } from 'react'
import { barangayName } from '../../data/barangays'
import { useStore } from '../../store'
import type { AppState } from '../../types'
import UndoToast from '../UndoToast'

const PILOT_BARANGAYS = ['116', '020', '124']

export default function Overview() {
  const { state, dispatch } = useStore()
  const cards = Object.values(state.skillCards)
  const openJobs = state.jobs.filter((j) => j.status === 'open')
  const hired = state.applications.filter((a) => a.status === 'hired').length

  const stats = [
    { label: 'Open jobs', value: openJobs.length },
    { label: 'Jobseekers', value: cards.length },
    { label: 'Applications', value: state.applications.length },
    { label: 'Hired', value: hired },
  ]

  const byBarangay = PILOT_BARANGAYS.map((code) => {
    const jobIds = new Set(state.jobs.filter((j) => j.barangay === code).map((j) => j.id))
    return {
      code,
      jobs: openJobs.filter((j) => j.barangay === code).length,
      seekers: cards.filter((c) => c.barangay === code).length,
      applications: state.applications.filter((a) => jobIds.has(a.jobId)).length,
    }
  })

  // Reset happens at once; for 8 seconds, Undo puts everything back as it was.
  const [before, setBefore] = useState<AppState | null>(null)
  function reset() {
    setBefore(state)
    dispatch({ type: 'reset' })
    // The samples open on the jobseeker view; stay here, where the Undo message is.
    dispatch({ type: 'setView', view: 'admin' })
  }

  return (
    <>
      <h1>PESO overview</h1>

      <section className="overview-section" aria-labelledby="overview-all">
        <h2 id="overview-all">All of Davao City</h2>
        <p className="muted overview-caption">Totals for every job, jobseeker and application in the demo.</p>
        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="card stat">
              <div className="stat-value">{s.value}</div>
              <div className="muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="overview-section" aria-labelledby="overview-pilot">
        <h2 id="overview-pilot">Pilot barangays</h2>
        <p className="muted overview-caption">Only these {byBarangay.length} barangays. Their counts are part of the totals above.</p>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Barangay</th>
                <th>Open jobs</th>
                <th>Seekers</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {byBarangay.map((b) => (
                <tr key={b.code}>
                  <td>{barangayName(b.code)}</td>
                  <td>{b.jobs}</td>
                  <td>{b.seekers}</td>
                  <td>{b.applications}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overview-section" aria-labelledby="overview-tools">
        <h2 id="overview-tools">Test tools</h2>
        <p className="muted overview-caption">Puts jobs, skill cards and applications back to the samples. You can undo it for 8 seconds.</p>
        <button type="button" onClick={reset}>
          Reset demo data
        </button>
      </section>

      {before && (
        <UndoToast
          message="Demo data reset to the samples."
          onUndo={() => {
            dispatch({ type: 'restore', state: before })
            setBefore(null)
          }}
          onDone={() => setBefore(null)}
        />
      )}
    </>
  )
}
