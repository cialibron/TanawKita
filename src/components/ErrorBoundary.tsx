import { Component, type ReactNode } from 'react'
import { clearSavedState } from '../store'

interface State {
  error: Error | null
}

// Shows the error instead of a blank page, with a way out when saved data is bad.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="card">
        <h1>Something went wrong</h1>
        <p className="error">{this.state.error.message}</p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            clearSavedState()
            location.reload()
          }}
        >
          Reset demo data and reload
        </button>
      </div>
    )
  }
}
