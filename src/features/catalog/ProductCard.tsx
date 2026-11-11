import type { Ref } from 'react'
import { Link } from 'react-router'
import { Badge, Button, Card, Icon, Skeleton, cardControlClassName, stretchedLinkClassName } from '@/components/ui'
import { SHOP_CONFIG } from '@/lib/config'
import { formatPrice } from '@/lib/formatters'
import type { Product } from '@/types'
import styles from './catalog.module.css'
import { ProductImage } from './ProductImage'

export interface ProductCardProps {
  product: Product
  categoryName?: string
  /** `featured` adds a two-line description (home page). */
  variant?: 'standard' | 'featured'
  onAddToCart: (product: Product) => void
  adding?: boolean
  /** Load the picture at once: for cards on the first screen. */
  eager?: boolean
  linkRef?: Ref<HTMLAnchorElement>
  headingLevel?: 2 | 3
}

/** "Only 3 left" at or under the low-stock threshold, "Sold out" at zero. */
export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="neutral">Sold out</Badge>
  if (stock <= SHOP_CONFIG.lowStockThreshold) return <Badge variant="attention">Only {stock} left</Badge>
  return null
}

/*
 * Product card (guidelines 4.3.2). Two tab stops: the name link, stretched
 * over the card, then the quick-add button, which puts one in the cart
 * without leaving the list. Sold out keeps the link working and disables
 * the button with the label "Sold out".
 */
export function ProductCard({
  product,
  categoryName,
  variant = 'standard',
  onAddToCart,
  adding = false,
  eager = false,
  linkRef,
  headingLevel = 2,
}: ProductCardProps) {
  const soldOut = product.stock === 0
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <Card interactive flush className={styles.card}>
      <div className={styles.cardMedia}>
        <ProductImage image={product.images[0]} shape="card" eager={eager} />
        <div className={styles.cardBadge}>
          <StockBadge stock={product.stock} />
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardText}>
          <Heading className={`type-title ${styles.cardName}`}>
            <Link ref={linkRef} to={`/shop/${product.slug}`} className={stretchedLinkClassName}>
              {product.name}
            </Link>
          </Heading>
          {categoryName ? <p className={`type-caption ${styles.secondary}`}>{categoryName}</p> : null}
          {variant === 'featured' && product.description ? (
            <p className={`type-ui ${styles.secondary} ${styles.clamp}`}>{product.description}</p>
          ) : null}
          <p className={`type-ui-strong ${styles.price}`}>{formatPrice(product.price_cents)}</p>
        </div>
        <Button
          variant="secondary"
          fullWidth
          className={`${cardControlClassName} ${styles.quickAdd}`}
          iconStart={soldOut ? undefined : <Icon name="plus" size="sm" />}
          disabled={soldOut}
          loading={adding}
          loadingLabel={`Adding ${product.name} to your cart`}
          aria-label={soldOut ? `Sold out: ${product.name}` : `Add to cart: ${product.name}`}
          onClick={() => onAddToCart(product)}
        >
          {soldOut ? 'Sold out' : 'Add to cart'}
        </Button>
      </div>
    </Card>
  )
}

/** Skeleton card: image block, two text lines and a button-shaped block. */
export function ProductCardSkeleton() {
  return (
    <Card as="div" flush className={styles.card} aria-hidden="true">
      <Skeleton shape="image" />
      <div className={styles.cardBody}>
        <div className={styles.cardText}>
          <Skeleton shape="title" width="long" />
          <Skeleton width="short" />
        </div>
        <Skeleton shape="button" />
      </div>
    </Card>
  )
}
