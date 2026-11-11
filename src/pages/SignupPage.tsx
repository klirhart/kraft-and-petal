import { HeroArt } from '@/components/illustrations/Scenes'
import { PageContainer, PageHeader } from '@/components/layout'
import { SignUpForm } from '@/features/auth'
import { usePageTitle } from '@/hooks/usePageTitle'
import styles from './pages.module.css'

export default function SignupPage() {
  usePageTitle('Create account')
  return (
    <PageContainer>
      <div className={styles.auth}>
        <div className={styles.authArt}>
          <HeroArt />
        </div>
        <div className={styles.authBody}>
          <PageHeader title="Create account" lead="It takes a minute. You'll use it to check out and follow your orders." />
          <div className={styles.panel}>
            <SignUpForm />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
