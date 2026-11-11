import type { ReactNode } from 'react'
import styles from './Badge.module.css'
import { Icon, type IconName } from './Icon'

export type BadgeVariant = 'neutral' | 'positive' | 'attention' | 'negative'

export interface BadgeProps {
  variant?: BadgeVariant
  icon?: IconName
  children: ReactNode
}

/** Status label (guidelines 4.1). The text carries the meaning; colour only supports it. */
export function Badge({ variant = 'neutral', icon, children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {icon ? <Icon name={icon} size="sm" /> : null}
      {children}
    </span>
  )
}
