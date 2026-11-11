import { Outlet, useNavigate } from 'react-router'
import { AdminNav, Footer, PageContainer } from '@/components/layout'
import { ErrorState, ToastViewport, useToast } from '@/components/ui'
import { RequireOperator, useAuth } from '@/features/auth'
import { useDashboardCounts } from '@/features/dashboard'
import { useRouteFocus } from '@/hooks/useRouteFocus'
import { dataMode } from '@/lib/data'
import { MainRegion, PageSkeleton, StorefrontFrame } from './AppShell'
import styles from './app.module.css'

/** The dashboard frame. Rendered only for operators, so its data is requested only for them. */
function DashboardFrame() {
  const auth = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const counts = useDashboardCounts()
  useRouteFocus()

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
    <div className={styles.admin}>
      <AdminNav ordersToConfirm={counts.ordersToConfirm} lowStock={counts.lowStock} onSignOut={() => void signOut()} />
      <div className={styles.adminContent}>
        <MainRegion>
          <Outlet />
        </MainRegion>
        <ToastViewport />
        <Footer sampleData={dataMode === 'sample'} />
      </div>
    </div>
  )
}

/**
 * Every /admin route. Signed-out visitors go to sign in; a signed-in
 * customer sees the not-allowed block inside the storefront frame, and no
 * dashboard data is requested. The database policies enforce the same rule.
 */
export default function AdminShell() {
  return (
    <RequireOperator
      fallback={
        <StorefrontFrame>
          <PageSkeleton label="Checking your account" />
        </StorefrontFrame>
      }
      notAllowed={
        <StorefrontFrame>
          <PageContainer>
            <ErrorState variant="not-allowed" />
          </PageContainer>
        </StorefrontFrame>
      }
    >
      <DashboardFrame />
    </RequireOperator>
  )
}
