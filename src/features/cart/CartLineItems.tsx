import { useRef } from 'react'
import { Link } from 'react-router'
import { Badge, Button, QuantityStepper, useToast } from '@/components/ui'
import { formatPrice } from '@/lib/formatters'
import type { ProductImage } from '@/types'
import { useCart } from './CartProvider'
import styles from './cart.module.css'
import type { CartRow } from './useCartDetails'

export interface CartLineItemsProps {
  rows: CartRow[]
  /** Draws the product picture. Passed in so the cart does not reach into the catalog feature. */
  renderImage: (image: ProductImage | undefined) => React.ReactNode
  /** Where focus goes when the last line is removed: the empty-state heading. */
  onEmptied?: () => void
}

/** Line-item list (guidelines 4.6), shared by the cart drawer and the /cart page. */
export function CartLineItems({ rows, renderImage, onEmptied }: CartLineItemsProps) {
  const cart = useCart()
  const toast = useToast()
  const listRef = useRef<HTMLUListElement>(null)

  function remove(row: CartRow, index: number) {
    const name = row.product?.name ?? 'Item'
    cart.remove(row.line.productId)
    toast.show(`${name} removed from your cart`, {
      action: { label: 'Undo', onAction: () => cart.restore(row.line, index) },
    })
    // Focus moves to the next row's "Remove", or the previous one, or the empty heading.
    requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[data-remove]')
      const target = buttons?.[Math.min(index, (buttons?.length ?? 0) - 1)]
      if (target) target.focus()
      else onEmptied?.()
    })
  }

  return (
    <ul className={styles.lines} ref={listRef}>
      {rows.map((row, index) => {
        const { product } = row
        const name = product?.name ?? 'An item that left the shop'
        return (
          <li key={row.line.productId} className={styles.line}>
            <div className={styles.lineMain}>
              <div className={styles.thumb}>{renderImage(product?.images[0])}</div>
              <div className={styles.lineText}>
                {product ? (
                  <Link to={`/shop/${product.slug}`} className={`type-ui-strong ${styles.lineName}`}>
                    {product.name}
                  </Link>
                ) : (
                  <p className="type-ui-strong">{name}</p>
                )}
                {row.state === 'ok' && product ? (
                  <p className={`type-ui ${styles.secondary} ${styles.numbers}`}>
                    {formatPrice(product.price_cents)} each
                  </p>
                ) : (
                  <Badge variant="negative" icon="circle-alert">
                    {row.state === 'sold-out' ? 'Sold out' : 'No longer available'}
                  </Badge>
                )}
                {row.notes.map((note) => (
                  <p key={note} className={`type-caption ${styles.secondary}`}>
                    {note}
                  </p>
                ))}
              </div>
            </div>
            <div className={styles.lineControls}>
              {row.state === 'ok' && product ? (
                <QuantityStepper
                  itemName={product.name}
                  value={row.quantity}
                  max={row.maxQuantity}
                  maxReason={
                    product.stock <= row.maxQuantity ? `Only ${product.stock} left` : `${row.maxQuantity} is the most per order`
                  }
                  onChange={(quantity) => cart.setQuantity(product.id, quantity)}
                />
              ) : null}
              <Button
                variant="ghost"
                data-remove=""
                aria-label={`Remove ${name} from your cart`}
                onClick={() => remove(row, index)}
              >
                Remove
              </Button>
              {row.state === 'ok' ? (
                <p className={`type-ui-strong ${styles.lineTotal}`}>{formatPrice(row.lineTotalCents)}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
