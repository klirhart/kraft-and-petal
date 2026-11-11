import { useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { Alert, Button, Input, PasswordInput } from '@/components/ui'
import { useForm } from '@/hooks/useForm'
import { LIMITS } from '@/lib/config'
import { DataError } from '@/lib/errors'
import { validateSignUp, type SignUpValues } from '@/lib/validators'
import { useAuth } from './AuthProvider'
import styles from './auth.module.css'

function signUpFailure(error: unknown): string {
  if (error instanceof DataError) {
    if (error.code === 'email-taken') return 'There is already an account with that email. Sign in instead.'
    if (error.code === 'network') return 'You seem to be offline. Check your connection and try again.'
    if (error.code === 'invalid' && error.message) return error.message
  }
  return "Something went wrong on our side, so we couldn't create your account. Try again in a moment."
}

/** Account creation. New accounts are always customers: the role is set by the backend. */
export function SignUpForm() {
  const auth = useAuth()
  const location = useLocation()
  const form = useForm<SignUpValues>(
    { fullName: '', email: '', password: '' },
    validateSignUp,
  )
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState(false)
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
      const result = await auth.signUp(form.values)
      if (result.needsEmailConfirmation) {
        setConfirmEmail(true)
        setPending(false)
        requestAnimationFrame(() => alertRef.current?.focus())
      }
    } catch (error) {
      setFailure(signUpFailure(error))
      setPending(false)
      requestAnimationFrame(() => alertRef.current?.focus())
    }
  }

  if (confirmEmail) {
    return (
      <Alert variant="success" title="Check your email" ref={alertRef} focusable>
        We sent a link to {form.values.email}. Open it to finish creating your account, then{' '}
        <Link to={`/login${location.search}`}>sign in</Link>.
      </Alert>
    )
  }

  return (
    <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate aria-busy={pending || undefined}>
      {failure ? (
        <Alert variant="error" ref={alertRef} focusable id="sign-up-error">
          {failure}
        </Alert>
      ) : null}
      <Input {...form.field('fullName')} label="Full name" autoComplete="name" maxLength={LIMITS.fullName} />
      <Input
        {...form.field('email')}
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
      />
      <PasswordInput
        {...form.field('password')}
        label="Password"
        autoComplete="new-password"
        hint={`Use at least ${LIMITS.passwordMin} characters.`}
      />
      <Button
        type="submit"
        loading={pending}
        loadingLabel="Creating account"
        fullWidth
        aria-describedby={failure ? 'sign-up-error' : undefined}
      >
        Create account
      </Button>
      <p className="type-ui">
        Already have an account? <Link to={`/login${location.search}`}>Sign in</Link>
      </p>
    </form>
  )
}
