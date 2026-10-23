import type { ReactNode } from 'react'
import LocationPhoto from './LocationPhoto'
import { chosenSkills } from './skillCatalog'
import { businessFor } from './jobPins'
import PayLabel from './PayLabel'
import { barangayName } from '../data/barangays'
import type { Business, JobPost } from '../types'

// Extra details shown only when the detail panel is expanded. "About the business" comes from the simulation
// sheet; the "Sample job details" list is a design mock-up and is labeled as such on screen.
function MoreJobDetails({ job, business }: { job: JobPost; business?: Business }) {
  const facts: [string, string | undefined][] = business
    ? [
        ['Type', business.category],
        ['Sector', business.sector],
        ['Hours', business.businessHours?.replace('-', ' – ')],
        ['Years open', business.yearsOperating != null ? `${business.yearsOperating} ${business.yearsOperating === 1 ? 'year' : 'years'}` : undefined],
        ['Staff', business.employeeCountRange && `${business.employeeCountRange} people`],
        ['Branches in Davao', business.branchesInDavao != null ? String(business.branchesInDavao) : undefined],
      ]
    : []
  const shown = facts.filter((f): f is [string, string] => Boolean(f[1]))
  return (
    <div className="selected-job-more">
      {shown.length > 0 && (
        <section>
          <div className="detail-kicker">ABOUT THE BUSINESS</div>
          <dl className="job-more-facts">
            {shown.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section>
        <div className="detail-kicker">
          SAMPLE JOB DETAILS <span className="mockup-tag">Mock-up</span>
        </div>
        <dl className="job-more-list">
          <div>
            <dt>What you’ll do</dt>
            <dd>Work as {job.title.toLowerCase()} at {job.employerName}, using {job.skills.join(', ').toLowerCase() || 'your skills'}.</dd>
          </div>
          <div>
            <dt>Who can apply</dt>
            <dd>{job.minorsAllowed ? 'Open to all ages, including workers under 18.' : 'Workers 18 years old and above.'}</dd>
          </div>
          <div>
            <dt>What to bring</dt>
            <dd>A valid ID. A resume is optional.</dd>
          </div>
          <div>
            <dt>Training</dt>
            <dd>Short on-the-job training on the first day.</dd>
          </div>
          <div>
            <dt>How to apply</dt>
            <dd>Tap Apply now. The employer sees your skill card and replies here.</dd>
          </div>
        </dl>
      </section>

      <section>
        <div className="detail-kicker">LOCATION</div>
        <LocationPhoto lat={job.lat} lng={job.lng} label={`${job.employerName}, ${barangayName(job.barangay)}`} />
      </section>
    </div>
  )
}

interface Props {
  job: JobPost
  kicker: string
  onClose: () => void
  // Shown under the skills, e.g. the match score and verification badge.
  info?: ReactNode
  // The action area on the right, e.g. Apply now or the application status.
  action?: ReactNode
}

// The selected job in the map's lower detail panel: pay, schedule and skills, with more details once expanded.
export default function JobDetail({ job, kicker, onClose, info, action }: Props) {
  return (
    <div className="selected-job-detail">
      <div className="selected-job-heading">
        <div>
          <div className="detail-kicker">{kicker}</div>
          <h2>{job.title}</h2>
          <div className="muted">{job.employerName} · {barangayName(job.barangay)}</div>
        </div>
        <button type="button" className="detail-close" aria-label="Clear selected job" onClick={onClose}>×</button>
      </div>
      <div className="selected-job-metrics">
        <div><span>Pay</span><strong><PayLabel job={job} /></strong></div>
        <div><span>Schedule</span><strong>{job.hoursPerWeek} hrs / week</strong></div>
        <div><span>Workers</span><strong>{job.workers} needed</strong></div>
        <div><span>Start date</span><strong>{job.startDate}</strong></div>
      </div>
      <div className="selected-job-footer">
        <div>
          <div className="detail-kicker">SKILLS</div>
          <div className="skill-tags">{chosenSkills(job.skills).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
          {info}
        </div>
        <div className="selected-job-action">{action}</div>
      </div>
      <MoreJobDetails job={job} business={businessFor(job)} />
    </div>
  )
}
