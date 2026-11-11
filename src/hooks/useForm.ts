import { useCallback, useId, useMemo, useState } from 'react'
import type { FieldErrors } from '@/lib/validators'

export interface FormField {
  id: string
  name: string
  value: string
  error: string | undefined
  onChange: (event: { target: { value: string } }) => void
  onBlur: () => void
}

export interface Form<T extends { [K in keyof T]: string }> {
  values: T
  /** Errors currently shown: only fields that were left or submitted. */
  errors: FieldErrors<keyof T & string>
  /** Props for one field: id, value, error and the change and blur handlers. */
  field: (name: keyof T & string) => FormField
  setValue: (name: keyof T & string, value: string) => void
  setValues: (values: T) => void
  /**
   * Shows every error. Resolves the errors found, in field order, so the
   * caller can focus the first invalid field or the error summary.
   */
  validateAll: () => { fieldId: string; name: keyof T & string; message: string }[]
  /** The errors currently shown, in field order, each with the id of its control. */
  errorList: { fieldId: string; message: string }[]
  /** True once any value differs from the starting values. */
  isDirty: boolean
  fieldId: (name: keyof T & string) => string
}

/**
 * Form state with the validation timing from guidelines 4.2.5: a field is
 * checked when it loses focus and on submit, never while it is first being
 * typed in, and once it shows an error it re-checks on every change.
 */
export function useForm<T extends { [K in keyof T]: string }>(
  initial: T,
  validate: (values: T) => FieldErrors<keyof T & string>,
): Form<T> {
  const formId = useId()
  const [start] = useState<T>(initial)
  const [values, setAll] = useState<T>(initial)
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set())

  const fieldId = useCallback((name: keyof T & string) => `${formId}-${name}`, [formId])

  const allErrors = useMemo(() => validate(values), [validate, values])
  const errors = useMemo(() => {
    const visible: FieldErrors<keyof T & string> = {}
    for (const name of Object.keys(allErrors) as (keyof T & string)[]) {
      if (shown.has(name)) visible[name] = allErrors[name]
    }
    return visible
  }, [allErrors, shown])

  const setValue = useCallback((name: keyof T & string, value: string) => {
    setAll((current) => ({ ...current, [name]: value }))
  }, [])

  const setValues = useCallback((next: T) => setAll(next), [])

  const field = useCallback(
    (name: keyof T & string): FormField => ({
      id: fieldId(name),
      name,
      value: values[name] ?? '',
      error: errors[name],
      onChange: (event) => setValue(name, event.target.value),
      onBlur: () => setShown((current) => (current.has(name) ? current : new Set(current).add(name))),
    }),
    [errors, fieldId, setValue, values],
  )

  const validateAll = useCallback(() => {
    const found = validate(values)
    setShown(new Set(Object.keys(values)))
    return (Object.keys(values) as (keyof T & string)[])
      .filter((name) => found[name])
      .map((name) => ({ fieldId: fieldId(name), name, message: found[name] ?? '' }))
  }, [fieldId, validate, values])

  const isDirty = useMemo(
    () => (Object.keys(values) as (keyof T & string)[]).some((name) => values[name] !== start[name]),
    [values, start],
  )

  const errorList = useMemo(
    () =>
      (Object.keys(values) as (keyof T & string)[])
        .filter((name) => errors[name])
        .map((name) => ({ fieldId: fieldId(name), message: errors[name] ?? '' })),
    [values, errors, fieldId],
  )

  return { values, errors, errorList, field, setValue, setValues, validateAll, isDirty, fieldId }
}
