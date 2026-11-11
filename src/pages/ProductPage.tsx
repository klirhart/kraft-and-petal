import { useParams } from 'react-router'
import { PageContainer, PageTitle } from '@/components/layout'
import { ErrorState, LoadingState } from '@/components/ui'
import { useAddToCart } from '@/features/cart'
import { ProductDetail, ProductDetailSkeleton } from '@/features/catalog'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { data } from '@/lib/data'
import { errorVariant } from '@/lib/errors'

export default function ProductPage() {
  const { slug = '' } = useParams()
  const page = useAsyncData(`product:${slug}`, async () => {
    const [product, categories] = await Promise.all([
      data.catalog.getProductBySlug(slug),
      data.catalog.listCategories(),
    ])
    return { product, categories }
  })
  const { addToCart, addingId } = useAddToCart()
  const product = page.status === 'success' ? page.data.product : null
  usePageTitle(product ? product.name : page.status === 'loading' ? 'Shop' : 'Page not found')

  if (page.status === 'loading') {
    return (
      <PageContainer>
        <LoadingState label="Loading the product" onRetry={() => void page.reload()}>
          <ProductDetailSkeleton />
        </LoadingState>
      </PageContainer>
    )
  }

  if (page.status === 'error') {
    return (
      <PageContainer>
        <ErrorState variant={errorVariant(page.error)} onRetry={page.reload} />
      </PageContainer>
    )
  }

  // An unknown slug and a hidden product look the same: not found.
  if (!product) {
    return (
      <PageContainer>
        <ErrorState variant="not-found" />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <ProductDetail
        product={product}
        category={page.data.categories.find((category) => category.id === product.category_id)}
        heading={<PageTitle>{product.name}</PageTitle>}
        onAddToCart={addToCart}
        adding={addingId === product.id}
      />
    </PageContainer>
  )
}
