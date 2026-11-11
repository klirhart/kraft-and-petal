import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { GuestOnly, RequireSignedIn } from '@/features/auth'
import { AppShell, PageSkeleton, StorefrontFrame } from './AppShell'

/*
 * One file per route, each loaded on demand. The dashboard pages are lazy
 * too, so storefront visitors never download dashboard code.
 */
const AdminShell = lazy(() => import('./AdminShell'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const ShopPage = lazy(() => import('@/pages/ShopPage'))
const ProductPage = lazy(() => import('@/pages/ProductPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const SignupPage = lazy(() => import('@/pages/SignupPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const AccountOrdersPage = lazy(() => import('@/pages/AccountOrdersPage'))
const AdminOverviewPage = lazy(() => import('@/pages/AdminOverviewPage'))
const AdminProductsPage = lazy(() => import('@/pages/AdminProductsPage'))
const AdminOrdersPage = lazy(() => import('@/pages/AdminOrdersPage'))
const AdminInventoryPage = lazy(() => import('@/pages/AdminInventoryPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="shop/:slug" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route element={<GuestOnly fallback={<PageSkeleton label="Checking your account" />} />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
        </Route>
        <Route element={<RequireSignedIn fallback={<PageSkeleton label="Checking your account" />} />}>
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="account/orders" element={<AccountOrdersPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route
        path="admin"
        element={
          <Suspense
            fallback={
              <StorefrontFrame>
                <PageSkeleton label="Loading the dashboard" />
              </StorefrontFrame>
            }
          >
            <AdminShell />
          </Suspense>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
