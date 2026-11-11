import styles from './Spinner.module.css'

export interface SpinnerProps {
  size?: 'sm' | 'md'
  className?: string
}

/**
 * A ring in `currentColor`, one turn per `motion.duration.loop`. Decorative:
 * it must sit next to visible or visually hidden text that says what is loading.
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={[styles.spinner, styles[size], className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-spin=""
    >
      <circle className={styles.track} cx="12" cy="12" r="9" strokeWidth="3" />
      <path className={styles.arc} d="M12 3a9 9 0 0 1 9 9" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
