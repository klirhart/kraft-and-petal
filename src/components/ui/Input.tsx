import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Icon } from './Icon'
import styles from './Input.module.css'
import { Spinner } from './Spinner'

/*
 * Form controls (guidelines 4.2). Every control has a visible label tied to
 * it; fields are required unless `optional` adds "(optional)" to the label.
 * Error text comes before helper text, and the control points to both with
 * `aria-describedby`.
 *
 * States: default, hover, focus-visible, active, disabled, loading, error.
 */

interface FieldProps {
  label: string
  /** Adds "(optional)" to the label and drops the `required` attribute. */
  optional?: boolean
  /** Helper text: the rule before the user needs it. */
  hint?: ReactNode
  /** Sets the error state. Say what to enter and how to fix it. */
  error?: string
  /** Saving or checking: shows a spinner and marks the field busy. */
  loading?: boolean
  loadingLabel?: string
  className?: string
}

function describedBy(id: string, error?: string, hint?: ReactNode, extra?: string) {
  return (
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null, extra ?? null]
      .filter(Boolean)
      .join(' ') || undefined
  )
}

function FieldShell({
  id,
  label,
  optional,
  hint,
  error,
  loading,
  loadingLabel = 'Saving',
  disabled,
  className,
  counter,
  children,
}: FieldProps & { id: string; disabled?: boolean; counter?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={[styles.field, className].filter(Boolean).join(' ')}
      aria-busy={loading || undefined}
      data-disabled={disabled || undefined}
    >
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional ? <span className={styles.optional}> (optional)</span> : null}
      </label>
      <div className={styles.control}>
        {children}
        {loading ? (
          <span className={styles.trailing}>
            <Spinner size="sm" />
            <span className="visually-hidden">{loadingLabel}</span>
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          <Icon name="circle-alert" size="sm" />
          <span>{error}</span>
        </p>
      ) : null}
      {hint || counter ? (
        <div className={styles.below}>
          {hint ? (
            <p id={`${id}-hint`} className={styles.hint}>
              {hint}
            </p>
          ) : null}
          {counter}
        </div>
      ) : null}
    </div>
  )
}

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>, FieldProps {
  /** Decoration inside the leading edge, e.g. the currency symbol. */
  adornment?: ReactNode
  /** Sizes the field to a known length, e.g. a postal code. */
  width?: 'full' | 'short'
  ref?: Ref<HTMLInputElement>
}

export function Input({
  label,
  optional,
  hint,
  error,
  loading,
  loadingLabel,
  className,
  adornment,
  width = 'full',
  ref,
  ...rest
}: InputProps) {
  const generated = useId()
  const id = rest.id ?? generated
  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      loading={loading}
      loadingLabel={loadingLabel}
      disabled={rest.disabled}
      className={[className, width === 'short' && styles.short].filter(Boolean).join(' ')}
    >
      {adornment ? <span className={styles.adornment}>{adornment}</span> : null}
      <input
        {...rest}
        ref={ref}
        id={id}
        className={styles.input}
        data-adorned={adornment ? true : undefined}
        required={rest.required ?? !optional}
        readOnly={rest.readOnly || loading}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint, rest['aria-describedby'])}
      />
    </FieldShell>
  )
}

export type PasswordInputProps = Omit<InputProps, 'type' | 'adornment'>

/** Password field with a show or hide button. Paste and password managers work. */
export function PasswordInput({
  label,
  optional,
  hint,
  error,
  loading,
  loadingLabel,
  className,
  ref,
  ...rest
}: PasswordInputProps) {
  const generated = useId()
  const id = rest.id ?? generated
  const [shown, setShown] = useState(false)
  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      loading={loading}
      loadingLabel={loadingLabel}
      disabled={rest.disabled}
      className={className}
    >
      <input
        {...rest}
        ref={ref}
        id={id}
        type={shown ? 'text' : 'password'}
        className={styles.input}
        data-toggle=""
        required={rest.required ?? !optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint, rest['aria-describedby'])}
      />
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={shown}
        onClick={() => setShown((value) => !value)}
        disabled={rest.disabled}
      >
        <Icon name={shown ? 'eye-off' : 'eye'} />
        <span className="visually-hidden">Show password</span>
      </button>
    </FieldShell>
  )
}

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>, FieldProps {
  ref?: Ref<HTMLTextAreaElement>
}

/** With `maxLength`, shows a counter such as "120 / 500" and announces when 20 or fewer remain. */
export function Textarea({
  label,
  optional,
  hint,
  error,
  loading,
  loadingLabel,
  className,
  ref,
  ...rest
}: TextareaProps) {
  const generated = useId()
  const id = rest.id ?? generated
  const length = typeof rest.value === 'string' ? rest.value.length : 0
  const max = rest.maxLength
  const remaining = max !== undefined ? max - length : null
  const counter =
    max !== undefined ? (
      <p className={styles.counter}>
        <span aria-hidden="true">
          {length} / {max}
        </span>
        <span className="visually-hidden" aria-live="polite">
          {remaining !== null && remaining <= 20 ? `${remaining} characters left` : ''}
        </span>
      </p>
    ) : null
  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      loading={loading}
      loadingLabel={loadingLabel}
      disabled={rest.disabled}
      className={className}
      counter={counter}
    >
      <textarea
        {...rest}
        ref={ref}
        id={id}
        className={`${styles.input} ${styles.textarea}`}
        required={rest.required ?? !optional}
        readOnly={rest.readOnly || loading}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint, rest['aria-describedby'])}
      />
    </FieldShell>
  )
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>, FieldProps {
  ref?: Ref<HTMLSelectElement>
}

/** Always a native `<select>`. With no sensible default, start with a prompt option. */
export function Select({
  label,
  optional,
  hint,
  error,
  loading,
  loadingLabel,
  className,
  children,
  ref,
  ...rest
}: SelectProps) {
  const generated = useId()
  const id = rest.id ?? generated
  return (
    <FieldShell
      id={id}
      label={label}
      optional={optional}
      hint={hint}
      error={error}
      loading={loading}
      loadingLabel={loadingLabel}
      disabled={rest.disabled}
      className={className}
    >
      <select
        {...rest}
        ref={ref}
        id={id}
        className={`${styles.input} ${styles.select}`}
        required={rest.required ?? !optional}
        disabled={rest.disabled || loading}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint, rest['aria-describedby'])}
      >
        {children}
      </select>
      {loading ? null : (
        <span className={styles.trailing}>
          <Icon name="chevron-down" size="sm" />
        </span>
      )}
    </FieldShell>
  )
}

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> {
  label: string
  hint?: ReactNode
  error?: string
  loading?: boolean
  className?: string
}

/** Native checkbox with its label to the right. The whole row is the target. */
export function Checkbox({ label, hint, error, loading, className, ...rest }: CheckboxProps) {
  const generated = useId()
  const id = rest.id ?? generated
  return (
    <div className={[styles.choiceField, className].filter(Boolean).join(' ')}>
      <label className={styles.choice} data-disabled={rest.disabled || undefined}>
        <input
          {...rest}
          id={id}
          type="checkbox"
          className={styles.checkbox}
          aria-invalid={error ? true : undefined}
          aria-busy={loading || undefined}
          aria-describedby={describedBy(id, error, hint)}
          onChange={loading ? undefined : rest.onChange}
          readOnly={loading}
        />
        <span>{label}</span>
        {loading ? <Spinner size="sm" /> : null}
      </label>
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          <Icon name="circle-alert" size="sm" />
          <span>{error}</span>
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export interface RadioGroupProps<T extends string> {
  legend: string
  name: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
  hint?: ReactNode
}

/** Radios in a fieldset with a legend. Tab reaches the group once; arrows move and select. */
export function RadioGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  disabled,
  hint,
}: RadioGroupProps<T>) {
  const hintId = useId()
  return (
    <fieldset className={styles.group} aria-describedby={hint ? hintId : undefined}>
      <legend className={styles.label}>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className={styles.choice} data-disabled={disabled || undefined}>
          <input
            type="radio"
            className={styles.radio}
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
          />
          <span>{option.label}</span>
        </label>
      ))}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </fieldset>
  )
}
