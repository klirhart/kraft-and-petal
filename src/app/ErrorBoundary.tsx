import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  /** What to show instead. `reset` clears the error so the content can render again. */
  fallback: (error: Error, reset: () => void) => ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render errors below it. Details go to the console in development
 * only. Give it a `key` (e.g. the path) to start clean on navigation.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error(error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    return error ? this.props.fallback(error, () => this.setState({ error: null })) : this.props.children
  }
}

/** True when a lazy route file failed to download (offline, or a new deploy replaced it). */
export function isChunkLoadError(error: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  )
}
