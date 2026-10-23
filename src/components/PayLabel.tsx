import type { JobPost } from '../types'

// "₱500 / day", or "₱500 / task (pakyaw)" with the Filipino word marked, so screen readers say it in Filipino.
export default function PayLabel({ job }: { job: JobPost }) {
  const amount = `₱${job.payAmount.toLocaleString()} / `
  if (job.payUnit !== 'task') return <>{amount + job.payUnit}</>
  return (
    <>
      {amount}task (<span lang="fil">pakyaw</span>)
    </>
  )
}
