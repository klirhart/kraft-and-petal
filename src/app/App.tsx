import { ErrorState } from '@/components/ui'
import { ErrorBoundary } from './ErrorBoundary'
import { Providers } from './providers'
import { AppRouter } from './router'
import { BrowserRouter } from 'react-router'

/** Last-resort screen when the app shell itself fails. A reload starts clean. */
function AppError() {
  return (
    <BrowserRouter>
      <main id="main">
        <ErrorState variant="server" onRetry={() => window.location.reload()} />
      </main>
    </BrowserRouter>
  )
}

function renderAppError() {
  return <AppError />
}

export function App() {
  return (
    <ErrorBoundary fallback={renderAppError}>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  )
}
