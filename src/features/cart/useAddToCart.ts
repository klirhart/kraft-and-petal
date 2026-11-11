import { useCallback, useState } from 'react'
import { useToast } from '@/components/ui'
import { maxCartQuantity } from '@/lib/validators'
import type { Product } from '@/types'
import { useCart } from './CartProvider'

/**
 * Adds a product to the cart and confirms it with a toast. The cart drawer
 * stays closed and focus stays where it is.
 */
export function useAddToCart() {
  const cart = useCart()
  const toast = useToast()
  const [addingId, setAddingId] = useState<string | null>(null)

  const addToCart = useCallback(
    (product: Product, quantity = 1) => {
      setAddingId(product.id)
      const max = maxCartQuantity(product.stock)
      const added = cart.add(product.id, quantity, max)
      if (added === 0) {
        toast.error(
          max === 0
            ? `${product.name} has just sold out.`
            : `You already have all ${max} of ${product.name} in your cart.`,
        )
      } else if (added < quantity) {
        toast.show(`Only ${max} left, so we added ${added} of ${product.name} to your cart`)
      } else {
        toast.success(`${product.name} added to your cart`)
      }
      // A beat of loading state, so a double press cannot add twice.
      setTimeout(() => setAddingId(null), 300)
    },
    [cart, toast],
  )

  return { addToCart, addingId }
}
