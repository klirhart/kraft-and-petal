import type { ReactNode, Ref } from 'react'
import styles from './Alert.module.css'
import { Icon, type IconName } from './Icon'

export type AlertVariant = 'error' | 'success' | 'warning'

const ICONS: Record<AlertVariant, IconName> = {
  error: 'circle-alert',
  success: 'circle-check',
  warning: 'warning',
}

export interface AlertProps {
  variant: AlertVariant
  title?: string
  children: ReactNode
  /** One action at most, e.g. a "Try again" button. */
  action?: ReactNode
  id?: string
  /** Pass a ref and `focusable` to move focus here after a failed submit. */
  ref?: Ref<HTMLDivElement>
  focusable?: boolean
  /** Set false for a message that is part of the page from the start. */
  live?: boolean
  className?: string
}

/**
 * Inline alert (guidelines 4.1). Stays until the problem is fixed or the
 * user dismisses it. Errors are announced at once, the others politely.
 */
export function Alert({
  variant,
  title,
  children,
  action,
  id,
  ref,
  focusable = false,
  live = true,
  className,
}: AlertProps) {
  const role = live ? (variant === 'error' ? 'alert' : 'status') : undefined
  return (
    <div
      id={id}
      ref={ref}
      className={[styles.alert, styles[variant], className].filter(Boolean).join(' ')}
      role={role}
      tabIndex={focusable ? -1 : undefined}
    >
      <Icon name={ICONS[variant]} className={styles.icon} />
      <div className={styles.text}>
        {title ? <p className={styles.title}>{title}</p> : null}
        <div className={styles.message}>{children}</div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
    </div>
  )
}
