import { useEffect, useMemo } from 'react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { data } from '@/lib/data'
import { formatPrice } from '@/lib/formatters'
import { maxCartQuantity } from '@/lib/validators'
import type { Product } from '@/types'
import { useCart, type CartLine } from './CartProvider'

export interface CartRow {
  line: CartLine
  /** Null when the product was hidden, deleted or is unknown. */
  product: Product | null
  /** `ok`: can be bought. `sold-out` and `unavailable` block checkout until removed. */
  state: 'ok' | 'sold-out' | 'unavailable'
  quantity: number
  maxQuantity: number
  lineTotalCents: number
  /** Helper text for this line, e.g. "Only 2 left, so we updated your cart". */
  notes: string[]
}

export interface CartDetails {
  status: 'loading' | 'error' | 'ready'
  rows: CartRow[]
  subtotalCents: number
  /** Why checkout is blocked, or null when it is open. */
  blockedReason: string | null
  reload: () => Promise<void>
}

/** Prices seen earlier in this visit, kept in memory only, to say when one changed. */
const seenPrices = new Map<string, number>()
/** Lines whose quantity was lowered to the stock in this visit. */
const loweredLines = new Map<string, number>()

/**
 * The cart as it can be bought right now. Only ids and quantities are saved,
 * so names, prices and stock are read through `src/lib` every time and the
 * subtotal is worked out from current prices.
 */
export function useCartDetails(): CartDetails {
  const cart = useCart()
  const ids = useMemo(() => cart.lines.map((line) => line.productId).sort(), [cart.lines])
  const key = ids.join(',')
  const products = useAsyncData<Product[]>(`cart:${key}`, () =>
    ids.length === 0 ? Promise.resolve([]) : data.catalog.getProductsByIds(ids),
  )

  // A line that asks for more than is in stock is lowered to what is left.
  useEffect(() => {
    if (products.status !== 'success') return
    for (const line of cart.lines) {
      const product = products.data.find((entry) => entry.id === line.productId)
      if (!product || product.stock === 0) continue
      const max = maxCartQuantity(product.stock)
      if (line.quantity > max) {
        loweredLines.set(line.productId, product.stock)
        cart.setQuantity(line.productId, max)
      }
    }
  }, [products.status, products.data, cart])

  return useMemo<CartDetails>(() => {
    if (products.status === 'loading') {
      return { status: 'loading', rows: [], subtotalCents: 0, blockedReason: null, reload: products.reload }
    }
    const found = products.status === 'success' ? products.data : []
    const rows = cart.lines.map((line): CartRow => {
      const product = found.find((entry) => entry.id === line.productId) ?? null
      if (!product) {
        return {
          line,
          product: null,
          state: 'unavailable',
          quantity: line.quantity,
          maxQuantity: 0,
          lineTotalCents: 0,
          notes: [],
        }
      }
      const maxQuantity = maxCartQuantity(product.stock)
      if (maxQuantity === 0) {
        return { line, product, state: 'sold-out', quantity: line.quantity, maxQuantity, lineTotalCents: 0, notes: [] }
      }
      const quantity = Math.min(line.quantity, maxQuantity)
      const notes: string[] = []
      const lowered = loweredLines.get(product.id)
      if (lowered !== undefined && quantity >= maxQuantity) {
        notes.push(`Only ${lowered} left, so we updated your cart.`)
      }
      const seen = seenPrices.get(product.id)
      if (seen !== undefined && seen !== product.price_cents) {
        notes.push(`The price changed to ${formatPrice(product.price_cents)}.`)
      }
      return {
        line,
        product,
        state: 'ok',
        quantity,
        maxQuantity,
        lineTotalCents: product.price_cents * quantity,
        notes,
      }
    })
    for (const product of found) {
      if (!seenPrices.has(product.id)) seenPrices.set(product.id, product.price_cents)
    }

    let blockedReason: string | null = null
    if (products.status === 'error') {
      blockedReason = "We couldn't check your cart, so checkout is paused. Try again."
    } else if (rows.some((row) => row.state !== 'ok')) {
      blockedReason = 'Remove the items that are no longer available to check out.'
    }

    return {
      status: products.status === 'error' ? 'error' : 'ready',
      rows,
      subtotalCents: rows.reduce((sum, row) => sum + row.lineTotalCents, 0),
      blockedReason,
      reload: products.reload,
    }
  }, [products.status, products.data, products.reload, cart.lines])
}
