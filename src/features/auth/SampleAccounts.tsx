import { useState } from 'react'
import { Alert, Button } from '@/components/ui'
import { useAsyncData } from '@/hooks/useAsyncData'
import { data } from '@/lib/data'
import { friendlyMessage } from '@/lib/errors'
import type { SampleAccount } from '@/types'
import { useAuth } from './AuthProvider'
import styles from './auth.module.css'

/**
 * Ready-made sign-ins, listed only while the app runs on sample data. The
 * backend returns none when Supabase is active, and then nothing renders.
 */
export function SampleAccounts() {
  const auth = useAuth()
  const accounts = useAsyncData('sample-accounts', () => data.auth.listSampleAccounts())
  const [pending, setPending] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  if (accounts.status !== 'success' || accounts.data.length === 0) return null

  async function signInAs(account: SampleAccount) {
    if (pending) return
    setPending(account.email)
    setFailure(null)
    try {
      await auth.signIn({ email: account.email, password: account.password })
    } catch (error) {
      setFailure(friendlyMessage(error))
      setPending(null)
    }
  }

  return (
    <section className={styles.samples} aria-labelledby="sample-accounts-title">
      <h2 id="sample-accounts-title" className="type-heading-3">
        Try a sample account
      </h2>
      <p className={`type-ui ${styles.secondary}`}>
        This shop is running on sample data kept in your browser. Nothing here is a real order.
      </p>
      {failure ? <Alert variant="error">{failure}</Alert> : null}
      <ul className={styles.sampleList}>
        {accounts.data.map((account) => (
          <li key={account.email} className={styles.sample}>
            <div className={styles.sampleText}>
              <p className="type-ui-strong">
                {account.fullName}, {account.role === 'operator' ? 'shop staff' : 'customer'}
              </p>
              <p className={`type-caption ${styles.secondary}`}>
                {account.email} · password {account.password}
              </p>
            </div>
            <Button
              variant="secondary"
              loading={pending === account.email}
              loadingLabel="Signing in"
              onClick={() => void signInAs(account)}
            >
              Sign in as {account.fullName.split(' ')[0]}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
