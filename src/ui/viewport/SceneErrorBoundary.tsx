import { Component, type ReactNode } from 'react'

/** Catches WebGL / three.js failures so the rest of the monitor keeps working. */
export class SceneErrorBoundary extends Component<
  { fallback: (message: string) => ReactNode; children: ReactNode },
  { message: string | null }
> {
  override state = { message: null as string | null }

  static getDerivedStateFromError(e: unknown) {
    return { message: e instanceof Error ? e.message : String(e) }
  }

  override render() {
    return this.state.message === null
      ? this.props.children
      : this.props.fallback(this.state.message)
  }
}
