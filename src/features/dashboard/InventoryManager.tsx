import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  Badge,
  Checkbox,
  EmptyState,
  Icon,
  Pagination,
  QuantityStepper,
  Table,
  paginate,
  useToast,
} from '@/components/ui'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SHOP_CONFIG } from '@/lib/config'
import { data } from '@/lib/data'
import { friendlyMessage } from '@/lib/errors'
import { pluralize } from '@/lib/formatters'
import type { Category, Product } from '@/types'
import styles from './dashboard.module.css'
import { isLowStock, notifyDashboardChanged } from './dashboardData'

export interface InventoryManagerProps {
  products: Product[]
  categories: Category[]
  onChanged: () => Promise<void>
}

const SAVE_AFTER_MS = 700

function StockLevel({ stock }: { stock: number }) {
  if (stock === 0) return <Badge variant="negative">0 in stock</Badge>
  if (stock <= SHOP_CONFIG.lowStockThreshold) return <Badge variant="attention">Low stock</Badge>
  return <Badge variant="positive">In stock</Badge>
}

/**
 * One product's stock. Changes save on their own a moment after the last
 * press, so stepping from 3 to 12 is one save. A failed save puts the old
 * number back and says so in this row only.
 */
function StockEditor({ product, onSaved }: { product: Product; onSaved: () => Promise<void> }) {
  const toast = useToast()
  const [value, setValue] = useState(product.stock)
  const [saving, setSaving] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const saved = useRef(product.stock)

  useEffect(() => {
    saved.current = product.stock
    setValue(product.stock)
  }, [product.stock])

  useEffect(() => {
    if (value === saved.current) return
    const timer = setTimeout(() => {
      setSaving(true)
      setFailure(null)
      data.admin
        .setProductStock(product.id, value)
        .then(async () => {
          saved.current = value
          toast.success(`Stock updated: ${product.name}, ${value}`)
          notifyDashboardChanged()
          await onSaved()
        })
        .catch((error: unknown) => {
          setValue(saved.current)
          setFailure(`${friendlyMessage(error)} The stock is still ${saved.current}.`)
        })
        .finally(() => setSaving(false))
    }, SAVE_AFTER_MS)
    return () => clearTimeout(timer)
    // The save runs for the latest value only.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [value])

  return (
    <div className={styles.stockCell}>
      <QuantityStepper
        itemName={product.name}
        value={value}
        min={0}
        max={SHOP_CONFIG.maxStock}
        maxReason={`${SHOP_CONFIG.maxStock} is the most we can track`}
        size="sm"
        loading={saving}
        onChange={(next) => {
          setFailure(null)
          setValue(next)
        }}
      />
      {failure ? (
        <p className={styles.rowError} role="alert">
          <Icon name="circle-alert" size="sm" />
          <span>{failure}</span>
        </p>
      ) : null}
    </div>
  )
}

/** Stock levels for every product, with a low-stock filter kept in the URL. */
export function InventoryManager({ products, categories, onChanged }: InventoryManagerProps) {
  const isWide = useMediaQuery('(min-width: 1024px)')
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const lowOnly = params.get('low') === '1'
  const filtered = lowOnly ? products.filter(isLowStock) : products
  const paged = paginate(filtered, page, SHOP_CONFIG.tablePageSize)
  const categoryName = (product: Product) =>
    categories.find((category) => category.id === product.category_id)?.name ?? 'No category'

  function setLowOnly(next: boolean) {
    setPage(1)
    setParams(next ? { low: '1' } : {}, { replace: true, preventScrollReset: true })
  }

  return (
    <div className={styles.manager}>
      <div className={styles.toolbar}>
        <Checkbox
          label={`Show low stock only (${SHOP_CONFIG.lowStockThreshold} or fewer)`}
          checked={lowOnly}
          onChange={(event) => setLowOnly(event.target.checked)}
        />
        <p className={`type-ui ${styles.count}`} role="status">
          {pluralize(filtered.length, 'product')}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          heading="Everything is well stocked"
          message={`No product is down to ${SHOP_CONFIG.lowStockThreshold} or fewer.`}
          action={
            <Link to="/admin/inventory" className="link-standalone" replace>
              Show all products
            </Link>
          }
        />
      ) : isWide ? (
        <Table caption="Inventory">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Category</th>
              <th scope="col">Shop</th>
              <th scope="col">Level</th>
              <th scope="col">In stock</th>
            </tr>
          </thead>
          <tbody>
            {paged.rows.map((product) => (
              <tr key={product.id}>
                <th scope="row" className={styles.typed}>
                  {product.name}
                </th>
                <td>{categoryName(product)}</td>
                <td>{product.is_active ? 'In shop' : 'Hidden'}</td>
                <td>
                  <StockLevel stock={product.stock} />
                </td>
                <td>
                  <StockEditor product={product} onSaved={onChanged} />
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
                <h2 className={`type-ui-strong ${styles.typed}`}>{product.name}</h2>
                <StockLevel stock={product.stock} />
              </div>
              <p className={`type-ui ${styles.secondary}`}>
                {categoryName(product)}, {product.is_active ? 'in shop' : 'hidden from shop'}
              </p>
              <StockEditor product={product} onSaved={onChanged} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={paged.page} pageCount={paged.pageCount} onPageChange={setPage} label="Inventory" />
    </div>
  )
}
