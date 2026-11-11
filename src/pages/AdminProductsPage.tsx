import { useState } from 'react'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button, EmptyState, ErrorState, Icon, LoadingState, Skeleton } from '@/components/ui'
import { ProductsManager } from '@/features/dashboard'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { data } from '@/lib/data'
import { errorVariant } from '@/lib/errors'
import styles from './pages.module.css'

export function RowsSkeleton() {
  return (
    <div className={styles.rows} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((row) => (
        <Skeleton key={row} shape="row" />
      ))}
    </div>
  )
}

export default function AdminProductsPage() {
  usePageTitle('Products')
  const [adding, setAdding] = useState(false)
  const page = useAsyncData('admin-products-page', async () => {
    const [products, categories] = await Promise.all([data.admin.listProducts(), data.catalog.listCategories()])
    return { products, categories }
  })
  const addButton = (
    <Button iconStart={<Icon name="plus" />} onClick={() => setAdding(true)}>
      Add product
    </Button>
  )

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        lead="Add, edit and hide what the shop sells."
        actions={page.status === 'success' && page.data.products.length > 0 ? addButton : undefined}
      />
      {page.status === 'loading' ? (
        <LoadingState label="Loading products" onRetry={() => void page.reload()}>
          <RowsSkeleton />
        </LoadingState>
      ) : page.status === 'error' ? (
        <ErrorState
          variant={errorVariant(page.error)}
          onRetry={page.reload}
          headingLevel={2}
          link={{ to: '/admin', label: 'Back to the overview' }}
        />
      ) : (
        <>
          {page.data.products.length === 0 ? (
            <EmptyState
              heading="No products yet"
              message="Add your first product to open the shop."
              action={addButton}
            />
          ) : null}
          <ProductsManager
            products={page.data.products}
            categories={page.data.categories}
            onChanged={page.reload}
            adding={adding}
            onAddingChange={setAdding}
          />
        </>
      )}
    </PageContainer>
  )
}
