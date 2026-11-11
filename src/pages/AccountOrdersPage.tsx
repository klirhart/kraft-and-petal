import { Link } from 'react-router'
import { PageContainer, PageHeader } from '@/components/layout'
import { EmptyState, ErrorState, Icon, LoadingState } from '@/components/ui'
import { OrderList, OrderListSkeleton } from '@/features/orders'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { data } from '@/lib/data'
import { errorVariant } from '@/lib/errors'

export default function AccountOrdersPage() {
  usePageTitle('Your orders')
  const orders = useAsyncData('my-orders', () => data.orders.listMine())

  return (
    <PageContainer>
      <PageHeader title="Your orders" lead="Everything you've ordered, newest first." />
      {orders.status === 'loading' ? (
        <LoadingState label="Loading your orders" onRetry={() => void orders.reload()}>
          <OrderListSkeleton count={3} />
        </LoadingState>
      ) : orders.status === 'error' ? (
        <ErrorState variant={errorVariant(orders.error)} onRetry={orders.reload} headingLevel={2} />
      ) : orders.data.length === 0 ? (
        <EmptyState
          heading="No orders yet"
          message="Your first bouquet is a few clicks away."
          action={
            <Link to="/shop" className="link-standalone">
              Browse the shop
              <Icon name="arrow-right" size="sm" />
            </Link>
          }
        />
      ) : (
        <OrderList orders={orders.data} />
      )}
    </PageContainer>
  )
}
