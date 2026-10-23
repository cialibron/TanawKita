import { useEffect, useRef } from 'react'
import { BrandEmblem } from '../components/Logo'

interface Props {
  // Done reading: go on to learn how the site works.
  onContinue: () => void
}

// First screen of the first-visit tutorial: a big welcome, a very short "how it works", and Continue.
export default function WelcomeTutorial({ onContinue }: Props) {
  const continueRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    continueRef.current?.focus()
  }, [])

  return (
    <div className="welcome-backdrop">
      <section className="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-how">
        <div className="welcome-body">
          <BrandEmblem height={84} />
          <h1 id="welcome-title">
            Welcome to <span>TanawKita</span>
          </h1>
          <p id="welcome-how" className="welcome-how">
            Find work close to home in Davao City. Jobseekers see nearby jobs on a map and apply with one skill card.
            Employers post jobs and see who is looking for work around them.
          </p>
          <p className="welcome-demo">Demo only: all businesses and people are sample data.</p>
        </div>

        <footer className="welcome-next">
          <p>Done reading? Press Continue to learn how the site works.</p>
          <button ref={continueRef} type="button" className="welcome-continue" onClick={onContinue}>
            Continue <span aria-hidden="true">→</span>
          </button>
        </footer>
      </section>
    </div>
  )
}
