import { useState, type ReactNode } from 'react'
import JobDetail from '../../components/JobDetail'
import JobMap from '../../components/JobMap'
import MapShell, { type WorkspaceNavItem } from '../../components/MapShell'
import { jobPins } from '../../components/jobPins'
import { useStore } from '../../store'
import type { View } from '../../types'

const STATUS_TEXT = {
  verified: '✓ Verified employer',
  pending: 'Verification pending review',
  rejected: 'Verification rejected',
  none: 'Not verified yet',
} as const

interface Props {
  view: View
  onViewChange: (view: View) => void
  navigation: WorkspaceNavItem[]
  activeNavigation: string
  onNavigationChange: (id: string) => void
  panel: ReactNode
}

// PESO admin workspace: every open job on the shared map, pinned the same way as the jobseeker job map (business
// callouts over glowing circles, pay tags for jobs away from their business). Selecting one opens the detail panel.
export default function PesoWorkspace({ view, onViewChange, navigation, activeNavigation, onNavigationChange, panel }: Props) {
  const { state } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(true)
  const openJobs = state.jobs.filter((job) => job.status === 'open')
  const { jobsAtBusiness, mapJobs, businessPlaces } = jobPins(openJobs)
  const selectedEmployerId = jobsAtBusiness.find((job) => job.id === selectedId)?.employerId ?? null
  const selected = openJobs.find((job) => job.id === selectedId)

  const selectBusiness = (placeId: string) => {
    const job = jobsAtBusiness.find((item) => item.employerId === placeId)
    if (job) setSelectedId(job.id)
  }

  const verification = selected && state.verifications[selected.employerId]
  const applications = selected ? state.applications.filter((a) => a.jobId === selected.id) : []
  const detail = selected && (
    <JobDetail
      job={selected}
      kicker="SELECTED JOB POST"
      onClose={() => setSelectedId(null)}
      info={<p className="muted">{STATUS_TEXT[verification?.status ?? 'none']}</p>}
      action={
        <>
          <span className="ok">
            {applications.length} {applications.length === 1 ? 'application' : 'applications'}
          </span>
          <span className="muted">{applications.filter((a) => a.status === 'hired').length} hired</span>
          {verification?.status === 'pending' && (
            <button type="button" className="primary" onClick={() => onNavigationChange('verifications')}>
              Review verification
            </button>
          )}
        </>
      }
    />
  )

  return (
    <MapShell
      navigation={navigation}
      activeNavigation={activeNavigation}
      onNavigationChange={onNavigationChange}
      view={view}
      onViewChange={onViewChange}
      panelOpen={panelOpen}
      onPanelOpenChange={setPanelOpen}
      detail={detail}
      map={
        <JobMap
          fill
          jobs={mapJobs}
          selectedId={selectedId}
          onSelect={setSelectedId}
          places={businessPlaces}
          selectedPlaceId={selectedEmployerId}
          onPlaceSelect={selectBusiness}
        />
      }
      panel={panel}
    />
  )
}
