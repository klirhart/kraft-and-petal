import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageContainer, PageHeader } from '@/components/layout'
import { Alert, Button, ButtonLink, EmptyState, Icon, LoadingState, Modal, Skeleton } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { useCart, useCartDetails } from '@/features/cart'
import { ProductImage } from '@/features/catalog'
import { CheckoutForm, OrderReview } from '@/features/checkout'
import { usePageTitle } from '@/hooks/usePageTitle'
import { formatDate, formatPrice } from '@/lib/formatters'
import type { Order } from '@/types'
import styles from './pages.module.css'

function OrderPlaced({ order }: { order: Order }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const customerName = session?.profile.full_name.trim()

  return (
    <Modal
      open
      appearance="glass"
      title="Thank you. Your order is in."
      onClose={() => navigate('/shop')}
    >
      <p className="type-body">
        {customerName ? `${customerName}, your` : 'Your'} order totaling {formatPrice(order.total_cents)} will arrive on{' '}
        {formatDate(order.delivery_date)}. We&apos;ll start arranging it soon.
      </p>
      <div className={styles.heroActions}>
        <ButtonLink to="/account/orders">See your orders</ButtonLink>
        <Link to="/shop" className="link-standalone">
          Back to the shop
          <Icon name="arrow-right" size="sm" />
        </Link>
      </div>
    </Modal>
  )
}

export default function CheckoutPage() {
  usePageTitle('Checkout')
  const cart = useCart()
  const details = useCartDetails()
  const [placed, setPlaced] = useState<Order | null>(null)

  const header = <PageHeader title="Checkout" lead="Tell us where and when, then check your order." />

  if (placed) {
    return (
      <PageContainer width="narrow">
        <PageHeader title="Checkout" lead="Your order has been placed." />
        <OrderPlaced order={placed} />
      </PageContainer>
    )
  }

  if (details.status === 'loading') {
    return (
      <PageContainer width="narrow">
        {header}
        <LoadingState label="Loading checkout" onRetry={() => void details.reload()}>
          <Skeleton shape="button" />
          <Skeleton shape="button" />
          <Skeleton shape="button" />
          <Skeleton shape="title" width="medium" />
          <Skeleton width="long" />
        </LoadingState>
      </PageContainer>
    )
  }

  if (details.rows.length === 0) {
    return (
      <PageContainer width="narrow">
        {header}
        <EmptyState
          heading="Nothing to check out yet"
          message="Add something from the shop and come back here."
          action={
            <Link to="/shop" className="link-standalone">
              Browse the shop
              <Icon name="arrow-right" size="sm" />
            </Link>
          }
        />
      </PageContainer>
    )
  }

  const buyable = details.rows.filter((row) => row.state === 'ok' && row.product)

  return (
    <PageContainer width="narrow">
      {header}
      {details.status === 'error' ? (
        <Alert
          variant="error"
          action={
            <Button variant="secondary" onClick={() => void details.reload()}>
              Try again
            </Button>
          }
        >
          We couldn&apos;t check your cart, so we can&apos;t take the order yet. Try again.
        </Alert>
      ) : null}
      <CheckoutForm
        items={buyable.map((row) => ({ product_id: row.line.productId, quantity: row.quantity }))}
        totalCents={details.subtotalCents}
        blockedReason={details.blockedReason}
        onPlaced={(order) => {
          cart.clear()
          setPlaced(order)
          window.scrollTo(0, 0)
        }}
        review={
          <OrderReview
            subtotalCents={details.subtotalCents}
            lines={buyable.map((row) => ({
              id: row.line.productId,
              name: row.product?.name ?? '',
              quantity: row.quantity,
              lineTotalCents: row.lineTotalCents,
              image: <ProductImage image={row.product?.images[0]} shape="thumbnail" decorative />,
            }))}
          />
        }
      />
    </PageContainer>
  )
}
