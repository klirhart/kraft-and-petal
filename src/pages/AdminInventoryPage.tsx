import { Link } from 'react-router'
import { PageContainer, PageHeader } from '@/components/layout'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { InventoryManager } from '@/features/dashboard'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { data } from '@/lib/data'
import { errorVariant } from '@/lib/errors'
import { RowsSkeleton } from './AdminProductsPage'

export default function AdminInventoryPage() {
  usePageTitle('Inventory')
  const page = useAsyncData('admin-inventory-page', async () => {
    const [products, categories] = await Promise.all([data.admin.listProducts(), data.catalog.listCategories()])
    return { products, categories }
  })

  return (
    <PageContainer>
      <PageHeader title="Inventory" lead="Stock levels save on their own a moment after you change them." />
      {page.status === 'loading' ? (
        <LoadingState label="Loading inventory" onRetry={() => void page.reload()}>
          <RowsSkeleton />
        </LoadingState>
      ) : page.status === 'error' ? (
        <ErrorState
          variant={errorVariant(page.error)}
          onRetry={page.reload}
          headingLevel={2}
          link={{ to: '/admin', label: 'Back to the overview' }}
        />
      ) : page.data.products.length === 0 ? (
        <EmptyState
          heading="No products to track"
          message="Stock levels show here once the shop has products."
          action={
            <Link to="/admin/products" className="link-standalone">
              Add a product
            </Link>
          }
        />
      ) : (
        <InventoryManager products={page.data.products} categories={page.data.categories} onChanged={page.reload} />
      )}
    </PageContainer>
  )
}
