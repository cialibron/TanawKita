import { barangayName } from '../../data/barangays'
import { useStore } from '../../store'
import JobMap from '../../components/JobMap'
import Verifications from './Verifications'

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

  function reset() {
    if (confirm('Reset all demo data? Jobs, skill cards and applications go back to the samples.')) {
      dispatch({ type: 'reset' })
    }
  }

  return (
    <>
      <h1>PESO overview</h1>
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <div className="stat-value">{s.value}</div>
            <div className="muted">{s.label}</div>
          </div>
        ))}
      </div>

      <Verifications />

      <h2>Pilot barangays</h2>
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

      <h2>All open jobs</h2>
      <JobMap jobs={openJobs} height={260} />

      <h2>Test tools</h2>
      <button type="button" onClick={reset}>
        Reset demo data
      </button>
    </>
  )
}
