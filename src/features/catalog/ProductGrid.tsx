import type { Ref } from 'react'
import type { Category, Product } from '@/types'
import styles from './catalog.module.css'
import { ProductCard, ProductCardSkeleton } from './ProductCard'

export interface ProductGridProps {
  products: Product[]
  categories?: Category[]
  variant?: 'standard' | 'featured'
  onAddToCart: (product: Product) => void
  addingId?: string | null
  /** Index of the card whose link takes `focusRef`: the first newly loaded one. */
  focusIndex?: number
  focusRef?: Ref<HTMLAnchorElement>
  headingLevel?: 2 | 3
}

/** Card grid: a `<ul>` so assistive technology can announce the item count. */
export function ProductGrid({
  products,
  categories,
  variant,
  onAddToCart,
  addingId,
  focusIndex,
  focusRef,
  headingLevel,
}: ProductGridProps) {
  return (
    <ul className={styles.grid}>
      {products.map((product, index) => (
        <li key={product.id} className={styles.gridItem}>
          <ProductCard
            product={product}
            categoryName={categories?.find((category) => category.id === product.category_id)?.name}
            variant={variant}
            onAddToCart={onAddToCart}
            adding={addingId === product.id}
            eager={index < 4}
            linkRef={index === focusIndex ? focusRef : undefined}
            headingLevel={headingLevel}
          />
        </li>
      ))}
    </ul>
  )
}

export function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <div className={styles.grid} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}
