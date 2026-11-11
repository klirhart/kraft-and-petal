import { useState } from 'react'
import { Link } from 'react-router'
import { Alert, Badge, Button, EmptyState, Icon, Skeleton, Table, numericCellClassName } from '@/components/ui'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { data } from '@/lib/data'
import {
  formatDateTime,
  formatOrderNumber,
  formatPrice,
  pluralize,
  shopToday,
} from '@/lib/formatters'
import { OrderStatusBadge } from '@/features/orders'
import type { Order } from '@/types'
import styles from './dashboard.module.css'
import { countOrdersToConfirm, isLowStock } from './dashboardData'
import { StatCard } from './StatCard'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function RecentOrders({ orders }: { orders: Order[] }) {
  const isWide = useMediaQuery('(min-width: 1024px)')
  const recent = orders.slice(0, 5)
  if (isWide) {
    return (
      <Table caption="Recent orders">
        <thead>
          <tr>
            <th scope="col">Order</th>
            <th scope="col">Placed</th>
            <th scope="col">Customer</th>
            <th scope="col" className={numericCellClassName}>
              Total
            </th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((order) => (
            <tr key={order.id}>
              <th scope="row">{formatOrderNumber(order.id)}</th>
              <td>{formatDateTime(order.created_at)}</td>
              <td className={styles.typed}>{order.customer_name ?? ''}</td>
              <td className={numericCellClassName}>{formatPrice(order.total_cents)}</td>
              <td>
                <OrderStatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    )
  }
  return (
    <ul className={styles.records}>
      {recent.map((order) => (
        <li key={order.id} className={styles.record}>
          <div className={styles.recordHeader}>
            <p className="type-ui-strong">Order {formatOrderNumber(order.id)}</p>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className={`type-ui ${styles.secondary} ${styles.typed}`}>
            {order.customer_name}, {formatDateTime(order.created_at)}
          </p>
          <p className={`type-ui-strong ${styles.numbers}`}>{formatPrice(order.total_cents)}</p>
        </li>
      ))}
    </ul>
  )
}

/**
 * Dashboard overview: four stat cards and the latest orders. Orders and
 * products load separately, so each card fails and retries on its own.
 */
export function Overview() {
  const orders = useAsyncData('admin-orders', () => data.admin.listOrders())
  const products = useAsyncData('admin-products', () => data.admin.listProducts())

  const [weekStart] = useState(() => Date.now() - WEEK_MS)
  const today = shopToday()
  const list = orders.status === 'success' ? orders.data : []
  const todayCount = list.filter((order) => shopToday(new Date(order.created_at)) === today).length
  const toConfirm = countOrdersToConfirm(list)
  const weekSales = list
    .filter((order) => order.status !== 'cancelled' && new Date(order.created_at).getTime() >= weekStart)
    .reduce((sum, order) => sum + order.total_cents, 0)
  const lowStock = products.status === 'success' ? products.data.filter(isLowStock).length : 0

  const ordersStatus = orders.status === 'success' ? 'ready' : orders.status
  const productsStatus = products.status === 'success' ? 'ready' : products.status

  return (
    <>
      <ul className={styles.stats}>
        <StatCard
          label="Orders today"
          status={ordersStatus}
          value={String(todayCount)}
          detail={todayCount === 0 ? 'No orders yet today' : 'Placed since midnight'}
          onRetry={() => void orders.reload()}
        />
        <StatCard
          label="Orders to confirm"
          status={ordersStatus}
          value={String(toConfirm)}
          detail={toConfirm === 0 ? 'All caught up' : <Badge variant="attention">Waiting for you</Badge>}
          link={{ to: '/admin/orders?status=pending', label: 'View orders to confirm' }}
          onRetry={() => void orders.reload()}
        />
        <StatCard
          label="Sales this week"
          status={ordersStatus}
          value={formatPrice(weekSales)}
          detail={weekSales === 0 ? 'No sales in the last 7 days' : 'Last 7 days, cancelled orders left out'}
          onRetry={() => void orders.reload()}
        />
        <StatCard
          label="Low-stock items"
          status={productsStatus}
          value={String(lowStock)}
          detail={
            lowStock === 0 ? 'Everything is well stocked' : <Badge variant="attention">{pluralize(lowStock, 'product')} to restock</Badge>
          }
          link={{ to: '/admin/inventory?low=1', label: 'View low stock' }}
          onRetry={() => void products.reload()}
        />
      </ul>

      <section className={styles.section} aria-labelledby="recent-orders-title">
        <div className={styles.sectionHeader}>
          <h2 id="recent-orders-title">Recent orders</h2>
          <Link to="/admin/orders" className="link-standalone">
            View all orders
            <Icon name="arrow-right" size="sm" />
          </Link>
        </div>
        {orders.status === 'loading' ? (
          <div className={styles.rowsSkeleton} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} shape="row" />
            ))}
          </div>
        ) : orders.status === 'error' ? (
          <Alert
            variant="error"
            action={
              <Button variant="secondary" onClick={() => void orders.reload()}>
                Try again
              </Button>
            }
          >
            Recent orders couldn&apos;t be loaded. Try again.
          </Alert>
        ) : orders.data.length === 0 ? (
          <EmptyState
            heading="No orders yet"
            message="Orders will show here once customers check out."
            headingLevel={3}
          />
        ) : (
          <RecentOrders orders={orders.data} />
        )}
      </section>
    </>
  )
}
