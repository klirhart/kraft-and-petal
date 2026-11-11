import { useState, type KeyboardEvent } from 'react'
import { Icon } from './Icon'
import styles from './QuantityStepper.module.css'
import { Spinner } from './Spinner'

export interface QuantityStepperProps {
  /** The item being counted. Part of the accessible name. */
  itemName: string
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  /** Why the upper limit exists, e.g. "Only 4 left". Shown once the limit is reached. */
  maxReason?: string
  /** `sm` is for stock editing in the dashboard. */
  size?: 'md' | 'sm'
  disabled?: boolean
  /** The change is saving. The buttons stay usable. */
  loading?: boolean
  error?: string
}

/*
 * Guidelines 4.2.4. Tab order: decrease, field, increase. Arrow Up and Down
 * change the value by one; a typed value is checked on blur and corrected to
 * the nearest allowed number, with the reason announced. A button at its
 * limit keeps focus (`aria-disabled`) so focus is never lost.
 */
export function QuantityStepper({
  itemName,
  value,
  min = 1,
  max,
  onChange,
  maxReason,
  size = 'md',
  disabled = false,
  loading = false,
  error,
}: QuantityStepperProps) {
  // What is being typed, or null when the field simply shows the value.
  const [draft, setDraft] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [messageShown, setMessageShown] = useState(false)
  const upper = Math.max(min, max)

  function commit(next: number, announceCorrection: boolean) {
    const allowed = Math.max(min, Math.min(Math.trunc(next), upper))
    if (announceCorrection && allowed !== next) {
      setMessage(
        allowed === upper && maxReason
          ? `${maxReason}, so we set this to ${allowed}.`
          : `We set this to ${allowed}.`,
      )
      setMessageShown(true)
    } else if (allowed === upper && maxReason && allowed !== value) {
      setMessage(`${maxReason}.`)
      setMessageShown(true)
    } else {
      setMessage(allowed !== value ? `Quantity ${allowed}` : '')
      setMessageShown(false)
    }
    setDraft(null)
    if (allowed !== value) onChange(allowed)
  }

  function step(delta: number) {
    if (disabled) return
    const next = value + delta
    if (next < min) return
    if (next > upper) {
      if (maxReason) {
        setMessage(`${maxReason}.`)
        setMessageShown(true)
      }
      return
    }
    commit(next, false)
  }

  function handleBlur() {
    if (draft === null) return
    const typed = Number(draft)
    if (draft.trim() === '' || !Number.isFinite(typed)) {
      setDraft(null)
      return
    }
    commit(typed, true)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault()
      step(event.key === 'ArrowUp' ? 1 : -1)
    }
  }

  const atMin = value <= min
  const atMax = value >= upper

  return (
    <div className={styles.wrap}>
      <div className={styles.row}>
        <div
          className={`${styles.stepper} ${styles[size]}`}
          role="group"
          aria-label={`Quantity for ${itemName}`}
          aria-busy={loading || undefined}
          data-error={error ? true : undefined}
          data-disabled={disabled || undefined}
        >
          <button
            type="button"
            className={styles.button}
            onClick={() => step(-1)}
            aria-disabled={atMin || undefined}
            disabled={disabled}
          >
            <Icon name="minus" size="sm" />
            <span className="visually-hidden">Decrease quantity</span>
          </button>
          <input
            className={styles.value}
            type="number"
            inputMode="numeric"
            min={min}
            max={upper}
            step={1}
            value={draft ?? String(value)}
            aria-label={`Quantity for ${itemName}`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onWheel={(event) => event.currentTarget.blur()}
            disabled={disabled}
          />
          <button
            type="button"
            className={styles.button}
            onClick={() => step(1)}
            aria-disabled={atMax || undefined}
            disabled={disabled}
          >
            <Icon name="plus" size="sm" />
            <span className="visually-hidden">Increase quantity</span>
          </button>
        </div>
        {loading ? <Spinner size="sm" /> : null}
      </div>
      <p className={messageShown ? styles.message : 'visually-hidden'} aria-live="polite">
        {message}
      </p>
      {error ? (
        <p className={styles.error}>
          <Icon name="circle-alert" size="sm" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}
