// Labels for a jobseeker's applications, shared by My applications and the job detail panel.
import type { ApplicationStatus } from '../../types'

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
}

export const STATUS_TONE: Record<ApplicationStatus, string> = {
  applied: 'type',
  shortlisted: 'fair',
  hired: 'good',
}

export function appliedLabel(iso: string): string {
  const parsed = new Date(iso)
  return Number.isNaN(parsed.getTime()) ? iso : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
