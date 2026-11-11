import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { EmptyVaseArt, NotFoundArt, WiltedFlowerArt } from '@/components/illustrations/Scenes'
import { Button } from './Button'
import { Icon } from './Icon'
import styles from './StateBlocks.module.css'

/*
 * The three route-level blocks (guidelines 4.11). They are the only way a
 * route shows that it is loading, failed or empty.
 */

const SHOW_AFTER_MS = 200
const SLOW_AFTER_MS = 10_000

export interface LoadingStateProps {
  /** Says what is loading, e.g. "Loading the shop". Read by screen readers. */
  label: string
  /** Skeletons in the layout of the real content. */
  children: ReactNode
  /** Offered once loading has taken longer than ten seconds. */
  onRetry?: () => void
}

/**
 * Loading block. Shows nothing for the first moment so quick loads do not
 * flash, then skeletons, then after ten seconds a visible note and a retry.
 * The page marks `<main>` busy through `PageContainer`.
 */
export function LoadingState({ label, children, onRetry }: LoadingStateProps) {
  const [phase, setPhase] = useState<'waiting' | 'shown' | 'slow'>('waiting')
  const rootRef = useRef<HTMLDivElement>(null)

  // The page's <main> is busy for as long as a loading block is inside it.
  useEffect(() => {
    const main = rootRef.current?.closest('main')
    main?.setAttribute('aria-busy', 'true')
    return () => main?.removeAttribute('aria-busy')
  }, [])

  useEffect(() => {
    const show = setTimeout(() => setPhase('shown'), SHOW_AFTER_MS)
    const slow = setTimeout(() => setPhase('slow'), SLOW_AFTER_MS)
    return () => {
      clearTimeout(show)
      clearTimeout(slow)
    }
  }, [])

  return (
    <div className={styles.loading} ref={rootRef}>
      <p className="visually-hidden" role="status">
        {label}
      </p>
      {phase === 'waiting' ? null : children}
      {phase === 'slow' ? (
        <div className={styles.slow}>
          <p className="type-ui">This is taking longer than usual.</p>
          {onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export type ErrorVariant = 'not-found' | 'not-allowed' | 'offline' | 'server'

const ERROR_COPY: Record<ErrorVariant, { heading: string; message: string }> = {
  'not-found': {
    heading: "We can't find that page",
    message: 'It may have moved, or the link may be out of date.',
  },
  'not-allowed': {
    heading: 'This page is for shop staff',
    message: "Your account can't open it. Everything in the shop is still yours to browse.",
  },
  offline: {
    heading: 'You seem to be offline',
    message: 'Check your connection and try again.',
  },
  server: {
    heading: 'Something went wrong on our side',
    message: 'Your cart is safe. Try again in a moment.',
  },
}

export interface ErrorStateProps {
  variant: ErrorVariant
  /** Replaces the standard sentence. Never pass a raw error message. */
  message?: string
  /** Shows a "Try again" button. It shows its loading state while retrying. */
  onRetry?: () => void | Promise<void>
  /** Where the standalone link goes. Defaults to the shop. */
  link?: { to: string; label: string }
  /** Heading level. Use 2 when the page keeps its own h1 above the block. */
  headingLevel?: 1 | 2
}

/** Error block. Takes focus on its heading when it replaces the page content. */
export function ErrorState({
  variant,
  message,
  onRetry,
  link = { to: '/shop', label: 'Back to the shop' },
  headingLevel = 1,
}: ErrorStateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [retrying, setRetrying] = useState(false)
  const copy = ERROR_COPY[variant]
  const Heading = headingLevel === 1 ? 'h1' : 'h2'

  // Focus the heading when the block appears, and again after a failed retry.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function retry() {
    if (!onRetry || retrying) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
      headingRef.current?.focus()
    }
  }

  return (
    <div className={styles.block}>
      {variant === 'not-found' ? (
        <NotFoundArt className={styles.artWide} />
      ) : (
        <WiltedFlowerArt className={styles.art} />
      )}
      <Heading ref={headingRef} tabIndex={-1} className={`type-heading-2 ${styles.heading}`}>
        {copy.heading}
      </Heading>
      <p className={`type-body ${styles.message}`}>{message ?? copy.message}</p>
      <div className={styles.actions}>
        {onRetry ? (
          <Button onClick={() => void retry()} loading={retrying} loadingLabel="Trying again">
            Try again
          </Button>
        ) : null}
        {variant === 'server' ? (
          <Link to="/contact" className="link-standalone">
            Contact us
          </Link>
        ) : (
          <Link to={link.to} className="link-standalone">
            {link.label}
            <Icon name="arrow-right" size="sm" />
          </Link>
        )}
      </div>
    </div>
  )
}

export interface EmptyStateProps {
  heading: string
  /** One sentence: what will appear here, or how to start. */
  message: string
  /** One action: a primary button or a standalone link. */
  action?: ReactNode
  headingLevel?: 2 | 3
  /** Moves focus to the heading, e.g. after the last cart line is removed. */
  headingRef?: React.Ref<HTMLHeadingElement>
  art?: ReactNode
}

/** Empty block on a soft card. Empty is not an error. */
export function EmptyState({
  heading,
  message,
  action,
  headingLevel = 2,
  headingRef,
  art,
}: EmptyStateProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div className={`${styles.block} ${styles.empty}`}>
      {art ?? <EmptyVaseArt className={styles.art} />}
      <Heading ref={headingRef} tabIndex={-1} className={`type-heading-3 ${styles.heading}`}>
        {heading}
      </Heading>
      <p className={`type-body ${styles.message}`}>{message}</p>
      {action ? <div className={styles.actions}>{action}</div> : null}
    </div>
  )
}

/** Class for the drawing passed to `EmptyState` through `art`. */
export const stateArtClassName: string = styles.art ?? ''
