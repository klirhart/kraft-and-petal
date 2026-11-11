import { useRef } from 'react'
import { Link } from 'react-router'
import { EmptyBasketArt } from '@/components/illustrations/Scenes'
import { Alert, Button, EmptyState, Icon, Skeleton, stateArtClassName } from '@/components/ui'
import type { ProductImage } from '@/types'
import styles from './cart.module.css'
import { CartLineItems } from './CartLineItems'
import type { CartDetails } from './useCartDetails'

export interface CartContentsProps {
  details: CartDetails
  renderImage: (image: ProductImage | undefined) => React.ReactNode
  headingLevel?: 2 | 3
}

export function CartLinesSkeleton() {
  return (
    <ul className={styles.lines} aria-busy="true">
      {[0, 1, 2].map((row) => (
        <li key={row} className={styles.line}>
          <div className={styles.lineMain}>
            <Skeleton shape="thumbnail" />
            <div className={styles.lineText}>
              <Skeleton width="long" />
              <Skeleton width="short" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** The cart list with its loading, error and empty states. Used by the drawer and /cart. */
export function CartContents({ details, renderImage, headingLevel = 2 }: CartContentsProps) {
  const emptyHeadingRef = useRef<HTMLHeadingElement>(null)

  if (details.status === 'loading') return <CartLinesSkeleton />

  if (details.rows.length === 0) {
    return (
      <EmptyState
        heading="Your cart is empty"
        message="Pick something lovely and it will show up here."
        headingLevel={headingLevel}
        headingRef={emptyHeadingRef}
        art={<EmptyBasketArt className={stateArtClassName} />}
        action={
          <Link to="/shop" className="link-standalone">
            Browse the shop
            <Icon name="arrow-right" size="sm" />
          </Link>
        }
      />
    )
  }

  return (
    <>
      {details.status === 'error' ? (
        <Alert
          variant="error"
          action={
            <Button variant="secondary" onClick={() => void details.reload()}>
              Try again
            </Button>
          }
        >
          We couldn&apos;t check your cart. Try again.
        </Alert>
      ) : null}
      <CartLineItems
        rows={details.rows}
        renderImage={renderImage}
        onEmptied={() => requestAnimationFrame(() => emptyHeadingRef.current?.focus())}
      />
    </>
  )
}
