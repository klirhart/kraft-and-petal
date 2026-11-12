/*
 * Sample backend. Runs entirely in the browser so the app works with no
 * Supabase project. It applies the same rules the database enforces with Row
 * Level Security (see supabase/migrations), so screens behave the same in
 * both modes. It is a demo, not a security boundary: anything stored here
 * belongs to the person using this browser.
 */
import { LIMITS } from '@/lib/config'
import { DataError } from '@/lib/errors'
import { formatDate } from '@/lib/formatters'
import { earliestDeliveryDate } from '@/lib/validators'
import type {
  Category,
  Order,
  OrderItem,
  OrderStatus,
  PlaceOrderInput,
  Product,
  ProductImage,
  ProductInput,
  Profile,
  Session,
} from '@/types'
import { CLOSED_ORDER_STATUSES, ORDER_STATUSES } from '@/types'
import type { DataSource } from '../types'
import {
  SAMPLE_CATEGORIES,
  SAMPLE_ORDERS,
  SAMPLE_PRODUCTS,
  SAMPLE_PRODUCT_IMAGES,
  SAMPLE_USERS,
} from './sampleData'

type ProductRow = Omit<Product, 'images'>
type OrderRow = Omit<Order, 'items' | 'customer_name'>

interface LocalUser {
  id: string
  email: string
  password_hash: string
}

interface LocalDb {
  version: 1
  users: LocalUser[]
  profiles: Profile[]
  categories: Category[]
  products: ProductRow[]
  product_images: ProductImage[]
  orders: OrderRow[]
  order_items: OrderItem[]
  /** One-time keys of placed orders, so a repeated request creates nothing new. */
  order_requests?: { id: string; order_id: string; customer_id: string }[]
}

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface LocalDataSourceOptions {
  storage?: KeyValueStore
  latencyMs?: number
  now?: () => Date
}

export interface LocalDataSource extends DataSource {
  /** Throws away every change and restores the sample data. */
  reset(): Promise<void>
}

const DB_KEY = 'kraft-petal.sample-db.v1'
const SESSION_KEY = 'kraft-petal.sample-session.v1'
const DAY_MS = 24 * 60 * 60 * 1000

function memoryStore(): KeyValueStore {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  }
}

function browserStore(): KeyValueStore {
  try {
    const probe = '__kraft-petal-probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    // Private windows and locked-down browsers: keep data for this visit only.
    return memoryStore()
  }
}

function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/** Sample passwords are stored hashed so they are not readable in dev tools. */
async function hashPassword(email: string, password: string, scheme?: string): Promise<string> {
  const input = `${email.trim().toLowerCase()}:${password}`
  const canUseSha = typeof crypto.subtle?.digest === 'function'
  if (scheme === 'sha256' && !canUseSha) {
    throw new DataError('unknown', 'Sample sign-in needs a secure page (https or localhost).')
  }
  if (canUseSha && scheme !== 'basic') {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
    return `sha256:${hex}`
  }
  // Pages served over plain http have no Web Crypto. Fall back to a simple
  // checksum; acceptable only because sample accounts guard nothing real.
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `basic:${(hash >>> 0).toString(16)}`
}

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

async function buildSampleDb(now: Date): Promise<LocalDb> {
  const users: LocalUser[] = []
  const profiles: Profile[] = []
  for (const user of SAMPLE_USERS) {
    users.push({
      id: user.id,
      email: user.email,
      password_hash: await hashPassword(user.email, user.password),
    })
    profiles.push({
      id: user.profileId,
      created_at: new Date(now.getTime() - 60 * DAY_MS).toISOString(),
      user_id: user.id,
      full_name: user.fullName,
      role: user.role,
      customer_number: profiles.length + 1,
    })
  }

  const orders: OrderRow[] = []
  const order_items: OrderItem[] = []
  for (const [orderIndex, sample] of SAMPLE_ORDERS.entries()) {
    const placedAt = new Date(now.getTime() - sample.placedDaysAgo * DAY_MS - 60 * 60 * 1000)
    let total = 0
    sample.lines.forEach((line, index) => {
      const product = SAMPLE_PRODUCTS.find((entry) => entry.slug === line.slug)
      if (!product) throw new Error(`Unknown sample product: ${line.slug}`)
      total += product.price_cents * line.quantity
      const itemNumber = `${String(orderIndex + 1).padStart(4, '0')}${String(index + 1).padStart(4, '0')}`
      order_items.push({
        id: `${sample.id.slice(0, 24)}0007${itemNumber}`,
        created_at: placedAt.toISOString(),
        order_id: sample.id,
        product_id: product.id,
        product_name: product.name,
        quantity: line.quantity,
        unit_price_cents: product.price_cents,
      })
    })
    orders.push({
      id: sample.id,
      created_at: placedAt.toISOString(),
      customer_id: sample.customerUserId,
      status: sample.status,
      total_cents: total,
      delivery_date: isoDate(new Date(now.getTime() + sample.deliveryInDays * DAY_MS)),
      delivery_address: sample.address,
      note: sample.note,
    })
  }

  return {
    version: 1,
    users,
    profiles,
    categories: SAMPLE_CATEGORIES.map((category) => ({ ...category })),
    products: SAMPLE_PRODUCTS.map((product) => ({ ...product })),
    product_images: SAMPLE_PRODUCT_IMAGES.map((image) => ({ ...image })),
    orders,
    order_items,
  }
}

function isLocalDb(value: unknown): value is LocalDb {
  if (typeof value !== 'object' || value === null) return false
  const db = value as Partial<Record<keyof LocalDb, unknown>>
  const tables: (keyof LocalDb)[] = [
    'users',
    'profiles',
    'categories',
    'products',
    'product_images',
    'orders',
    'order_items',
  ]
  return db.version === 1 && tables.every((table) => Array.isArray(db[table]))
}

export function createLocalDataSource(options: LocalDataSourceOptions = {}): LocalDataSource {
  const storage = options.storage ?? browserStore()
  const latencyMs = options.latencyMs ?? 0
  const now = options.now ?? (() => new Date())
  const listeners = new Set<(session: Session | null) => void>()
  let dbPromise: Promise<LocalDb> | null = null

  function save(db: LocalDb): void {
    try {
      storage.setItem(DB_KEY, JSON.stringify(db))
    } catch {
      // Storage full or blocked: the change still applies for this visit.
    }
  }

  async function loadDb(): Promise<LocalDb> {
    try {
      const raw = storage.getItem(DB_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (isLocalDb(parsed)) return parsed
      }
    } catch {
      // Unreadable sample data is replaced with a fresh copy below.
    }
    const fresh = await buildSampleDb(now())
    save(fresh)
    return fresh
  }

  function getDb(): Promise<LocalDb> {
    dbPromise ??= loadDb()
    return dbPromise
  }

  /** Every call waits like a network request would, then reads the database. */
  async function open(): Promise<LocalDb> {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs))
    return getDb()
  }

  function sessionFor(db: LocalDb, userId: string | null): Session | null {
    if (!userId) return null
    const user = db.users.find((entry) => entry.id === userId)
    const profile = db.profiles.find((entry) => entry.user_id === userId)
    if (!user || !profile) return null
    return { userId: user.id, email: user.email, profile: { ...profile } }
  }

  function currentSession(db: LocalDb): Session | null {
    return sessionFor(db, storage.getItem(SESSION_KEY))
  }

  function requireSession(db: LocalDb): Session {
    const session = currentSession(db)
    if (!session) throw new DataError('auth-required', 'Sign in to continue.')
    return session
  }

  function requireOperator(db: LocalDb): Session {
    const session = requireSession(db)
    if (session.profile.role !== 'operator') {
      throw new DataError('forbidden', 'Only shop staff can do that.')
    }
    return session
  }

  function setSession(session: Session | null): void {
    if (session) storage.setItem(SESSION_KEY, session.userId)
    else storage.removeItem(SESSION_KEY)
    for (const listener of listeners) listener(session)
  }

  function withImages(db: LocalDb, product: ProductRow): Product {
    const images = db.product_images
      .filter((image) => image.product_id === product.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((image) => ({ ...image }))
    return { ...product, images }
  }

  function byCreated(a: { created_at: string }, b: { created_at: string }): number {
    return a.created_at.localeCompare(b.created_at)
  }

  function withItems(db: LocalDb, order: OrderRow, includeCustomer: boolean): Order {
    const items = db.order_items
      .filter((item) => item.order_id === order.id)
      .map((item) => ({ ...item }))
    const result: Order = { ...order, items }
    if (includeCustomer) {
      const customer = db.profiles.find((profile) => profile.user_id === order.customer_id)
      result.customer_name = customer?.full_name ?? 'Unknown customer'
    }
    return result
  }

  function findProduct(db: LocalDb, id: string): ProductRow {
    const product = db.products.find((entry) => entry.id === id)
    if (!product) throw new DataError('not-found', 'That product no longer exists.')
    return product
  }

  /** Mirrors the table constraints in the migration. */
  function checkProductInput(db: LocalDb, input: ProductInput, ignoreId?: string): void {
    const fail = (message: string) => new DataError('invalid', message)
    if (!input.name.trim()) throw fail('Enter a product name.')
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
      throw fail('Use lowercase letters, numbers and hyphens for the web address name.')
    }
    if (!Number.isInteger(input.price_cents) || input.price_cents < 0) {
      throw fail('Enter the price as a whole number of pence.')
    }
    if (!Number.isInteger(input.stock) || input.stock < 0) {
      throw fail('Stock must be a whole number, zero or more.')
    }
    if (!db.categories.some((category) => category.id === input.category_id)) {
      throw fail('Choose a category.')
    }
    if (!input.image.storage_path.trim()) throw fail('Choose a picture.')
    if (!input.image.alt_text.trim()) {
      throw fail('Enter an image description for people who cannot see the picture.')
    }
    if (input.name.trim().length > LIMITS.productName) throw fail('That product name is too long.')
    if (input.description.length > LIMITS.productDescription) throw fail('That description is too long.')
    if (input.image.alt_text.trim().length > LIMITS.imageDescription) {
      throw fail('That image description is too long.')
    }
    if (db.products.some((entry) => entry.slug === input.slug && entry.id !== ignoreId)) {
      throw fail('Another product already uses that web address name.')
    }
  }

  return {
    async reset() {
      storage.removeItem(DB_KEY)
      dbPromise = null
      await getDb()
      setSession(null)
    },

    auth: {
      async getSession() {
        return currentSession(await getDb())
      },

      onSessionChange(listener) {
        listeners.add(listener)
        return () => {
          listeners.delete(listener)
        }
      },

      async signIn({ email, password }) {
        const db = await open()
        const normalised = email.trim().toLowerCase()
        const user = db.users.find((entry) => entry.email === normalised)
        const scheme = user?.password_hash.split(':')[0]
        if (!user || user.password_hash !== (await hashPassword(normalised, password, scheme))) {
          throw new DataError('invalid-credentials', 'Email or password is incorrect.')
        }
        const session = sessionFor(db, user.id)
        if (!session) throw new DataError('unknown', 'That account has no profile.')
        setSession(session)
        return session
      },

      async signUp({ email, password, fullName }) {
        const db = await open()
        const normalised = email.trim().toLowerCase()
        if (db.users.some((entry) => entry.email === normalised)) {
          throw new DataError('email-taken', 'An account with that email already exists.')
        }
        const user: LocalUser = {
          id: newId(),
          email: normalised,
          password_hash: await hashPassword(normalised, password),
        }
        // New accounts are always customers. Operators are promoted by the
        // shop owner, never by the sign-up form.
        const profile: Profile = {
          id: newId(),
          created_at: now().toISOString(),
          user_id: user.id,
          full_name: fullName.trim(),
          role: 'customer',
          customer_number: Math.max(0, ...db.profiles.map((p) => p.customer_number ?? 0)) + 1,
        }
        db.users.push(user)
        db.profiles.push(profile)
        save(db)
        const session: Session = { userId: user.id, email: user.email, profile: { ...profile } }
        setSession(session)
        return { session, needsEmailConfirmation: false }
      },

      async signOut() {
        await open()
        setSession(null)
      },

      async listSampleAccounts() {
        return SAMPLE_USERS.filter((user) => user.listed).map((user) => ({
          role: user.role,
          fullName: user.fullName,
          email: user.email,
          password: user.password,
        }))
      },
    },

    catalog: {
      async listCategories() {
        const db = await open()
        return db.categories
          .map((category) => ({ ...category }))
          .sort((a, b) => a.sort_order - b.sort_order)
      },

      async listProducts(filter = {}) {
        const db = await open()
        let rows = db.products.filter((product) => product.is_active)
        if (filter.categorySlug) {
          const category = db.categories.find((entry) => entry.slug === filter.categorySlug)
          rows = category ? rows.filter((product) => product.category_id === category.id) : []
        }
        rows = [...rows].sort(byCreated)
        if (filter.limit !== undefined) rows = rows.slice(0, filter.limit)
        return rows.map((product) => withImages(db, product))
      },

      async getProductBySlug(slug) {
        const db = await open()
        const product = db.products.find((entry) => entry.slug === slug && entry.is_active)
        return product ? withImages(db, product) : null
      },

      async getProductsByIds(ids) {
        const db = await open()
        return db.products
          .filter((product) => product.is_active && ids.includes(product.id))
          .map((product) => withImages(db, product))
      },
    },

    orders: {
      async uploadPaymentProof(_file, _requestId) {
        // Sample mode stores no real payment proof and does not accept payments.
        return 'sample-proof-only'
      },
      async place(input: PlaceOrderInput) {
        const db = await open()
        const session = requireSession(db)

        // A repeated request (double press, reload mid-submit) returns the first order.
        const repeated = input.request_id
          ? (db.order_requests ?? []).find(
              (entry) => entry.id === input.request_id && entry.customer_id === session.userId,
            )
          : undefined
        const existing = repeated && db.orders.find((entry) => entry.id === repeated.order_id)
        if (existing) return { ...withItems(db, existing, false), customer_number: db.profiles.find(p => p.user_id === session.userId)?.customer_number }

        if (input.items.length === 0) {
          throw new DataError('invalid', 'Your cart is empty.')
        }
        if (!input.delivery_address.trim()) {
          throw new DataError('invalid', 'Enter a delivery address.')
        }
        const earliest = earliestDeliveryDate(now())
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.delivery_date) || input.delivery_date < earliest) {
          throw new DataError('invalid', `Choose a delivery date from ${formatDate(earliest)}.`)
        }
        if (input.delivery_address.length > LIMITS.deliveryAddress) {
          throw new DataError('invalid', 'Shorten the delivery address a little.')
        }
        if ((input.note ?? '').length > LIMITS.orderNote) {
          throw new DataError('invalid', `Keep the note to ${LIMITS.orderNote} characters or fewer.`)
        }

        const quantities = new Map<string, number>()
        for (const line of input.items) {
          if (!Number.isInteger(line.quantity) || line.quantity < 1) {
            throw new DataError('invalid', 'Each item needs a quantity of one or more.')
          }
          quantities.set(line.product_id, (quantities.get(line.product_id) ?? 0) + line.quantity)
        }

        // Check everything first so a failed order changes nothing.
        const lines: { product: ProductRow; quantity: number }[] = []
        for (const [productId, quantity] of quantities) {
          const product = db.products.find((entry) => entry.id === productId)
          if (!product || !product.is_active) {
            throw new DataError(
              'unavailable',
              product
                ? `Sorry, ${product.name} is no longer available.`
                : 'Sorry, one of your items is no longer available.',
            )
          }
          if (product.stock < quantity) {
            throw new DataError(
              'out-of-stock',
              product.stock === 0
                ? `Sorry, ${product.name} has just sold out.`
                : `Sorry, we only have ${product.stock} of ${product.name} left.`,
            )
          }
          lines.push({ product, quantity })
        }

        const createdAt = now().toISOString()
        const orderId = newId()
        let total = 0
        for (const { product, quantity } of lines) {
          // Prices come from the catalogue, never from the caller.
          total += product.price_cents * quantity
          product.stock -= quantity
          db.order_items.push({
            id: newId(),
            created_at: createdAt,
            order_id: orderId,
            product_id: product.id,
            product_name: product.name,
            quantity,
            unit_price_cents: product.price_cents,
          })
        }
        const order: OrderRow = {
          id: orderId,
          created_at: createdAt,
          customer_id: session.userId,
          status: 'pending',
          total_cents: total,
          delivery_date: input.delivery_date,
          delivery_address: input.delivery_address.trim(),
          note: input.note?.trim() || null,
          payment_method: input.payment_method ?? 'cod',
          payment_status: input.payment_method && input.payment_method !== 'cod' ? 'pending_verification' : 'unpaid_cod',
          payment_reference: input.payment_reference ?? null,
          payment_proof_path: input.payment_proof_path ?? null,
        }
        db.orders.push(order)
        if (input.request_id) {
          db.order_requests = [
            ...(db.order_requests ?? []),
            { id: input.request_id, order_id: orderId, customer_id: session.userId },
          ]
        }
        save(db)
        return { ...withItems(db, order, false), customer_number: db.profiles.find(p => p.user_id === session.userId)?.customer_number }
      },

      async listMine() {
        const db = await open()
        const session = requireSession(db)
        return db.orders
          .filter((order) => order.customer_id === session.userId)
          .sort((a, b) => byCreated(b, a))
          .map((order) => ({ ...withItems(db, order, false), customer_number: db.profiles.find(p => p.user_id === session.userId)?.customer_number ?? db.profiles.findIndex(p => p.user_id === session.userId) + 1 }))
      },
    },

    admin: {
      async listProducts() {
        const db = await open()
        requireOperator(db)
        return [...db.products].sort(byCreated).map((product) => withImages(db, product))
      },

      async createProduct(input) {
        const db = await open()
        requireOperator(db)
        checkProductInput(db, input)
        const createdAt = now().toISOString()
        const product: ProductRow = {
          id: newId(),
          created_at: createdAt,
          category_id: input.category_id,
          name: input.name.trim(),
          slug: input.slug,
          description: input.description.trim(),
          price_cents: input.price_cents,
          stock: input.stock,
          is_active: input.is_active,
        }
        db.products.push(product)
        db.product_images.push({
          id: newId(),
          created_at: createdAt,
          product_id: product.id,
          storage_path: input.image.storage_path,
          alt_text: input.image.alt_text.trim(),
          sort_order: 0,
        })
        save(db)
        return withImages(db, product)
      },

      async updateProduct(id, input) {
        const db = await open()
        requireOperator(db)
        const product = findProduct(db, id)
        checkProductInput(db, input, id)
        Object.assign(product, {
          category_id: input.category_id,
          name: input.name.trim(),
          slug: input.slug,
          description: input.description.trim(),
          price_cents: input.price_cents,
          stock: input.stock,
          is_active: input.is_active,
        })
        const image = db.product_images
          .filter((entry) => entry.product_id === id)
          .sort((a, b) => a.sort_order - b.sort_order)[0]
        if (image) {
          image.storage_path = input.image.storage_path
          image.alt_text = input.image.alt_text.trim()
        } else {
          db.product_images.push({
            id: newId(),
            created_at: now().toISOString(),
            product_id: id,
            storage_path: input.image.storage_path,
            alt_text: input.image.alt_text.trim(),
            sort_order: 0,
          })
        }
        save(db)
        return withImages(db, product)
      },

      async setProductActive(id, isActive) {
        const db = await open()
        requireOperator(db)
        findProduct(db, id).is_active = isActive
        save(db)
      },

      async setProductStock(id, stock) {
        const db = await open()
        requireOperator(db)
        if (!Number.isInteger(stock) || stock < 0) {
          throw new DataError('invalid', 'Stock must be a whole number, zero or more.')
        }
        findProduct(db, id).stock = stock
        save(db)
      },

      async deleteProduct(id) {
        const db = await open()
        requireOperator(db)
        findProduct(db, id)
        if (db.order_items.some((item) => item.product_id === id)) {
          throw new DataError('in-use', 'This product appears in past orders.')
        }
        db.products = db.products.filter((product) => product.id !== id)
        db.product_images = db.product_images.filter((image) => image.product_id !== id)
        save(db)
      },

      async uploadProductImage() {
        const db = await open()
        requireOperator(db)
        throw new DataError(
          'invalid',
          'Photo uploads need Supabase Storage. On sample data, choose one of the built-in illustrations.',
        )
      },

      async listOrders() {
        const db = await open()
        requireOperator(db)
        return [...db.orders].sort((a, b) => byCreated(b, a)).map((order) => withItems(db, order, true))
      },

      async updateOrderStatus(id, status: OrderStatus) {
        const db = await open()
        requireOperator(db)
        if (!ORDER_STATUSES.includes(status)) {
          throw new DataError('invalid', 'That is not an order status.')
        }
        const order = db.orders.find((entry) => entry.id === id)
        if (!order) throw new DataError('not-found', 'That order no longer exists.')
        if (order.status === status) return
        if (CLOSED_ORDER_STATUSES.includes(order.status)) {
          throw new DataError('invalid', 'This order is closed, so its status can no longer change.')
        }
        if (status === 'cancelled') {
          // Cancelling puts the flowers back on the shelf.
          for (const item of db.order_items.filter((entry) => entry.order_id === id)) {
            const product = db.products.find((entry) => entry.id === item.product_id)
            if (product) product.stock += item.quantity
          }
        }
        order.status = status
        save(db)
      },
    },
  }
}
