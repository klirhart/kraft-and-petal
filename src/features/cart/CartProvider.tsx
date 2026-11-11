import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SHOP_CONFIG } from '@/lib/config'

/** A saved cart line. Names, prices and stock are never stored: they are read fresh. */
export interface CartLine {
  productId: string
  quantity: number
}

export interface CartContextValue {
  lines: CartLine[]
  /** Total number of items, for the header badge. */
  count: number
  /** Adds to a line (creating it if needed), up to `max`. Returns how many were added. */
  add: (productId: string, quantity: number, max: number) => number
  setQuantity: (productId: string, quantity: number) => void
  remove: (productId: string) => void
  /** Puts a removed line back where it was ("Undo"). */
  restore: (line: CartLine, index: number) => void
  clear: () => void
  isDrawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const STORAGE_KEY = 'kraft-petal.cart.v1'
const CartContext = createContext<CartContextValue | null>(null)

function readSaved(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line === 'object' &&
          line !== null &&
          typeof (line as CartLine).productId === 'string' &&
          Number.isInteger((line as CartLine).quantity) &&
          (line as CartLine).quantity > 0,
      )
      .map((line) => ({
        productId: line.productId,
        quantity: Math.min(line.quantity, SHOP_CONFIG.maxPerCartLine),
      }))
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(readSaved)
  const [isDrawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Storage full or blocked: the cart still works for this visit.
    }
  }, [lines])

  // Another tab changed the cart: follow it.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setLines(readSaved())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback(
    (productId: string, quantity: number, max: number) => {
      const limit = Math.min(max, SHOP_CONFIG.maxPerCartLine)
      const current = lines.find((line) => line.productId === productId)?.quantity ?? 0
      const added = Math.max(0, Math.min(quantity, limit - current))
      if (added > 0) {
        setLines((previous) =>
          previous.some((line) => line.productId === productId)
            ? previous.map((line) =>
                line.productId === productId ? { ...line, quantity: line.quantity + added } : line,
              )
            : [...previous, { productId, quantity: added }],
        )
      }
      return added
    },
    [lines],
  )

  const setQuantity = useCallback((productId: string, quantity: number) => {
    const next = Math.max(1, Math.min(Math.trunc(quantity), SHOP_CONFIG.maxPerCartLine))
    setLines((previous) =>
      previous.map((line) => (line.productId === productId ? { ...line, quantity: next } : line)),
    )
  }, [])

  const remove = useCallback((productId: string) => {
    setLines((previous) => previous.filter((line) => line.productId !== productId))
  }, [])

  const restore = useCallback((line: CartLine, index: number) => {
    setLines((previous) => {
      if (previous.some((entry) => entry.productId === line.productId)) return previous
      const next = [...previous]
      next.splice(Math.min(index, next.length), 0, line)
      return next
    })
  }, [])

  const clear = useCallback(() => setLines([]), [])
  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      add,
      setQuantity,
      remove,
      restore,
      clear,
      isDrawerOpen,
      openDrawer,
      closeDrawer,
    }),
    [lines, add, setQuantity, remove, restore, clear, isDrawerOpen, openDrawer, closeDrawer],
  )

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext)
  if (!value) throw new Error('useCart must be used inside <CartProvider>')
  return value
}
