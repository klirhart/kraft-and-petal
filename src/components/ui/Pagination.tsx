import { Button } from './Button'
import styles from './Pagination.module.css'

export interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  /** Names what is being paged, e.g. "Products". */
  label: string
}

/** "Previous" and "Next" with "Page 2 of 7". Renders nothing for a single page. */
export function Pagination({ page, pageCount, onPageChange, label }: PaginationProps) {
  if (pageCount <= 1) return null
  const atStart = page <= 1
  const atEnd = page >= pageCount
  return (
    <nav className={styles.pagination} aria-label={`${label} pages`}>
      <Button
        variant="secondary"
        aria-disabled={atStart || undefined}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <p className={`type-ui ${styles.status}`} role="status">
        Page {page} of {pageCount}
      </p>
      <Button variant="secondary" aria-disabled={atEnd || undefined} onClick={() => onPageChange(page + 1)}>
        Next
      </Button>
    </nav>
  )
}

/** The slice of `items` shown on `page`, and the page count. */
export function paginate<T>(items: T[], page: number, pageSize: number): { rows: T[]; pageCount: number; page: number } {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  return { rows: items.slice((current - 1) * pageSize, current * pageSize), pageCount, page: current }
}
