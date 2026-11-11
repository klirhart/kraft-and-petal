import { PageContainer } from '@/components/layout'
import { ErrorState } from '@/components/ui'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <PageContainer>
      <ErrorState variant="not-found" />
    </PageContainer>
  )
}
