import type { Order, OrderStatus } from '@/types'
import { OrderCard, OrderCardSkeleton } from './OrderCard'
import styles from './orders.module.css'

export interface OrderListProps {
  orders: Order[]
  onUpdateStatus?: (order: Order, status: OrderStatus) => Promise<void>
  headingLevel?: 2 | 3
}

/** Card list: one order per card, one card per row at every width. */
export function OrderList({ orders, onUpdateStatus, headingLevel }: OrderListProps) {
  return (
    <ul className={styles.list}>
      {orders.map((order) => (
        <li key={order.id}>
          <OrderCard order={order} onUpdateStatus={onUpdateStatus} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  )
}

export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.list} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <OrderCardSkeleton key={index} />
      ))}
    </div>
  )
}
