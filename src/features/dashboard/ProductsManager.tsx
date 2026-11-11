import { useRef, useState } from 'react'
import { Badge, Button, Modal, Pagination, Table, numericCellClassName, paginate, useToast } from '@/components/ui'
import { ProductImage } from '@/features/catalog'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SHOP_CONFIG } from '@/lib/config'
import { data } from '@/lib/data'
import { DataError, friendlyMessage } from '@/lib/errors'
import { formatPrice, pluralize } from '@/lib/formatters'
import type { Category, Product } from '@/types'
import styles from './dashboard.module.css'
import { notifyDashboardChanged } from './dashboardData'
import { ProductFormModal } from './ProductFormModal'

export interface ProductsManagerProps {
  products: Product[]
  categories: Category[]
  /** Reloads the list after a change. */
  onChanged: () => Promise<void>
  /** Whether the add-product form is open: the page owns the "Add product" button. */
  adding: boolean
  onAddingChange: (adding: boolean) => void
}

function ShopStatus({ product }: { product: Product }) {
  return product.is_active ? <Badge variant="positive">In shop</Badge> : <Badge variant="neutral">Hidden</Badge>
}

/** Operator product list: add, edit, hide or show, and delete. */
export function ProductsManager({ products, categories, onChanged, adding, onAddingChange }: ProductsManagerProps) {
  const toast = useToast()
  const isWide = useMediaQuery('(min-width: 1024px)')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteFailure, setDeleteFailure] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const paged = paginate(products, page, SHOP_CONFIG.tablePageSize)
  const categoryName = (product: Product) =>
    categories.find((category) => category.id === product.category_id)?.name ?? 'No category'

  async function toggle(product: Product) {
    if (togglingId) return
    setTogglingId(product.id)
    try {
      await data.admin.setProductActive(product.id, !product.is_active)
      await onChanged()
      toast.success(product.is_active ? `Hidden from shop: ${product.name}` : `Showing in shop: ${product.name}`)
    } catch (error) {
      toast.error(friendlyMessage(error))
    } finally {
      setTogglingId(null)
    }
  }

  async function confirmDelete() {
    if (!deleting || deletePending) return
    setDeletePending(true)
    setDeleteFailure(null)
    try {
      await data.admin.deleteProduct(deleting.id)
      const name = deleting.name
      setDeleting(null)
      await onChanged()
      notifyDashboardChanged()
      toast.success(`Product deleted: ${name}`)
      // The row that opened the dialog is gone, so focus goes to the list heading.
      requestAnimationFrame(() => headingRef.current?.focus())
    } catch (error) {
      setDeleteFailure(
        error instanceof DataError && error.code === 'in-use'
          ? `${deleting.name} is part of past orders, so it can't be deleted. Hide it from the shop instead.`
          : friendlyMessage(error),
      )
    } finally {
      setDeletePending(false)
    }
  }

  function actions(product: Product, size: 'sm' | 'md') {
    return (
      <>
        <Button variant="secondary" size={size} onClick={() => setEditing(product)}>
          Edit<span className="visually-hidden"> {product.name}</span>
        </Button>
        <Button
          variant="ghost"
          size={size}
          loading={togglingId === product.id}
          loadingLabel="Saving"
          onClick={() => void toggle(product)}
        >
          {product.is_active ? 'Hide from shop' : 'Show in shop'}
          <span className="visually-hidden">: {product.name}</span>
        </Button>
        <Button
          variant="ghost"
          size={size}
          onClick={() => {
            setDeleteFailure(null)
            setDeleting(product)
          }}
        >
          Delete<span className="visually-hidden"> {product.name}</span>
        </Button>
      </>
    )
  }

  return (
    <div className={styles.manager}>
      <div className={styles.toolbar}>
        <h2 ref={headingRef} tabIndex={-1} className={`type-heading-3 ${styles.heading}`}>
          All products
        </h2>
        <p className={`type-ui ${styles.count}`} role="status">
          {pluralize(products.length, 'product')}
        </p>
      </div>

      {isWide ? (
        <Table caption="Products">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Picture</span>
              </th>
              <th scope="col">Product</th>
              <th scope="col">Category</th>
              <th scope="col" className={numericCellClassName}>
                Price
              </th>
              <th scope="col" className={numericCellClassName}>
                In stock
              </th>
              <th scope="col">Shop</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((product) => (
              <tr key={product.id}>
                <td>
                  <div className={`${styles.thumb} ${styles.thumbSmall}`}>
                    <ProductImage image={product.images[0]} shape="thumbnail" decorative />
                  </div>
                </td>
                <th scope="row" className={styles.typed}>
                  {product.name}
                </th>
                <td>{categoryName(product)}</td>
                <td className={numericCellClassName}>{formatPrice(product.price_cents)}</td>
                <td className={numericCellClassName}>{product.stock}</td>
                <td>
                  <ShopStatus product={product} />
                </td>
                <td>
                  <div className={styles.rowActions}>{actions(product, 'sm')}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <ul className={styles.records}>
          {paged.rows.map((product) => (
            <li key={product.id} className={styles.record}>
              <div className={styles.recordHeader}>
                <div className={styles.recordMain}>
                  <div className={styles.thumb}>
                    <ProductImage image={product.images[0]} shape="thumbnail" decorative />
                  </div>
                  <h3 className={`type-ui-strong ${styles.typed}`}>{product.name}</h3>
                </div>
                <ShopStatus product={product} />
              </div>
              <dl className={`type-ui ${styles.recordFacts}`}>
                <dt className={styles.secondary}>Category</dt>
                <dd>{categoryName(product)}</dd>
                <dt className={styles.secondary}>Price</dt>
                <dd className={styles.numbers}>{formatPrice(product.price_cents)}</dd>
                <dt className={styles.secondary}>In stock</dt>
                <dd className={styles.numbers}>{product.stock}</dd>
              </dl>
              <div className={styles.recordActions}>{actions(product, 'md')}</div>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={paged.page} pageCount={paged.pageCount} onPageChange={setPage} label="Products" />

      <ProductFormModal
        open={adding || editing !== null}
        product={editing}
        categories={categories}
        onClose={() => {
          setEditing(null)
          onAddingChange(false)
        }}
        onSaved={() => {
          setEditing(null)
          onAddingChange(false)
          notifyDashboardChanged()
          void onChanged()
        }}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        variant="confirm"
        title={`Delete ${deleting?.name ?? 'product'}?`}
        busy={deletePending}
        error={deleteFailure}
        footer={
          <>
            <Button variant="danger" loading={deletePending} loadingLabel="Deleting product" onClick={() => void confirmDelete()}>
              Delete product
            </Button>
            <Button variant="secondary" data-autofocus="" disabled={deletePending} onClick={() => setDeleting(null)}>
              Keep product
            </Button>
          </>
        }
      >
        <p className="type-body">
          This removes it from the shop and the dashboard for good. This can&apos;t be undone. To take it off sale
          for a while, hide it from the shop instead.
        </p>
      </Modal>
    </div>
  )
}
