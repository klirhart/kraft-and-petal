import { formatPrice } from '@/lib/formatters'
import styles from './checkout.module.css'

export interface OrderReviewLine {
  id: string
  name: string
  quantity: number
  lineTotalCents: number
  image: React.ReactNode
}

export interface OrderReviewProps {
  lines: OrderReviewLine[]
  subtotalCents: number
}

/** Read-only line items and totals, shown next to the "Place order" button. */
export function OrderReview({ lines, subtotalCents }: OrderReviewProps) {
  return (
    <div className={styles.review}>
      <ul className={styles.reviewLines}>
        {lines.map((line) => (
          <li key={line.id} className={styles.reviewLine}>
            <div className={styles.thumb}>{line.image}</div>
            <p className={`type-ui-strong ${styles.reviewName}`}>
              {line.name} <span className={styles.secondary}>× {line.quantity}</span>
            </p>
            <p className={`type-ui-strong ${styles.numbers}`}>{formatPrice(line.lineTotalCents)}</p>
          </li>
        ))}
      </ul>
      <dl className={styles.totals}>
        <div className={styles.totalRow}>
          <dt className="type-ui">Subtotal</dt>
          <dd className={`type-ui ${styles.numbers}`}>{formatPrice(subtotalCents)}</dd>
        </div>
        <div className={styles.totalRow}>
          <dt className="type-ui">Delivery</dt>
          <dd className="type-ui">Free, by hand</dd>
        </div>
        <div className={styles.totalRow}>
          <dt className="type-ui-strong">Total</dt>
          <dd className={`type-ui-strong ${styles.numbers}`}>{formatPrice(subtotalCents)}</dd>
        </div>
      </dl>
    </div>
  )
}
