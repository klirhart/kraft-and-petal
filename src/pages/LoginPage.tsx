import { HeroArt } from '@/components/illustrations/Scenes'
import { PageContainer, PageHeader } from '@/components/layout'
import { SampleAccounts, SignInForm } from '@/features/auth'
import { usePageTitle } from '@/hooks/usePageTitle'
import styles from './pages.module.css'

export default function LoginPage() {
  usePageTitle('Sign in')
  return (
    <PageContainer>
      <div className={styles.auth}>
        <div className={styles.authArt}>
          <HeroArt />
        </div>
        <div className={styles.authBody}>
          <PageHeader title="Sign in" lead="Sign in to check out and see your orders." />
          <div className={styles.panel}>
            <SignInForm />
          </div>
          <SampleAccounts />
        </div>
      </div>
    </PageContainer>
  )
}
