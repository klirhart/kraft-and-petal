import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PRODUCT_ILLUSTRATIONS } from '@/components/illustrations/ProductArt'
import {
  Alert,
  Button,
  Checkbox,
  ErrorSummary,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { ProductImage } from '@/features/catalog'
import { useForm } from '@/hooks/useForm'
import { IMAGE_UPLOAD, LIMITS, SHOP_CONFIG } from '@/lib/config'
import { data, supportsImageUpload } from '@/lib/data'
import { friendlyMessage } from '@/lib/errors'
import { centsToInputValue, currencySymbol, parsePriceToCents, slugify } from '@/lib/formatters'
import { ILLUSTRATION_PREFIX, prepareImageForUpload } from '@/lib/images'
import { parseStock, validateProductForm, type ProductFormValues } from '@/lib/validators'
import type { Category, Product } from '@/types'
import styles from './dashboard.module.css'

export interface ProductFormModalProps {
  open: boolean
  /** The product being edited, or null to add a new one. */
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: (product: Product) => void
}

type Values = ProductFormValues

function startValues(product: Product | null): Values {
  const image = product?.images[0]
  return {
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    categoryId: product?.category_id ?? '',
    description: product?.description ?? '',
    price: product ? centsToInputValue(product.price_cents) : '',
    stock: product ? String(product.stock) : '',
    storagePath: image?.storage_path ?? '',
    altText: image?.alt_text ?? '',
  }
}

function ProductForm({ product, categories, onClose, onSaved }: Omit<ProductFormModalProps, 'open'>) {
  const toast = useToast()
  const form = useForm<Values>(startValues(product), validateProductForm)
  const [isActive, setIsActive] = useState(product?.is_active ?? false)
  const [slugEdited, setSlugEdited] = useState(Boolean(product))
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [askDiscard, setAskDiscard] = useState(false)
  const [summaryShown, setSummaryShown] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const discardRef = useRef<HTMLDivElement>(null)
  const formId = form.fieldId('name') + '-form'
  const dirty = form.isDirty || isActive !== (product?.is_active ?? false)
  const { storagePath, altText } = form.values
  const uploadedPath = storagePath && !storagePath.startsWith(ILLUSTRATION_PREFIX) ? storagePath : null

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  function requestClose() {
    if (dirty && !askDiscard) {
      setAskDiscard(true)
      requestAnimationFrame(() => discardRef.current?.focus())
      return
    }
    onClose()
  }

  function choosePicture(path: string) {
    form.setValue('storagePath', path)
    const key = path.startsWith(ILLUSTRATION_PREFIX) ? path.slice(ILLUSTRATION_PREFIX.length) : ''
    const suggestion = PRODUCT_ILLUSTRATIONS[key]?.defaultAlt
    const isSuggestion = Object.values(PRODUCT_ILLUSTRATIONS).some((entry) => entry.defaultAlt === altText)
    // Offer a description for a built-in picture, without overwriting one the operator wrote.
    if (suggestion && (!altText.trim() || isSuggestion)) form.setValue('altText', suggestion)
  }

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setFailure(null)
    try {
      const path = await data.admin.uploadProductImage(await prepareImageForUpload(file))
      form.setValue('storagePath', path)
      const isSuggestion = Object.values(PRODUCT_ILLUSTRATIONS).some((entry) => entry.defaultAlt === altText)
      if (isSuggestion) form.setValue('altText', '')
    } catch (error) {
      setFailure(friendlyMessage(error))
    } finally {
      setUploading(false)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const invalid = form.validateAll()
    setSummaryShown(invalid.length > 0)
    if (invalid.length > 0) {
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    const { values } = form
    const input = {
      category_id: values.categoryId,
      name: values.name.trim(),
      slug: values.slug,
      description: values.description.trim(),
      price_cents: parsePriceToCents(values.price) ?? 0,
      stock: parseStock(values.stock) ?? 0,
      is_active: isActive,
      image: { storage_path: values.storagePath, alt_text: values.altText.trim() },
    }
    setPending(true)
    setFailure(null)
    try {
      const saved = product
        ? await data.admin.updateProduct(product.id, input)
        : await data.admin.createProduct(input)
      toast.success(`Product saved: ${saved.name}`)
      onSaved(saved)
    } catch (error) {
      setFailure(friendlyMessage(error))
      setPending(false)
    }
  }

  const visibleSummary = summaryShown ? form.errorList : []
  const nameField = form.field('name')

  return (
    <Modal
      open
      onClose={requestClose}
      variant="form"
      title={product ? `Edit ${product.name}` : 'Add product'}
      busy={pending}
      error={failure}
      footer={
        <>
          <Button type="submit" form={formId} loading={pending} loadingLabel="Saving product">
            Save product
          </Button>
          <Button variant="secondary" disabled={pending} onClick={requestClose}>
            Cancel
          </Button>
        </>
      }
    >
      {askDiscard ? (
        <Alert
          variant="warning"
          title="Discard your changes?"
          ref={discardRef}
          focusable
          action={
            <div className={styles.recordActions}>
              <Button variant="secondary" onClick={onClose}>
                Discard changes
              </Button>
              <Button variant="ghost" onClick={() => setAskDiscard(false)}>
                Keep editing
              </Button>
            </div>
          }
        >
          What you typed here hasn&apos;t been saved.
        </Alert>
      ) : null}
      <form
        id={formId}
        className={styles.form}
        onSubmit={(event) => void onSubmit(event)}
        noValidate
        aria-busy={pending || undefined}
      >
        <ErrorSummary errors={visibleSummary} ref={summaryRef} />
        <Input
          {...nameField}
          onChange={(event) => {
            nameField.onChange(event)
            if (!slugEdited) form.setValue('slug', slugify(event.target.value))
          }}
          label="Name"
          maxLength={LIMITS.productName}
          autoComplete="off"
        />
        <Input
          {...form.field('slug')}
          onChange={(event) => {
            setSlugEdited(true)
            form.setValue('slug', event.target.value)
          }}
          label="Web address name"
          hint="Lowercase letters, numbers and hyphens. It becomes the end of the product link."
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        <Select {...form.field('categoryId')} label="Category">
          <option value="">Choose a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Textarea
          {...form.field('description')}
          label="Description"
          optional
          rows={4}
          maxLength={LIMITS.productDescription}
        />
        <div className={styles.pair}>
          <Input
            {...form.field('price')}
            label="Price"
            inputMode="decimal"
            adornment={currencySymbol}
            hint="For example 24.50"
            autoComplete="off"
          />
          <Input
            {...form.field('stock')}
            label="In stock"
            inputMode="numeric"
            hint={`A whole number up to ${SHOP_CONFIG.maxStock}`}
            autoComplete="off"
          />
        </div>
        <div className={styles.picture}>
          <div className={styles.preview}>
            <ProductImage
              image={
                storagePath
                  ? { id: 'preview', created_at: '', product_id: '', storage_path: storagePath, alt_text: '', sort_order: 0 }
                  : undefined
              }
              shape="thumbnail"
              decorative
            />
          </div>
          <Select
            {...form.field('storagePath')}
            onChange={(event) => choosePicture(event.target.value)}
            label="Picture"
            loading={uploading}
            loadingLabel="Uploading photo"
          >
            <option value="">Choose a picture</option>
            {uploadedPath ? <option value={uploadedPath}>Uploaded photo</option> : null}
            {Object.entries(PRODUCT_ILLUSTRATIONS).map(([key, entry]) => (
              <option key={key} value={`${ILLUSTRATION_PREFIX}${key}`}>
                {entry.label}
              </option>
            ))}
          </Select>
        </div>
        {supportsImageUpload ? (
          <Input
            label="Upload a photo instead"
            optional
            type="file"
            accept={IMAGE_UPLOAD.accept}
            disabled={uploading || pending}
            hint="JPEG, PNG or WebP. Large photos are shrunk to 1600px and 300 KB before they are sent."
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        ) : null}
        <Textarea
          {...form.field('altText')}
          label="Image description"
          rows={2}
          maxLength={LIMITS.imageDescription}
          hint="Say what is in the picture, for people who can't see it."
        />
        <Checkbox
          label="Show in shop"
          hint="Leave this off to keep the product hidden from customers."
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
      </form>
    </Modal>
  )
}

/** Add or edit a product in a form modal. The form remounts for each product, so it always starts clean. */
export function ProductFormModal({ open, product, categories, onClose, onSaved }: ProductFormModalProps) {
  if (!open) return null
  return (
    <ProductForm key={product?.id ?? 'new'} product={product} categories={categories} onClose={onClose} onSaved={onSaved} />
  )
}
