import { useState } from 'react'
import { Link } from 'react-router'
import { Button, Icon, QuantityStepper, Skeleton } from '@/components/ui'
import { SHOP_CONFIG } from '@/lib/config'
import { formatPrice } from '@/lib/formatters'
import { maxCartQuantity } from '@/lib/validators'
import type { Category, Product } from '@/types'
import styles from './catalog.module.css'
import { StockBadge } from './ProductCard'
import { ProductImage } from './ProductImage'

export interface ProductDetailProps {
  product: Product
  category?: Category
  /** Rendered as the page `h1`. Passed in so the page owns focus on route change. */
  heading: React.ReactNode
  onAddToCart: (product: Product, quantity: number) => void
  adding?: boolean
}

/**
 * Product page content: picture, breadcrumb, name, price, description, then
 * the quantity stepper beside the add button and the stock line under them.
 */
export function ProductDetail({ product, category, heading, onAddToCart, adding = false }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1)
  const max = maxCartQuantity(product.stock)
  const soldOut = max === 0

  return (
    <article className={styles.detail}>
      <div className={styles.detailMedia}>
        <ProductImage image={product.images[0]} shape="detail" eager />
      </div>
      <div className={styles.detailBody}>
        <div className={styles.detailText}>
          <nav aria-label="Breadcrumb">
            <ol className={styles.crumbs}>
              <li className={styles.crumb}>
                <Link to="/">Home</Link>
                <span className={styles.crumbSeparator} aria-hidden="true">
                  /
                </span>
              </li>
              <li className={styles.crumb}>
                {category ? (
                  <Link to={`/shop?category=${encodeURIComponent(category.slug)}`}>{category.name}</Link>
                ) : (
                  <Link to="/shop">Shop</Link>
                )}
                <span className={styles.crumbSeparator} aria-hidden="true">
                  /
                </span>
              </li>
              <li className={styles.crumb} aria-current="page">
                {product.name}
              </li>
            </ol>
          </nav>
          {heading}
          <p className={`${styles.detailPrice} ${styles.price}`}>{formatPrice(product.price_cents)}</p>
          {product.description ? (
            <p className={`type-body ${styles.description}`}>{product.description}</p>
          ) : null}
        </div>
        <div className={styles.buy}>
          {soldOut ? null : (
            <QuantityStepper
              itemName={product.name}
              value={quantity}
              max={max}
              maxReason={product.stock <= max ? `Only ${product.stock} left` : `${max} is the most per order`}
              onChange={setQuantity}
            />
          )}
          <Button
            disabled={soldOut}
            loading={adding}
            loadingLabel={`Adding ${product.name} to your cart`}
            onClick={() => onAddToCart(product, quantity)}
          >
            {soldOut ? 'Sold out' : 'Add to cart'}
          </Button>
        </div>
        {product.stock > SHOP_CONFIG.lowStockThreshold ? (
          <p className={`type-ui ${styles.stock}`}>
            <span className={styles.stockDot} aria-hidden="true" />
            In stock
          </p>
        ) : (
          <StockBadge stock={product.stock} />
        )}
        <Link to="/shop" className="link-standalone">
          Back to the shop
          <Icon name="arrow-right" size="sm" />
        </Link>
      </div>
    </article>
  )
}

/** Skeleton image, three text lines and a button block. */
export function ProductDetailSkeleton() {
  return (
    <div className={styles.detail} aria-hidden="true">
      <div className={styles.detailMedia}>
        <Skeleton shape="image" />
      </div>
      <div className={styles.detailBody}>
        <Skeleton shape="title" width="long" />
        <Skeleton width="short" />
        <Skeleton width="full" />
        <Skeleton shape="button" width="medium" />
      </div>
    </div>
  )
}
