import { Component, type ReactNode } from 'react'

type GardenErrorBoundaryProps = { children: ReactNode }
type GardenErrorBoundaryState = { hasFailed: boolean }

export class GardenErrorBoundary extends Component<
  GardenErrorBoundaryProps,
  GardenErrorBoundaryState
> {
  state: GardenErrorBoundaryState = { hasFailed: false }

  static getDerivedStateFromError(): GardenErrorBoundaryState {
    return { hasFailed: true }
  }

  render() {
    if (!this.state.hasFailed) return this.props.children

    return (
      <div className="garden-failed" role="alert">
        <p>The garden couldn't open its storage on this device.</p>
        <button onClick={() => this.setState({ hasFailed: false })}>
          Try again
        </button>
      </div>
    )
  }
}
