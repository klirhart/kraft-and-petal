import type { ReactNode } from 'react'
import { ToastProvider } from '@/components/ui'
import { AuthProvider } from '@/features/auth'
import { CartProvider } from '@/features/cart'

/** App-wide state: toasts, the session and the cart. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>{children}</CartProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
