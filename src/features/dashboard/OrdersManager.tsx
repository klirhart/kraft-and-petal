import { Fragment, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Button, EmptyState, Pagination, Select, Table, numericCellClassName, paginate } from '@/components/ui'
import { OrderCard, OrderList, OrderStatusBadge } from '@/features/orders'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SHOP_CONFIG } from '@/lib/config'
import { data } from '@/lib/data'
import {
  formatDate,
  formatDateTime,
  formatOrderNumber,
  formatOrderStatus,
  formatPrice,
  pluralize,
} from '@/lib/formatters'
import { ORDER_STATUSES, type Order, type OrderStatus } from '@/types'
import styles from './dashboard.module.css'
import { notifyDashboardChanged } from './dashboardData'

export interface OrdersManagerProps {
  orders: Order[]
  onChanged: () => Promise<void>
}

function isStatus(value: string | null): value is OrderStatus {
  return value !== null && (ORDER_STATUSES as readonly string[]).includes(value)
}

/** Operator order list with a status filter kept in the URL. */
export function OrdersManager({ orders, onChanged }: OrdersManagerProps) {
  const isWide = useMediaQuery('(min-width: 1024px)')
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const statusParam = params.get('status')
  const status = isStatus(statusParam) ? statusParam : null
  const filtered = status ? orders.filter((order) => order.status === status) : orders
  const paged = paginate(filtered, page, SHOP_CONFIG.tablePageSize)

  function setStatus(next: string) {
    setPage(1)
    setParams(next ? { status: next } : {}, { replace: true, preventScrollReset: true })
  }

  async function updateStatus(order: Order, next: OrderStatus) {
    await data.admin.updateOrderStatus(order.id, next)
    notifyDashboardChanged()
    await onChanged()
  }

  return (
    <div className={styles.manager}>
      <div className={styles.toolbar}>
        <div className={styles.filter}>
          <Select label="Show" value={status ?? ''} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All orders</option>
            {ORDER_STATUSES.map((entry) => (
              <option key={entry} value={entry}>
                {formatOrderStatus(entry)}
              </option>
            ))}
          </Select>
        </div>
        <p className={`type-ui ${styles.count}`} role="status">
          {pluralize(filtered.length, 'order')}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          heading={status === 'pending' ? 'No orders to confirm' : `No orders are ${formatOrderStatus(status ?? 'pending').toLowerCase()}`}
          message="Orders with this status will show here."
          action={
            <Button variant="secondary" onClick={() => setStatus('')}>
              Clear filter
            </Button>
          }
        />
      ) : isWide ? (
        <Table caption="Orders">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Placed</th>
              <th scope="col">Customer</th>
              <th scope="col">Delivery date</th>
              <th scope="col" className={numericCellClassName}>
                Total
              </th>
              <th scope="col">Status</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((order) => {
              const open = openId === order.id
              const number = formatOrderNumber(order.id)
              return (
                <Fragment key={order.id}>
                  <tr>
                    <th scope="row">{number}</th>
                    <td>{formatDateTime(order.created_at)}</td>
                    <td className={styles.typed}>{order.customer_name ?? ''}</td>
                    <td>{formatDate(order.delivery_date)}</td>
                    <td className={numericCellClassName}>{formatPrice(order.total_cents)}</td>
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-expanded={open}
                        aria-controls={`order-detail-${order.id}`}
                        onClick={() => setOpenId(open ? null : order.id)}
                      >
                        {open ? 'Close' : 'Review'}
                        <span className="visually-hidden"> order {number}</span>
                      </Button>
                    </td>
                  </tr>
                  {open ? (
                    <tr id={`order-detail-${order.id}`}>
                      <td colSpan={7} className={styles.detailCell}>
                        <OrderCard order={order} onUpdateStatus={updateStatus} headingLevel={2} bare />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </Table>
      ) : (
        <OrderList orders={paged.rows} onUpdateStatus={updateStatus} />
      )}

      <Pagination page={paged.page} pageCount={paged.pageCount} onPageChange={setPage} label="Orders" />
    </div>
  )
}
