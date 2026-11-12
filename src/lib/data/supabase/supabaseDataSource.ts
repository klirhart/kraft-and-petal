/*
 * Supabase backend. Uses only the public URL and anon key; every permission
 * is decided by the Row Level Security policies in supabase/migrations.
 */
import type { AuthError, PostgrestError, SupabaseClient, User } from '@supabase/supabase-js'
import { IMAGE_UPLOAD } from '@/lib/config'
import { DataError } from '@/lib/errors'
import { PRODUCT_IMAGE_BUCKET } from '@/lib/images'
import type { Order, OrderItem, Product, ProductImage, ProductInput, Profile, Session } from '@/types'
import type { DataSource } from '../types'

const PRODUCT_COLUMNS =
  'id, created_at, category_id, name, slug, description, price_cents, stock, is_active, ' +
  'images:product_images(id, created_at, product_id, storage_path, alt_text, sort_order)'

const ORDER_COLUMNS =
  'id, created_at, customer_id, status, total_cents, delivery_date, delivery_address, note, payment_method, payment_status, payment_reference, payment_proof_path, ' +
  'items:order_items(id, created_at, order_id, product_id, product_name, quantity, unit_price_cents)'


type OrderRowWithCustomer = Order & { customer?: { full_name: string; customer_number: number } | null }

/** Messages raised on purpose by the database functions in the migration. */
const DATABASE_SIGNALS: Record<string, DataError['code']> = {
  KP_AUTH_REQUIRED: 'auth-required',
  KP_OUT_OF_STOCK: 'out-of-stock',
  KP_PRODUCT_UNAVAILABLE: 'unavailable',
  KP_INVALID_ORDER: 'invalid',
  KP_ORDER_CLOSED: 'invalid',
}

function fromPostgrest(error: PostgrestError): DataError {
  const signal = DATABASE_SIGNALS[error.message]
  if (signal) return new DataError(signal, error.details || error.message, { cause: error })
  switch (error.code) {
    case '42501':
      return new DataError('forbidden', 'Not allowed.', { cause: error })
    case 'PGRST301':
    case 'PGRST302':
      return new DataError('auth-required', 'Sign in again to continue.', { cause: error })
    case 'PGRST116':
      return new DataError('not-found', 'Not found.', { cause: error })
    case '23505':
      return new DataError('invalid', 'Another product already uses that web address name.', {
        cause: error,
      })
    // 23001 is what PostgreSQL 18 reports for an ON DELETE RESTRICT reference.
    case '23001':
    case '23503':
      return new DataError('in-use', 'This is referenced by other records.', { cause: error })
    case '23502':
    case '23514':
    case '22023':
    case '22P02':
      return new DataError('invalid', 'Some of those details were not accepted. Please check them.', {
        cause: error,
      })
    default:
      if (/fetch|network/i.test(error.message)) {
        return new DataError('network', 'Network request failed.', { cause: error })
      }
      return new DataError('unknown', 'Unexpected database error.', { cause: error })
  }
}

function fromAuth(error: AuthError): DataError {
  const code = error.code ?? ''
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
    return new DataError('invalid-credentials', 'Email or password is incorrect.', { cause: error })
  }
  if (code === 'user_already_exists' || /already registered/i.test(error.message)) {
    return new DataError('email-taken', 'An account with that email already exists.', { cause: error })
  }
  if (code === 'weak_password') {
    return new DataError('invalid', 'Please choose a longer, harder to guess password.', {
      cause: error,
    })
  }
  if (code === 'email_not_confirmed') {
    return new DataError('invalid', 'Please confirm your email first. Check your inbox for our link.', {
      cause: error,
    })
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
    return new DataError('invalid', 'Too many tries. Please wait a minute and try again.', {
      cause: error,
    })
  }
  if (error.status === 0 || /fetch|network/i.test(error.message)) {
    return new DataError('network', 'Network request failed.', { cause: error })
  }
  return new DataError('unknown', 'Unexpected sign-in error.', { cause: error })
}

function sortImages(product: Product): Product {
  const images: ProductImage[] = [...(product.images ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  )
  return { ...product, images }
}

function toOrder(row: OrderRowWithCustomer): Order {
  const { customer, ...order } = row
  const items: OrderItem[] = order.items ?? []
  return customer ? { ...order, items, customer_name: customer.full_name, customer_number: customer.customer_number } : { ...order, items }
}

export function createSupabaseDataSource(supabase: SupabaseClient): DataSource {
  async function loadSession(user: User | null | undefined): Promise<Session | null> {
    if (!user) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('id, created_at, user_id, full_name, role, customer_number')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw fromPostgrest(error)
    if (!data) return null
    return { userId: user.id, email: user.email ?? '', profile: data as Profile }
  }

  /** Updates and deletes blocked by Row Level Security match no rows instead of failing. */
  function requireAffected(rows: unknown[] | null): void {
    if (!rows || rows.length === 0) {
      throw new DataError('forbidden', 'Nothing was changed. Your account may not be allowed to do that.')
    }
  }

  async function fetchProduct(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('id', id)
      .single()
    if (error) throw fromPostgrest(error)
    return sortImages(data as unknown as Product)
  }

  function productRow(input: ProductInput) {
    return {
      category_id: input.category_id,
      name: input.name.trim(),
      slug: input.slug,
      description: input.description.trim(),
      price_cents: input.price_cents,
      stock: input.stock,
      is_active: input.is_active,
    }
  }

  return {
    auth: {
      async getSession() {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw fromAuth(error)
        return loadSession(data.session?.user)
      },

      onSessionChange(listener) {
        const { data } = supabase.auth.onAuthStateChange((event, authSession) => {
          if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') return
          // Supabase must not be called from inside this callback, so the
          // profile lookup runs on the next tick.
          setTimeout(() => {
            loadSession(authSession?.user).then(listener, () => listener(null))
          }, 0)
        })
        return () => data.subscription.unsubscribe()
      },

      async signIn({ email, password }) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw fromAuth(error)
        const session = await loadSession(data.user)
        if (!session) throw new DataError('unknown', 'That account has no profile yet.')
        return session
      },

      async signUp({ email, password, fullName }) {
        // The profile row (always role `customer`) is created by a database
        // trigger, so the role cannot be chosen from the browser.
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (error) throw fromAuth(error)
        if (!data.session) return { session: null, needsEmailConfirmation: true }
        return { session: await loadSession(data.user), needsEmailConfirmation: false }
      },

      async signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw fromAuth(error)
      },

      async listSampleAccounts() {
        return []
      },
    },

    catalog: {
      async listCategories() {
        const { data, error } = await supabase
          .from('categories')
          .select('id, created_at, name, slug, sort_order')
          .order('sort_order')
        if (error) throw fromPostgrest(error)
        return data ?? []
      },

      async listProducts(filter = {}) {
        let query = supabase
          .from('products')
          .select(PRODUCT_COLUMNS)
          .eq('is_active', true)
          .order('created_at')
          .order('name')
        if (filter.categorySlug) {
          const category = await supabase
            .from('categories')
            .select('id')
            .eq('slug', filter.categorySlug)
            .maybeSingle()
          if (category.error) throw fromPostgrest(category.error)
          if (!category.data) return []
          query = query.eq('category_id', (category.data as { id: string }).id)
        }
        if (filter.limit !== undefined) query = query.limit(filter.limit)
        const { data, error } = await query
        if (error) throw fromPostgrest(error)
        return ((data ?? []) as unknown as Product[]).map(sortImages)
      },

      async getProductBySlug(slug) {
        const { data, error } = await supabase
          .from('products')
          .select(PRODUCT_COLUMNS)
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle()
        if (error) throw fromPostgrest(error)
        return data ? sortImages(data as unknown as Product) : null
      },

      async getProductsByIds(ids) {
        if (ids.length === 0) return []
        const { data, error } = await supabase
          .from('products')
          .select(PRODUCT_COLUMNS)
          .in('id', ids)
          .eq('is_active', true)
        if (error) throw fromPostgrest(error)
        return ((data ?? []) as unknown as Product[]).map(sortImages)
      },
    },

    orders: {
      async place(input) {
        // The database function reads prices, checks stock and writes the
        // order in one transaction. The browser only says what and where.
        const placed = await supabase.rpc('place_manual_order', {
          p_items: input.items,
          p_delivery_date: input.delivery_date,
          p_delivery_address: input.delivery_address,
          p_note: input.note,
          p_request_id: input.request_id ?? null,
          p_payment_method: input.payment_method ?? 'cod',
          p_payment_reference: input.payment_reference ?? null,
          p_payment_proof_path: input.payment_proof_path ?? null,
        })
        if (placed.error) throw fromPostgrest(placed.error)
        const { data, error } = await supabase
          .from('orders')
          .select(`${ORDER_COLUMNS}, customer:profiles(full_name, customer_number)`)
          .eq('id', placed.data as string)
          .single()
        if (error) throw fromPostgrest(error)
        return toOrder(data as unknown as OrderRowWithCustomer)
      },

      async uploadPaymentProof(file, requestId) {
        const { data: auth } = await supabase.auth.getUser()
        const user = auth.user
        if (!user) throw new DataError('auth-required', 'Sign in to upload payment proof.')
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
          throw new DataError('invalid', 'Use a PNG, JPG or WebP image smaller than 5 MB.')
        }
        const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        const path = `${user.id}/${requestId}.${extension}`
        const { error } = await supabase.storage.from('payment-proofs').upload(path, file, { upsert: false, contentType: file.type })
        if (error && !/already exists|duplicate/i.test(error.message)) throw new DataError('unknown', 'Could not upload proof. Please try again.', { cause: error })
        return path
      },

      async listMine() {
        const { data: auth } = await supabase.auth.getSession()
        const session = await loadSession(auth.session?.user)
        if (!session) throw new DataError('auth-required', 'Sign in to continue.')
        // The filter keeps an operator's own history separate from the shop's
        // orders; Row Level Security is what stops customers seeing others'.
        const { data, error } = await supabase
          .from('orders')
          .select(`${ORDER_COLUMNS}, customer:profiles(full_name, customer_number)`)
          .eq('customer_id', session.userId)
          .order('created_at', { ascending: false })
        if (error) throw fromPostgrest(error)
        return ((data ?? []) as unknown as OrderRowWithCustomer[]).map(toOrder)
      },
    },

    admin: {
      async listProducts() {
        const { data, error } = await supabase
          .from('products')
          .select(PRODUCT_COLUMNS)
          .order('created_at')
          .order('name')
        if (error) throw fromPostgrest(error)
        return ((data ?? []) as unknown as Product[]).map(sortImages)
      },

      async createProduct(input) {
        const created = await supabase.from('products').insert(productRow(input)).select('id').single()
        if (created.error) throw fromPostgrest(created.error)
        const productId = (created.data as { id: string }).id
        const image = await supabase.from('product_images').insert({
          product_id: productId,
          storage_path: input.image.storage_path,
          alt_text: input.image.alt_text.trim(),
          sort_order: 0,
        })
        if (image.error) {
          // Do not leave a product without its picture and description.
          await supabase.from('products').delete().eq('id', productId)
          throw fromPostgrest(image.error)
        }
        return fetchProduct(productId)
      },

      async updateProduct(id, input) {
        const updated = await supabase.from('products').update(productRow(input)).eq('id', id).select('id')
        if (updated.error) throw fromPostgrest(updated.error)
        requireAffected(updated.data)

        const existing = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', id)
          .order('sort_order')
          .limit(1)
        if (existing.error) throw fromPostgrest(existing.error)
        const imageValues = {
          storage_path: input.image.storage_path,
          alt_text: input.image.alt_text.trim(),
        }
        const imageId = (existing.data?.[0] as { id: string } | undefined)?.id
        const image = imageId
          ? await supabase.from('product_images').update(imageValues).eq('id', imageId)
          : await supabase
              .from('product_images')
              .insert({ ...imageValues, product_id: id, sort_order: 0 })
        if (image.error) throw fromPostgrest(image.error)
        return fetchProduct(id)
      },

      async setProductActive(id, isActive) {
        const { data, error } = await supabase
          .from('products')
          .update({ is_active: isActive })
          .eq('id', id)
          .select('id')
        if (error) throw fromPostgrest(error)
        requireAffected(data)
      },

      async setProductStock(id, stock) {
        const { data, error } = await supabase
          .from('products')
          .update({ stock })
          .eq('id', id)
          .select('id')
        if (error) throw fromPostgrest(error)
        requireAffected(data)
      },

      async deleteProduct(id) {
        const { data, error } = await supabase.from('products').delete().eq('id', id).select('id')
        if (error) throw fromPostgrest(error)
        requireAffected(data)
      },

      async uploadProductImage(file) {
        const extension = IMAGE_UPLOAD.types[file.type]
        if (!extension) {
          throw new DataError('invalid', 'Choose a JPEG, PNG or WebP picture.')
        }
        if (file.size > IMAGE_UPLOAD.maxBytes) {
          throw new DataError('invalid', 'This file is over 300 KB. Choose a smaller image.')
        }
        const path = `products/${crypto.randomUUID()}.${extension}`
        const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
          cacheControl: '31536000',
          contentType: file.type,
          upsert: false,
        })
        if (error) {
          throw new DataError('forbidden', 'The picture could not be uploaded.', { cause: error })
        }
        return path
      },

      async listOrders() {
        const { data, error } = await supabase
          .from('orders')
          .select(`${ORDER_COLUMNS}, customer:profiles(full_name, customer_number)`)
          .order('created_at', { ascending: false })
        if (error) throw fromPostgrest(error)
        return ((data ?? []) as unknown as OrderRowWithCustomer[]).map((row) =>
          toOrder({ ...row, customer: row.customer ?? { full_name: 'Unknown customer' } }),
        )
      },

      async updateOrderStatus(id, status) {
        const { data, error } = await supabase
          .from('orders')
          .update({ status })
          .eq('id', id)
          .select('id')
        if (error) throw fromPostgrest(error)
        requireAffected(data)
      },
    },
  }
}
