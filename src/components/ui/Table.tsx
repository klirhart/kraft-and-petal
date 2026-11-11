import type { ReactNode } from 'react'
import styles from './Table.module.css'

export interface TableProps {
  /** Names the table. Read out as its caption and used to label the scroll region. */
  caption: string
  /** Shows the caption on screen as well. It is always there for screen readers. */
  captionVisible?: boolean
  busy?: boolean
  children: ReactNode
}

/*
 * Data table (guidelines 4.6), for dashboard data at `breakpoint.lg` and
 * wider. The container scrolls sideways when the table is wider than it and
 * is focusable so keyboard users can scroll it. Rows are never clickable:
 * only the links and controls inside them respond.
 */
export function Table({ caption, captionVisible = false, busy = false, children }: TableProps) {
  return (
    // Focusable on purpose, so keyboard users can scroll a table wider than its container.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div className={styles.region} role="region" aria-label={`${caption} table`} tabIndex={0}>
      <table className={styles.table} aria-busy={busy || undefined}>
        <caption className={captionVisible ? styles.caption : 'visually-hidden'}>{caption}</caption>
        {children}
      </table>
    </div>
  )
}

/** Class for a numeric or money cell: right-aligned, tabular numbers. */
export const numericCellClassName: string = styles.numeric ?? ''
