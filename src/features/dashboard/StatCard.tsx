import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button, Card, Icon, Skeleton, cardControlClassName, stretchedLinkClassName } from '@/components/ui'
import styles from './dashboard.module.css'

export interface StatCardProps {
  label: string
  status: 'loading' | 'error' | 'ready'
  /** Already formatted. Never abbreviated. */
  value?: string
  /** A short line under the value, or an attention badge. */
  detail?: ReactNode
  link?: { to: string; label: string }
  /** Reloads this card only. */
  onRetry?: () => void
}

/*
 * Stat card (guidelines 4.3.4). Linked cards have one tab stop (the link,
 * stretched over the card) and lift on hover and focus. Loading keeps the
 * label and swaps value and detail for skeletons; error shows an en dash,
 * "Couldn't load" and a "Try again" that reloads this card alone.
 */
export function StatCard({ label, status, value, detail, link, onRetry }: StatCardProps) {
  return (
    <li className={styles.statItem}>
    <Card interactive={Boolean(link) && status === 'ready'} loading={status === 'loading'} className={styles.stat}>
      <h2 className={`type-ui ${styles.secondary}`}>{label}</h2>
      {status === 'loading' ? (
        <>
          <Skeleton shape="title" width="medium" />
          <Skeleton width="long" />
          <span className="visually-hidden">Loading {label.toLowerCase()}</span>
        </>
      ) : status === 'error' ? (
        <>
          <p className={`type-heading-2 ${styles.statValue}`}>
            <span aria-hidden="true">–</span>
          </p>
          <p className={`type-caption ${styles.statError}`}>
            <Icon name="circle-alert" size="sm" />
            Couldn&apos;t load
          </p>
          {onRetry ? (
            <Button variant="ghost" className={cardControlClassName} onClick={onRetry}>
              Try again
              <span className="visually-hidden">: {label.toLowerCase()}</span>
            </Button>
          ) : null}
        </>
      ) : (
        <>
          <p className={`type-heading-2 ${styles.statValue}`}>{value}</p>
          {detail ? <div className={`type-caption ${styles.secondary}`}>{detail}</div> : null}
          {link ? (
            <Link to={link.to} className={`type-ui-strong ${stretchedLinkClassName} ${styles.statLink}`}>
              {link.label}
            </Link>
          ) : null}
        </>
      )}
    </Card>
    </li>
  )
}
