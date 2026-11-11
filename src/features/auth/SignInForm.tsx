import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { Alert, Button, Input, PasswordInput } from '@/components/ui'
import { useForm } from '@/hooks/useForm'
import { SHOP_CONFIG } from '@/lib/config'
import { DataError } from '@/lib/errors'
import { validateSignIn, type SignInValues } from '@/lib/validators'
import { useAuth } from './AuthProvider'
import styles from './auth.module.css'

function signInFailure(error: unknown): string {
  if (error instanceof DataError) {
    if (error.code === 'invalid-credentials') {
      return `That email and password don't match. Try again, or email ${SHOP_CONFIG.contact.email} for help.`
    }
    if (error.code === 'network') return 'You seem to be offline. Check your connection and try again.'
    if (error.code === 'invalid' && error.message) return error.message
  }
  return "Something went wrong on our side, so we couldn't sign you in. Try again in a moment."
}

/**
 * Email and password sign-in. No puzzle and no memory test: pasting and
 * password managers work. The guard on the page redirects once signed in.
 */
export function SignInForm() {
  const auth = useAuth()
  const location = useLocation()
  const form = useForm<SignInValues>({ email: '', password: '' }, validateSignIn)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const alertRef = useRef<HTMLDivElement>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const invalid = form.validateAll()
    if (invalid[0]) {
      document.getElementById(invalid[0].fieldId)?.focus()
      return
    }
    setPending(true)
    setFailure(null)
    try {
      await auth.signIn(form.values)
    } catch (error) {
      setFailure(signInFailure(error))
      setPending(false)
      requestAnimationFrame(() => alertRef.current?.focus())
    }
  }

  return (
    <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate aria-busy={pending || undefined}>
      {failure ? (
        <Alert variant="error" ref={alertRef} focusable id="sign-in-error">
          {failure}
        </Alert>
      ) : null}
      <Input
        {...form.field('email')}
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
      />
      <PasswordInput {...form.field('password')} label="Password" autoComplete="current-password" />
      <Button
        type="submit"
        loading={pending}
        loadingLabel="Signing in"
        fullWidth
        aria-describedby={failure ? 'sign-in-error' : undefined}
      >
        Sign in
      </Button>
      <p className="type-ui">
        New here? <Link to={`/signup${location.search}`}>Create an account</Link>
      </p>
    </form>
  )
}
