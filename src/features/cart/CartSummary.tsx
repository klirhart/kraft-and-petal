import { useId, useState } from 'react'
import { Alert, Button, ButtonLink, Icon, Skeleton, Textarea } from '@/components/ui'
import { LIMITS } from '@/lib/config'
import { formatPrice } from '@/lib/formatters'
import { readSavedDelivery, saveDelivery } from '@/lib/savedDelivery'
import styles from './cart.module.css'
import type { CartDetails } from './useCartDetails'

export interface CartSummaryProps {
  details: CartDetails
  /** The drawer also offers "View cart". The cart page does not link to itself. */
  showViewCart?: boolean
  /**
   * The drawer shows the two halves apart: `totals` (subtotal and the order
   * note) scrolls with the lines, `actions` (checkout and the trust line)
   * stays in view at the bottom. The cart page shows both together.
   */
  part?: 'all' | 'totals' | 'actions'
}

/**
 * A note for the shop, written in the cart. It is kept with the delivery
 * details for this browser tab, so the checkout form opens with it filled in
 * and the order carries it. Nothing is sent until the order is placed.
 */
function OrderNote() {
  const [note, setNote] = useState(() => readSavedDelivery().note)
  // Open from the start when a note is already written.
  const [startsOpen] = useState(() => note.length > 0)

  function change(value: string) {
    setNote(value)
    saveDelivery({ ...readSavedDelivery(), note: value })
  }

  return (
    <details className={styles.note} open={startsOpen || undefined}>
      <summary className={styles.noteSummary}>
        <Icon name="chevron-down" size="sm" className={styles.noteChevron} />
        Add a note to your order
      </summary>
      <Textarea
        label="Note for the florist"
        optional
        hint="A message for the card, or where to leave the order. You can change it at checkout."
        value={note}
        maxLength={LIMITS.orderNote}
        rows={3}
        onChange={(event) => change(event.target.value)}
      />
    </details>
  )
}

/** Subtotal, the order note, the checkout actions and one line of reassurance. */
export function CartSummary({ details, showViewCart = false, part = 'all' }: CartSummaryProps) {
  const reasonId = useId()
  const loading = details.status === 'loading'
  const totals = (
    <>
      <div className={styles.summary}>
        <dl>
          <div className={styles.summaryRow}>
            <dt className="type-title">Subtotal</dt>
            <dd className={`type-title ${styles.numbers}`}>
              {loading ? <Skeleton shape="text" className={styles.amountSkeleton} /> : formatPrice(details.subtotalCents)}
            </dd>
          </div>
        </dl>
        <p className={`type-caption ${styles.secondary}`}>Delivery is worked out at checkout.</p>
      </div>
      <OrderNote />
    </>
  )
  if (part === 'totals') return <div className={styles.summaryBlock}>{totals}</div>
  return (
    <div className={styles.summaryBlock}>
      {part === 'all' ? totals : null}
      {details.blockedReason ? (
        <Alert variant="warning" id={reasonId}>
          {details.blockedReason}
        </Alert>
      ) : null}
      <div className={styles.actions}>
        {details.blockedReason || loading ? (
          <Button fullWidth aria-disabled="true" aria-describedby={details.blockedReason ? reasonId : undefined}>
            Checkout
          </Button>
        ) : (
          <ButtonLink to="/checkout" fullWidth>
            Checkout
          </ButtonLink>
        )}
        {showViewCart ? (
          <ButtonLink to="/cart" variant="secondary" fullWidth>
            View cart
          </ButtonLink>
        ) : null}
      </div>
      <p className={`type-caption ${styles.trust}`}>
        <Icon name="badge-check" size="sm" />
        <span>Every order is wrapped by hand on the day it leaves the shop.</span>
      </p>
    </div>
  )
}
