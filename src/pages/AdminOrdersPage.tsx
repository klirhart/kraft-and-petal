import { PageContainer, PageHeader } from '@/components/layout'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { OrdersManager } from '@/features/dashboard'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { data } from '@/lib/data'
import { errorVariant } from '@/lib/errors'
import { RowsSkeleton } from './AdminProductsPage'

export default function AdminOrdersPage() {
  usePageTitle('Orders')
  const orders = useAsyncData('admin-orders-page', () => data.admin.listOrders())

  return (
    <PageContainer>
      <PageHeader title="Orders" lead="Review each order and move it along." />
      {orders.status === 'loading' ? (
        <LoadingState label="Loading orders" onRetry={() => void orders.reload()}>
          <RowsSkeleton />
        </LoadingState>
      ) : orders.status === 'error' ? (
        <ErrorState
          variant={errorVariant(orders.error)}
          onRetry={orders.reload}
          headingLevel={2}
          link={{ to: '/admin', label: 'Back to the overview' }}
        />
      ) : orders.data.length === 0 ? (
        <EmptyState heading="No orders yet" message="Orders will show here once customers check out." />
      ) : (
        <OrdersManager orders={orders.data} onChanged={orders.reload} />
      )}
    </PageContainer>
  )
}
