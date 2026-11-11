import { useEffect, useState } from 'react'
import { SHOP_CONFIG } from '@/lib/config'
import { data } from '@/lib/data'
import type { Order, Product } from '@/types'

const listeners = new Set<() => void>()

/** Call after any dashboard change so the sidebar counts stay current. */
export function notifyDashboardChanged(): void {
  for (const listener of listeners) listener()
}

export function isLowStock(product: Pick<Product, 'stock'>): boolean {
  return product.stock <= SHOP_CONFIG.lowStockThreshold
}

export function countOrdersToConfirm(orders: Order[]): number {
  return orders.filter((order) => order.status === 'pending').length
}

export interface DashboardCounts {
  /** Null while loading, and when the count could not be loaded. */
  ordersToConfirm: number | null
  lowStock: number | null
}

/** Counts for the sidebar badges. A failed count shows no badge; the links still work. */
export function useDashboardCounts(): DashboardCounts {
  const [counts, setCounts] = useState<DashboardCounts>({ ordersToConfirm: null, lowStock: null })

  useEffect(() => {
    let active = true
    function load() {
      data.admin.listOrders().then(
        (orders) => active && setCounts((current) => ({ ...current, ordersToConfirm: countOrdersToConfirm(orders) })),
        () => active && setCounts((current) => ({ ...current, ordersToConfirm: null })),
      )
      data.admin.listProducts().then(
        (products) => active && setCounts((current) => ({ ...current, lowStock: products.filter(isLowStock).length })),
        () => active && setCounts((current) => ({ ...current, lowStock: null })),
      )
    }
    load()
    listeners.add(load)
    return () => {
      active = false
      listeners.delete(load)
    }
  }, [])

  return counts
}
