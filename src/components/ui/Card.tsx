import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Card.module.css'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'article' | 'li' | 'div' | 'section'
  /**
   * The card leads somewhere: put one title link with
   * `stretchedLinkClassName` inside and the whole card becomes its target.
   * Only an interactive card changes on hover.
   */
  interactive?: boolean
  /** Marks the card busy while its own content loads (e.g. a stat card). */
  loading?: boolean
  /** Removes the padding so media can sit flush with the edges. */
  flush?: boolean
  children?: ReactNode
}

/** Apply to the title link of an `interactive` card. Other controls sit above its click area. */
export const stretchedLinkClassName: string = styles.stretchedLink ?? ''

/** Apply to controls inside an `interactive` card so they stay clickable. */
export const cardControlClassName: string = styles.control ?? ''

/*
 * Guidelines 4.3. Fill muted, subtle border, `radius.sm`, no shadow at rest.
 * States: default, hover and active (interactive only), focus-visible (on
 * the control inside, plus `shadow.1` on the card), loading (`aria-busy`,
 * skeleton content). Disabled and error are shown by content (a badge, an
 * inline alert), never by dimming the card.
 */
export function Card({
  as: Tag = 'article',
  interactive = false,
  loading = false,
  flush = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [styles.card, interactive && styles.interactive, flush && styles.flush, className]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag {...rest} className={classes} aria-busy={loading || undefined}>
      {children}
    </Tag>
  )
}
