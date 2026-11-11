import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { data } from '@/lib/data'
import type { Credentials, Session, SignUpInput, SignUpResult } from '@/types'

export interface AuthContextValue {
  /** `loading` until the saved session has been checked. */
  status: 'loading' | 'ready'
  session: Session | null
  isOperator: boolean
  signIn: (credentials: Credentials) => Promise<Session>
  signUp: (input: SignUpInput) => Promise<SignUpResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Holds the session for the whole app. The role shown here only decides
 * what the interface offers; what an account may read or change is decided
 * by the backend (Row Level Security).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: 'loading' | 'ready'; session: Session | null }>({
    status: 'loading',
    session: null,
  })

  useEffect(() => {
    let active = true
    data.auth.getSession().then(
      (session) => active && setState({ status: 'ready', session }),
      // A failed session check falls back to signed out. Navigation never shows an error.
      () => active && setState({ status: 'ready', session: null }),
    )
    const unsubscribe = data.auth.onSessionChange((session) => {
      if (active) setState({ status: 'ready', session })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (credentials: Credentials) => {
    const session = await data.auth.signIn(credentials)
    setState({ status: 'ready', session })
    return session
  }, [])

  const signUp = useCallback(async (input: SignUpInput) => {
    const result = await data.auth.signUp(input)
    if (result.session) setState({ status: 'ready', session: result.session })
    return result
  }, [])

  const signOut = useCallback(async () => {
    await data.auth.signOut()
    setState({ status: 'ready', session: null })
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isOperator: state.session?.profile.role === 'operator',
      signIn,
      signUp,
      signOut,
    }),
    [state, signIn, signUp, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
