import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { Drawer } from '@/components/ui'
import { pluralize } from '@/lib/formatters'
import type { ProductImage } from '@/types'
import { CartContents } from './CartContents'
import { useCart } from './CartProvider'
import { CartSummary } from './CartSummary'
import { useCartDetails } from './useCartDetails'

export interface CartDrawerProps {
  renderImage: (image: ProductImage | undefined) => React.ReactNode
}

/** Mounted only while open, so prices and stock are read fresh each time the cart is shown. */
function OpenCartDrawer({ renderImage }: CartDrawerProps) {
  const cart = useCart()
  const details = useCartDetails()
  const isEmpty = details.status !== 'loading' && details.rows.length === 0
  return (
    <Drawer
      open
      onClose={cart.closeDrawer}
      title={cart.count > 0 ? `Your cart (${pluralize(cart.count, 'item')})` : 'Your cart'}
      side="trailing"
      closeLabel="Close cart"
      footer={isEmpty ? undefined : <CartSummary details={details} showViewCart part="actions" />}
    >
      <CartContents details={details} renderImage={renderImage} headingLevel={3} />
      {isEmpty ? null : <CartSummary details={details} part="totals" />}
    </Drawer>
  )
}

/**
 * The cart in a panel from the trailing edge (guidelines 4.10). Opens only
 * from the header cart button, traps focus, closes on Escape, on the scrim
 * and on route change, and returns focus to the cart button.
 */
export function CartDrawer({ renderImage }: CartDrawerProps) {
  const { isDrawerOpen, closeDrawer } = useCart()
  const { pathname } = useLocation()

  const lastPath = useRef(pathname)

  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    closeDrawer()
  }, [pathname, closeDrawer])

  return isDrawerOpen ? <OpenCartDrawer renderImage={renderImage} /> : null
}
