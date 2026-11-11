import { PageContainer, PageHeader } from '@/components/layout'
import { LoadingState } from '@/components/ui'
import { CartContents, CartLinesSkeleton, CartSummary, useCartDetails } from '@/features/cart'
import { ProductImage } from '@/features/catalog'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { ProductImage as ProductImageRow } from '@/types'
import styles from './pages.module.css'

function renderImage(image: ProductImageRow | undefined) {
  return <ProductImage image={image} shape="thumbnail" decorative />
}

export default function CartPage() {
  usePageTitle('Your cart')
  const details = useCartDetails()
  const isEmpty = details.status !== 'loading' && details.rows.length === 0

  return (
    <PageContainer>
      <PageHeader title="Your cart" />
      {details.status === 'loading' ? (
        <LoadingState label="Loading your cart" onRetry={() => void details.reload()}>
          <div className={styles.split}>
            <div className={styles.panel}>
              <CartLinesSkeleton />
            </div>
            <div className={styles.panel}>
              <CartSummary details={details} />
            </div>
          </div>
        </LoadingState>
      ) : isEmpty ? (
        <CartContents details={details} renderImage={renderImage} />
      ) : (
        <div className={styles.split}>
          <section aria-labelledby="cart-items-title" className={styles.panel}>
            <h2 id="cart-items-title" className="visually-hidden">
              Items
            </h2>
            <CartContents details={details} renderImage={renderImage} />
          </section>
          <section aria-labelledby="cart-summary-title" className={styles.panel}>
            <h2 id="cart-summary-title" className="type-heading-3">
              Summary
            </h2>
            <CartSummary details={details} />
          </section>
        </div>
      )}
    </PageContainer>
  )
}
