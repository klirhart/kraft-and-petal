import { Suspense, type ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { Footer, Header, PageContainer, type AccountState } from '@/components/layout'
import { ErrorState, LoadingState, Skeleton, ToastViewport, useToast } from '@/components/ui'
import { signInHref, useAuth } from '@/features/auth'
import { CartDrawer, useCart } from '@/features/cart'
import { ProductImage } from '@/features/catalog'
import { useRouteFocus } from '@/hooks/useRouteFocus'
import { dataMode } from '@/lib/data'
import { firstName } from '@/lib/formatters'
import type { ProductImage as ProductImageRow } from '@/types'
import styles from './app.module.css'
import { ErrorBoundary, isChunkLoadError } from './ErrorBoundary'

/** The loading state of a page whose file or session is still on its way. */
export function PageSkeleton({ label = 'Loading the page' }: { label?: string }) {
  return (
    <PageContainer width="narrow">
      <LoadingState label={label}>
        <Skeleton shape="title" width="medium" />
        <Skeleton width="long" />
        <Skeleton width="full" />
        <Skeleton shape="button" width="short" />
      </LoadingState>
    </PageContainer>
  )
}

/** Shown when a page throws while rendering. Header, navigation and footer stay usable. */
export function RouteError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const chunk = isChunkLoadError(error)
  return (
    <PageContainer>
      <ErrorState
        variant={chunk ? 'offline' : 'server'}
        // A route file that failed to download needs a full reload to fetch it again.
        onRetry={chunk ? () => window.location.reload() : onRetry}
      />
    </PageContainer>
  )
}

function renderRouteError(error: Error, reset: () => void): ReactNode {
  return <RouteError error={error} onRetry={reset} />
}

export function renderCartImage(image: ProductImageRow | undefined): ReactNode {
  return <ProductImage image={image} shape="thumbnail" decorative />
}

/** `<main>` with the per-route error boundary and the lazy-route loading state. */
export function MainRegion({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <main id="main" tabIndex={-1} className={styles.main}>
      <ErrorBoundary key={pathname} fallback={renderRouteError}>
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </ErrorBoundary>
    </main>
  )
}

/**
 * Storefront frame: header, main, toast region (right after main, so its
 * buttons follow the page in tab order), footer and the cart drawer.
 */
export function StorefrontFrame({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const cart = useCart()
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  useRouteFocus()

  const account: AccountState =
    auth.status === 'loading'
      ? { status: 'loading' }
      : auth.session
        ? {
            status: 'signed-in',
            firstName: firstName(auth.session.profile.full_name),
            fullName: auth.session.profile.full_name || auth.session.email,
            isOperator: auth.isOperator,
          }
        : { status: 'signed-out' }

  async function signOut() {
    try {
      // Leave first, so a guarded page does not send the visitor to sign in again.
      await navigate('/')
      await auth.signOut()
      toast.show("You're signed out")
    } catch {
      toast.error("We couldn't sign you out. Try again.")
    }
  }

  return (
    <>
      <Header
        account={account}
        signInHref={signInHref(location.pathname + location.search)}
        onSignOut={() => void signOut()}
        cartCount={cart.count}
        cartAsLink={location.pathname === '/cart' || location.pathname === '/checkout'}
        onOpenCart={cart.openDrawer}
      />
      <MainRegion>{children}</MainRegion>
      <ToastViewport />
      <Footer sampleData={dataMode === 'sample'} />
      <CartDrawer renderImage={renderCartImage} />
    </>
  )
}

export function AppShell() {
  return (
    <StorefrontFrame>
      <Outlet />
    </StorefrontFrame>
  )
}
