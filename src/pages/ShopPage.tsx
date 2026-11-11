import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { PageContainer, PageHeader } from '@/components/layout'
import { Button, EmptyState, ErrorState, LoadingState } from '@/components/ui'
import { useAddToCart } from '@/features/cart'
import { CategoryChips, CategoryChipsSkeleton, ProductGrid, ProductGridSkeleton } from '@/features/catalog'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { SHOP_CONFIG } from '@/lib/config'
import { data } from '@/lib/data'
import { errorVariant } from '@/lib/errors'
import { pluralize } from '@/lib/formatters'
import styles from './pages.module.css'

export default function ShopPage() {
  usePageTitle('Shop')
  const [params] = useSearchParams()
  const selected = params.get('category')
  const shop = useAsyncData('shop', async () => {
    const [categories, products] = await Promise.all([data.catalog.listCategories(), data.catalog.listProducts()])
    return { categories, products }
  })
  const { addToCart, addingId } = useAddToCart()
  // How many are shown, remembered per filter: a new filter starts from the first page.
  const [more, setMore] = useState<{ filter: string | null; shown: number; focusIndex: number } | null>(null)
  const shown = more && more.filter === selected ? more.shown : SHOP_CONFIG.shopPageSize
  const focusIndex = more && more.filter === selected ? more.focusIndex : null
  const firstNewRef = useRef<HTMLAnchorElement>(null)

  // After "Show more", focus moves to the first newly added product.
  useEffect(() => {
    if (focusIndex !== null) firstNewRef.current?.focus()
  }, [focusIndex])

  const header = <PageHeader title="Shop" lead="Bouquets, plants, gifts and workshops. Everything is wrapped by hand." />

  if (shop.status === 'loading') {
    return (
      <PageContainer>
        {header}
        <LoadingState label="Loading the shop" onRetry={() => void shop.reload()}>
          <CategoryChipsSkeleton />
          <ProductGridSkeleton count={8} />
        </LoadingState>
      </PageContainer>
    )
  }

  if (shop.status === 'error') {
    return (
      <PageContainer>
        {header}
        <ErrorState variant={errorVariant(shop.error)} onRetry={shop.reload} headingLevel={2} link={{ to: '/', label: 'Back to the home page' }} />
      </PageContainer>
    )
  }

  const { categories, products } = shop.data
  const category = selected ? categories.find((entry) => entry.slug === selected) : undefined
  const filtered = selected ? products.filter((product) => product.category_id === category?.id) : products
  const visible = filtered.slice(0, shown)
  const noun = category ? category.name.toLowerCase() : null
  const count = noun
    ? `${filtered.length} ${filtered.length === 1 ? noun.replace(/s$/, '') : noun}`
    : pluralize(filtered.length, 'product')

  if (products.length === 0) {
    return (
      <PageContainer>
        {header}
        <EmptyState
          heading="The shop is being restocked"
          message="New stems arrive soon. Ask us what's coming in."
          action={
            <Link to="/contact" className="link-standalone">
              Get in touch
            </Link>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {header}
      <div className={styles.section}>
        <CategoryChips categories={categories} selected={selected} />
        <p className={`type-ui ${styles.secondary}`} role="status">
          {count}
        </p>
        {filtered.length === 0 ? (
          <EmptyState
            heading={`No ${noun ?? 'products'} right now`}
            message="We're restocking this shelf. The rest of the shop is open."
            action={
              <Link to="/shop" className="link-standalone" replace preventScrollReset>
                Show everything
              </Link>
            }
          />
        ) : (
          <>
            <ProductGrid
              products={visible}
              categories={categories}
              onAddToCart={addToCart}
              addingId={addingId}
              focusIndex={focusIndex ?? undefined}
              focusRef={firstNewRef}
            />
            {filtered.length > shown ? (
              <div className={styles.more}>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setMore({ filter: selected, shown: shown + SHOP_CONFIG.shopPageSize, focusIndex: shown })
                  }
                >
                  Show more
                </Button>
                <p className={`type-ui ${styles.secondary}`}>
                  Showing {visible.length} of {filtered.length}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageContainer>
  )
}
