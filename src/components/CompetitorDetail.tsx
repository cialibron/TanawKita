import { useState, type CSSProperties } from 'react'
import type { CompetitorPlace } from '../businessDirectory'
import type { VerificationStatus } from '../verification'
import { CATEGORY_STYLE, categoryLabel, estimatedFootprintMeters, yearsOpenLabel } from './businessCategoryStyle'

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: 'Verified',
  pending: 'Verification pending',
  rejected: 'Not verified',
  none: 'Not verified',
}

const PAY_UNIT: Record<string, string> = { day: 'day', hour: 'hour', task: 'task' }

// "08:00-17:00" -> minutes since midnight; null when the sheet value can't be read.
function parseHours(hours: string | undefined): { start: number; end: number } | null {
  const match = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(hours?.trim() ?? '')
  if (!match) return null
  const [, sh, sm, eh, em] = match.map(Number)
  return { start: sh * 60 + sm, end: eh * 60 + em }
}

function isOpenAt(range: { start: number; end: number }, minutes: number): boolean {
  return range.end > range.start
    ? minutes >= range.start && minutes < range.end
    : minutes >= range.start || minutes < range.end
}

function HoursBar({ hours }: { hours?: string }) {
  const range = parseHours(hours)
  if (!range) return <p className="muted">Hours not listed</p>
  const now = new Date()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const open = isOpenAt(range, minutes)
  const day = 24 * 60
  const left = (range.start / day) * 100
  const width = (((range.end - range.start + day) % day) / day) * 100
  return (
    <div className="cd-hours">
      <div className="cd-hours-top">
        <span>Store hours</span>
        <b className={open ? 'cd-open' : 'cd-closed'}>{open ? 'Open now' : 'Closed now'}</b>
      </div>
      <div className="cd-hours-track" aria-hidden="true">
        <span className="cd-hours-fill" style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
        {left + width > 100 && <span className="cd-hours-fill" style={{ left: 0, width: `${left + width - 100}%` }} />}
        <span className="cd-hours-now" style={{ left: `${(minutes / day) * 100}%` }} />
      </div>
      <div className="cd-hours-ends">
        <span>{hours?.split('-')[0]}</span>
        <span>{hours?.split('-')[1]}</span>
      </div>
    </div>
  )
}

// Detail card for a selected simulation business, shown in the map's lower detail panel.
export default function CompetitorDetail({ place }: { place: CompetitorPlace }) {
  const [tab, setTab] = useState<'overview' | 'hiring'>('overview')
  const style = CATEGORY_STYLE[place.category]
  const profile = place.profile
  const model = [profile.businessModel, profile.franchiseBrand].filter(Boolean).join(' · ')

  return (
    <div className="competitor-detail" style={{ '--cat': style.color } as CSSProperties}>
      <div className="cd-tabs" role="tablist" aria-label="Business details">
        <button type="button" role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button type="button" role="tab" aria-selected={tab === 'hiring'} className={tab === 'hiring' ? 'active' : ''} onClick={() => setTab('hiring')}>Hiring</button>
      </div>

      <div className="cd-heading">
        <h2>{place.name}</h2>
        <span className="cd-chip cd-chip-category">{style.glyph} {categoryLabel(place.category)}</span>
        <span className={`cd-chip cd-chip-${place.verificationStatus}`}>{VERIFICATION_LABEL[place.verificationStatus]}</span>
      </div>

      {tab === 'overview' ? (
        <div className="cd-grid">
          <div className="cd-photo-block">
            <div className="cd-photo" role="img" aria-label="No photo available">
              <span aria-hidden="true">{style.glyph}</span>
              <small>No photo yet</small>
            </div>
            <div className="cd-identity">
              <strong>{model || 'Independent'}</strong>
              <span>{place.address}{place.distanceKm !== undefined ? ` · ${place.distanceKm.toFixed(1)} km away` : ''}</span>
            </div>
          </div>

          <div className="cd-middle">
            <div className="cd-years">
              <span>Running for</span>
              <strong>{yearsOpenLabel(profile.yearsOperating).replace(/^Open /, '')}</strong>
            </div>
            <HoursBar hours={profile.businessHours} />
          </div>

          <div className="cd-stats">
            <div><span>Team size</span><strong>{profile.employeeCountRange ?? '—'} people</strong></div>
            <div><span>Branches in Davao</span><strong>{profile.branchesInDavao ?? 1}</strong></div>
            <div><span>Shaded area</span><strong>~{estimatedFootprintMeters(profile.employeeCountRange)} m wide</strong></div>
          </div>
        </div>
      ) : (
        <div className="cd-hiring">
          {profile.currentlyHiring ? (
            <>
              <div className="cd-stats cd-stats-row">
                <div><span>Open roles</span><strong>{profile.openRolesCount ?? 0}</strong></div>
                {profile.typicalPay !== undefined && (
                  <div><span>Typical pay</span><strong>₱{profile.typicalPay.toLocaleString()} / {PAY_UNIT[profile.payUnit ?? 'day']}</strong></div>
                )}
              </div>
              {!!profile.rolesHiring?.length && (
                <div className="skill-tags">{profile.rolesHiring.map((role) => <span key={role} className="tag">{role}</span>)}</div>
              )}
              {!!profile.skillsSought?.length && (
                <p className="muted">Skills wanted: {profile.skillsSought.join(', ')}</p>
              )}
            </>
          ) : (
            <p className="muted">Not hiring right now.</p>
          )}
        </div>
      )}

      <p className="advisor-synthetic-note">Fictional simulation business · approximate location · shaded area is a size estimate from team size, not a real lot</p>
    </div>
  )
}
