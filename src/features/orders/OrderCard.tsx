import { useId, useRef, useState } from 'react'
import { Alert, Button, Card, Icon, Modal, Select, Skeleton, useToast } from '@/components/ui'
import { friendlyMessage } from '@/lib/errors'
import {
  formatDate,
  formatDateTime,
  formatOrderNumber,
  formatOrderStatus,
  formatPrice,
} from '@/lib/formatters'
import { CLOSED_ORDER_STATUSES, ORDER_STATUSES, type Order, type OrderStatus } from '@/types'
import styles from './orders.module.css'
import { OrderStatusBadge } from './OrderStatusBadge'

export interface OrderCardProps {
  order: Order
  /**
   * Operator variant: shows the customer, a status select and "Update
   * status". The status changes only when the button is pressed, and
   * cancelling asks first.
   */
  onUpdateStatus?: (order: Order, status: OrderStatus) => Promise<void>
  headingLevel?: 2 | 3
  /** Leaves out the card frame, for use as a table row detail. */
  bare?: boolean
}

/** "Peony Posy × 2, Eucalyptus Bunch × 1 and 3 more". */
export function summarizeItems(order: Order): string {
  const first = order.items.slice(0, 2).map((item) => `${item.product_name} × ${item.quantity}`)
  const rest = order.items.length - first.length
  return rest > 0 ? `${first.join(', ')} and ${rest} more` : first.join(', ')
}

function StatusControls({
  order,
  onUpdateStatus,
}: {
  order: Order
  onUpdateStatus: (order: Order, status: OrderStatus) => Promise<void>
}) {
  const toast = useToast()
  const [choice, setChoice] = useState<OrderStatus>(order.status)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const errorId = useId()
  const closed = CLOSED_ORDER_STATUSES.includes(order.status)
  const number = formatOrderNumber(order.id)

  async function update(status: OrderStatus) {
    if (pending) return
    setPending(true)
    setFailure(null)
    try {
      await onUpdateStatus(order, status)
      setConfirmCancel(false)
      toast.success(`Order ${number} is now ${formatOrderStatus(status).toLowerCase()}`)
    } catch (error) {
      // The badge keeps the previous status and the select returns to it.
      setChoice(order.status)
      setConfirmCancel(false)
      setFailure(friendlyMessage(error))
    } finally {
      setPending(false)
    }
  }

  function onPress() {
    if (choice === order.status) {
      setFailure(`Order ${number} is already ${formatOrderStatus(choice).toLowerCase()}. Choose another status.`)
      return
    }
    if (choice === 'cancelled') setConfirmCancel(true)
    else void update(choice)
  }

  return (
    <div className={styles.statusControls}>
      {failure ? (
        <Alert
          variant="error"
          id={errorId}
          action={
            choice !== order.status ? (
              <Button variant="secondary" onClick={onPress}>
                Try again
              </Button>
            ) : undefined
          }
        >
          {failure}
        </Alert>
      ) : null}
      <div className={styles.statusRow}>
        <Select
          label={`Status of order ${number}`}
          value={closed ? order.status : choice}
          onChange={(event) => {
            setChoice(event.target.value as OrderStatus)
            setFailure(null)
          }}
          disabled={closed || pending}
          hint={closed ? 'This order is closed.' : undefined}
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatOrderStatus(status)}
            </option>
          ))}
        </Select>
        <Button
          onClick={onPress}
          disabled={closed}
          loading={pending && !confirmCancel}
          loadingLabel="Updating status"
          aria-describedby={failure ? errorId : undefined}
        >
          Update status
        </Button>
      </div>
      <Modal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        variant="confirm"
        title="Cancel this order?"
        busy={pending}
        footer={
          <>
            <Button variant="danger" loading={pending} loadingLabel="Cancelling order" onClick={() => void update('cancelled')}>
              Cancel order
            </Button>
            <Button variant="secondary" data-autofocus="" disabled={pending} onClick={() => setConfirmCancel(false)}>
              Keep order
            </Button>
          </>
        }
      >
        <p className="type-body">
          The customer will see order {number} as cancelled and its items go back into stock. This can&apos;t be
          undone.
        </p>
      </Modal>
    </div>
  )
}

/*
 * Order card (guidelines 4.3.3). The card has no stretched link, so it does
 * not change on hover; the disclosure, select and button inside carry the
 * interactive states. Tab order: disclosure, then (operator) select, button.
 */
export function OrderCard({ order, onUpdateStatus, headingLevel = 2, bare = false }: OrderCardProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const disclosureRef = useRef<HTMLButtonElement>(null)
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const number = formatOrderNumber(order.id)

  const content = (
    <>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <Heading className="type-ui-strong">Order {number}</Heading>
          <p className={`type-caption ${styles.secondary}`}>Placed {formatDateTime(order.created_at)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <dl className={styles.facts}>
        {order.customer_name ? (
          <div className={styles.fact}>
            <dt className={`type-caption ${styles.secondary}`}>Customer</dt>
            <dd className={`type-ui ${styles.typed}`}>{order.customer_name}</dd>
          </div>
        ) : null}
        <div className={styles.fact}>
          <dt className={`type-caption ${styles.secondary}`}>Delivery date</dt>
          <dd className="type-ui">{formatDate(order.delivery_date)}</dd>
        </div>
        <div className={styles.fact}>
          <dt className={`type-caption ${styles.secondary}`}>Delivery address</dt>
          <dd className={`type-ui ${styles.typed} ${styles.address}`}>{order.delivery_address}</dd>
        </div>
        {order.note ? (
          <div className={styles.fact}>
            <dt className={`type-caption ${styles.secondary}`}>Note</dt>
            <dd className={`type-ui ${styles.typed}`}>{order.note}</dd>
          </div>
        ) : null}
        <div className={styles.fact}>
          <dt className={`type-caption ${styles.secondary}`}>Items</dt>
          <dd className={`type-ui ${styles.typed}`}>{summarizeItems(order)}</dd>
        </div>
      </dl>

      <div className={styles.disclosure}>
        <Button
          ref={disclosureRef}
          variant="ghost"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          iconEnd={<Icon name="chevron-down" size="sm" className={open ? styles.flipped : undefined} />}
        >
          {open ? 'Hide items' : 'Show items'}
          <span className="visually-hidden"> of order {number}</span>
        </Button>
        <ul id={panelId} className={styles.items} hidden={!open}>
          {order.items.map((item) => (
            <li key={item.id} className={styles.item}>
              <p className={`type-ui ${styles.typed}`}>
                {item.product_name} <span className={styles.secondary}>× {item.quantity}</span>
              </p>
              <p className={`type-ui ${styles.numbers}`}>{formatPrice(item.unit_price_cents * item.quantity)}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.footer}>
        <p className="type-ui-strong">Total</p>
        <p className={`type-ui-strong ${styles.numbers}`}>{formatPrice(order.total_cents)}</p>
      </div>

      {onUpdateStatus ? <StatusControls order={order} onUpdateStatus={onUpdateStatus} /> : null}
    </>
  )

  if (bare) return <div className={styles.bare}>{content}</div>
  return <Card className={styles.card}>{content}</Card>
}

/** Skeleton card: one header line, three body lines, one footer line. */
export function OrderCardSkeleton() {
  return (
    <Card as="div" aria-hidden="true">
      <Skeleton shape="title" width="medium" />
      <Skeleton width="long" />
      <Skeleton width="full" />
      <Skeleton width="medium" />
      <Skeleton width="short" />
    </Card>
  )
}
