import { useEffect, useRef, type ReactNode } from 'react'
import { routeFocus } from '@/hooks/useRouteFocus'
import styles from './PageContainer.module.css'

export interface PageContainerProps {
  /** `narrow` keeps forms and long text to a readable line length. */
  width?: 'wide' | 'narrow'
  children: ReactNode
}

/** Centres page content with the standard gutters and section spacing. */
export function PageContainer({ width = 'wide', children }: PageContainerProps) {
  return <div className={`${styles.container} ${styles[width]}`}>{children}</div>
}

export interface PageHeaderProps {
  title: string
  /** One short sentence under the title. */
  lead?: ReactNode
  /** Controls that belong to the whole page, e.g. "Add product". */
  actions?: ReactNode
}

/**
 * The page `h1`. It can take focus (`tabindex="-1"`) so focus lands here
 * after a route change, including when the page finished loading late.
 */
export function PageTitle({
  children,
  className,
  focusOnMount = false,
}: {
  children: ReactNode
  className?: string
  /** For a view that replaces the page without a route change, e.g. the order confirmation. */
  focusOnMount?: boolean
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (focusOnMount) {
      headingRef.current?.focus()
      window.scrollTo(0, 0)
      return
    }
    if (!routeFocus.pending) return
    routeFocus.pending = false
    headingRef.current?.focus({ preventScroll: true })
  }, [focusOnMount])

  return (
    <h1 ref={headingRef} tabIndex={-1} className={[styles.title, className].filter(Boolean).join(' ')}>
      {children}
    </h1>
  )
}

/** Page title with an optional lead sentence and page-level actions. */
export function PageHeader({ title, lead, actions }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titles}>
        <PageTitle>{title}</PageTitle>
        {lead ? <p className={`type-body ${styles.lead}`}>{lead}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}

/** A titled part of a page. Keeps heading levels in order under the page `h1`. */
export function PageSection({
  title,
  action,
  children,
  id,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  id?: string
}) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.sectionHeader}>
        <h2 id={id}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
