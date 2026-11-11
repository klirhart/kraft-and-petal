import type { Ref } from 'react'
import { Alert } from './Alert'
import styles from './ErrorSummary.module.css'

export interface ErrorSummaryProps {
  /** One entry per invalid field: the id of its control and its message. */
  errors: { fieldId: string; message: string }[]
  ref?: Ref<HTMLDivElement>
}

/**
 * The summary shown at the top of a form with four or more fields after a
 * failed submit (guidelines 4.2.5). Each entry is a link that moves focus to
 * its field. Focus the summary through `ref` when it appears.
 */
export function ErrorSummary({ errors, ref }: ErrorSummaryProps) {
  if (errors.length === 0) return null
  return (
    <Alert
      variant="error"
      title={errors.length === 1 ? 'Check 1 field' : `Check ${errors.length} fields`}
      ref={ref}
      focusable
    >
      <ul className={styles.list}>
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a
              href={`#${error.fieldId}`}
              onClick={(event) => {
                event.preventDefault()
                document.getElementById(error.fieldId)?.focus()
              }}
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </Alert>
  )
}
