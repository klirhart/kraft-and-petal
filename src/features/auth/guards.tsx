import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'
import { readNextPath, signInHref } from './next'

interface GuardProps {
  /** The route's loading state, shown while the session is being checked. */
  fallback: ReactNode
}

/*
 * Client guards. They keep people out of screens they cannot use and never
 * flash protected content, but they are a convenience only: the database
 * policies are what actually protect the data.
 */

/** Customer routes: a signed-out visitor goes to sign in and comes back afterwards. */
export function RequireSignedIn({ fallback }: GuardProps) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return fallback
  if (!auth.session) {
    return <Navigate to={signInHref(location.pathname + location.search)} replace />
  }
  return <Outlet />
}

/** /login and /signup: someone already signed in goes on to `next`, or home. */
export function GuestOnly({ fallback }: GuardProps) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return fallback
  if (auth.session) return <Navigate to={readNextPath(location.search)} replace />
  return <Outlet />
}

export interface RequireOperatorProps extends GuardProps {
  /** Shown to a signed-in customer. No dashboard data is requested. */
  notAllowed: ReactNode
  children: ReactNode
}

/** Operator routes. `children` (the dashboard) renders only for an operator. */
export function RequireOperator({ fallback, notAllowed, children }: RequireOperatorProps) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return fallback
  if (!auth.session) {
    return <Navigate to={signInHref(location.pathname + location.search)} replace />
  }
  if (!auth.isOperator) return notAllowed
  return children
}
