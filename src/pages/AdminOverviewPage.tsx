import { PageContainer, PageHeader } from '@/components/layout'
import { Overview } from '@/features/dashboard'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function AdminOverviewPage() {
  usePageTitle('Dashboard overview')
  return (
    <PageContainer>
      <PageHeader title="Overview" lead="Today's orders, sales and stock at a glance." />
      <Overview />
    </PageContainer>
  )
}
