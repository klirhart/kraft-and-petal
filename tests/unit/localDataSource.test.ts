// @vitest-environment node
/*
 * The in-browser sample backend must follow the same rules the database
 * enforces (tests/database/rls.test.ts), so sample-data mode behaves like
 * the real thing.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { SHOP_CONFIG } from '@/lib/config'
import { DataError } from '@/lib/errors'
import { addDays, shopToday } from '@/lib/formatters'
import type { LocalDataSource } from '@/lib/data/local/localDataSource'
import type { PlaceOrderInput, Product, ProductInput } from '@/types'
import { CUSTOMER, memoryStore, NOW, OPERATOR, OTHER_CUSTOMER, sampleBackend } from '../helpers/sampleBackend'

let backend: LocalDataSource
let products: Product[]

const DELIVERY = addDays(shopToday(NOW), 3)

function order(lines: [Product, number][], extra: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    items: lines.map(([product, quantity]) => ({ product_id: product.id, quantity })),
    delivery_date: DELIVERY,
    delivery_address: 'Maya Linden\n4 Fern Lane\nQuezon City 1100',
    note: null,
    ...extra,
  }
}

async function code(work: Promise<unknown>): Promise<string> {
  try {
    await work
  } catch (error) {
    if (error instanceof DataError) return error.code
    throw error
  }
  return 'no error'
}

function bySlug(slug: string): Product {
  const found = products.find((product) => product.slug === slug)
  if (!found) throw new Error(`No sample product ${slug}`)
  return found
}

beforeEach(async () => {
  backend = sampleBackend()
  products = await backend.catalog.listProducts()
})

describe('catalog for visitors', () => {
  it('lists categories in shop order', async () => {
    const categories = await backend.catalog.listCategories()
    expect(categories.map((category) => category.slug)).toEqual(['bouquets', 'plants', 'gifts', 'workshops'])
  })

  it('lists only active products, each with a described picture', async () => {
    expect(products.length).toBeGreaterThanOrEqual(12)
    for (const product of products) {
      expect(product.is_active).toBe(true)
      expect(Number.isInteger(product.price_cents)).toBe(true)
      expect(product.images?.length).toBeGreaterThan(0)
      expect(product.images?.[0]?.alt_text.trim()).not.toBe('')
    }
  })

  it('filters by category and limits the list', async () => {
    const plants = await backend.catalog.listProducts({ categorySlug: 'plants' })
    const categories = await backend.catalog.listCategories()
    const plantsId = categories.find((category) => category.slug === 'plants')?.id
    expect(plants.length).toBeGreaterThan(0)
    expect(plants.every((product) => product.category_id === plantsId)).toBe(true)
    expect(await backend.catalog.listProducts({ categorySlug: 'nope' })).toEqual([])
    expect(await backend.catalog.listProducts({ limit: 4 })).toHaveLength(4)
  })

  it('does not return a hidden product by its web address name', async () => {
    expect(await backend.catalog.getProductBySlug('blush-peony-bouquet')).not.toBeNull()
    expect(await backend.catalog.getProductBySlug('autumn-dahlia-bunch')).toBeNull()
    expect(await backend.catalog.getProductBySlug('missing')).toBeNull()
  })

  it('includes sold-out and low-stock examples', () => {
    expect(products.some((product) => product.stock === 0)).toBe(true)
    expect(products.some((product) => product.stock > 0 && product.stock <= SHOP_CONFIG.lowStockThreshold)).toBe(true)
  })
})

describe('accounts', () => {
  it('starts signed out and lists the sample sign-ins', async () => {
    expect(await backend.auth.getSession()).toBeNull()
    const accounts = await backend.auth.listSampleAccounts()
    expect(accounts.map((account) => account.role).sort()).toEqual(['customer', 'operator'])
  })

  it('signs in, remembers the session and signs out', async () => {
    const store = memoryStore()
    const first = sampleBackend(store)
    const session = await first.auth.signIn(CUSTOMER)
    expect(session.profile.role).toBe('customer')
    expect((await sampleBackend(store).auth.getSession())?.email).toBe(CUSTOMER.email)
    await first.auth.signOut()
    expect(await sampleBackend(store).auth.getSession()).toBeNull()
  })

  it('rejects a wrong password without saying which part was wrong', async () => {
    expect(await code(backend.auth.signIn({ email: CUSTOMER.email, password: 'nope' }))).toBe('invalid-credentials')
    expect(await code(backend.auth.signIn({ email: 'nobody@example.com', password: 'nope' }))).toBe('invalid-credentials')
  })

  it('creates new accounts as customers only', async () => {
    const created = await backend.auth.signUp({ email: 'new@example.com', password: 'longenough', fullName: 'New Person' })
    expect(created.session?.profile.role).toBe('customer')
    expect(await code(backend.auth.signUp({ email: CUSTOMER.email, password: 'longenough', fullName: 'Copy' }))).toBe('email-taken')
  })

  it('tells listeners when the session changes', async () => {
    const seen: (string | null)[] = []
    const stop = backend.auth.onSessionChange((session) => seen.push(session?.email ?? null))
    await backend.auth.signIn(CUSTOMER)
    await backend.auth.signOut()
    stop()
    await backend.auth.signIn(CUSTOMER)
    expect(seen).toEqual([CUSTOMER.email, null])
  })
})

describe('placing an order', () => {
  it('needs a signed-in customer', async () => {
    expect(await code(backend.orders.place(order([[bySlug('blush-peony-bouquet'), 1]])))).toBe('auth-required')
    expect(await code(backend.orders.listMine())).toBe('auth-required')
  })

  it('sets prices, total, owner and status itself and lowers stock', async () => {
    const session = await backend.auth.signIn(CUSTOMER)
    const peony = bySlug('blush-peony-bouquet')
    const card = bySlug('seed-paper-card')
    const sneaky = order([[peony, 2], [card, 1]]) as PlaceOrderInput & Record<string, unknown>
    sneaky.total_cents = 1
    sneaky.status = 'delivered'
    sneaky.customer_id = 'someone-else'
    const placed = await backend.orders.place(sneaky)

    expect(placed.status).toBe('pending')
    expect(placed.customer_id).toBe(session.userId)
    expect(placed.total_cents).toBe(peony.price_cents * 2 + card.price_cents)
    expect(placed.items?.map((item) => [item.product_name, item.quantity, item.unit_price_cents])).toEqual([
      [peony.name, 2, peony.price_cents],
      [card.name, 1, card.price_cents],
    ])
    const after = await backend.catalog.getProductBySlug(peony.slug)
    expect(after?.stock).toBe(peony.stock - 2)
  })

  it('rejects the whole order and names the product when a line cannot be filled', async () => {
    await backend.auth.signIn(CUSTOMER)
    const peony = bySlug('blush-peony-bouquet')
    const soldOut = products.find((product) => product.stock === 0)!
    const attempt = backend.orders.place(order([[peony, 1], [soldOut, 1]]))
    await expect(attempt).rejects.toMatchObject({ code: 'out-of-stock' })
    await expect(attempt).rejects.toThrow(soldOut.name)
    expect((await backend.catalog.getProductBySlug(peony.slug))?.stock).toBe(peony.stock)

    const tooMany = backend.orders.place(order([[peony, peony.stock + 1]]))
    await expect(tooMany).rejects.toThrow(`only have ${peony.stock}`)
  })

  it('rejects a product that has left the shop', async () => {
    await backend.auth.signIn(OPERATOR)
    const peony = bySlug('blush-peony-bouquet')
    await backend.admin.setProductActive(peony.id, false)
    await backend.auth.signOut()
    await backend.auth.signIn(CUSTOMER)
    const attempt = backend.orders.place(order([[peony, 1]]))
    await expect(attempt).rejects.toMatchObject({ code: 'unavailable' })
    await expect(attempt).rejects.toThrow(peony.name)
  })

  it('accepts tomorrow as the earliest delivery date and nothing sooner', async () => {
    await backend.auth.signIn(CUSTOMER)
    const peony = bySlug('blush-peony-bouquet')
    const today = shopToday(NOW)
    expect(await code(backend.orders.place(order([[peony, 1]], { delivery_date: today })))).toBe('invalid')
    const placed = await backend.orders.place(order([[peony, 1]], { delivery_date: addDays(today, 1) }))
    expect(placed.delivery_date).toBe(addDays(today, 1))
  })

  it.each([
    ['an empty cart', { items: [] }],
    ['a blank address', { delivery_address: '  ' }],
    ['a note over the limit', { note: 'x'.repeat(501) }],
  ])('rejects %s', async (_label, change) => {
    await backend.auth.signIn(CUSTOMER)
    expect(await code(backend.orders.place(order([[bySlug('blush-peony-bouquet'), 1]], change)))).toBe('invalid')
  })

  it('returns the first order when the same request is sent twice', async () => {
    await backend.auth.signIn(CUSTOMER)
    const peony = bySlug('blush-peony-bouquet')
    const request = order([[peony, 1]], { request_id: 'one-time-key' })
    const first = await backend.orders.place(request)
    const second = await backend.orders.place(request)
    expect(second.id).toBe(first.id)
    expect((await backend.catalog.getProductBySlug(peony.slug))?.stock).toBe(peony.stock - 1)
  })

  it('shows customers only their own orders, newest first', async () => {
    const session = await backend.auth.signIn(CUSTOMER)
    const placed = await backend.orders.place(order([[bySlug('little-monstera'), 1]]))
    const mine = await backend.orders.listMine()
    expect(mine[0]?.id).toBe(placed.id)
    expect(mine.every((entry) => entry.customer_id === session.userId)).toBe(true)

    await backend.auth.signOut()
    await backend.auth.signIn(OTHER_CUSTOMER)
    const theirs = await backend.orders.listMine()
    expect(theirs.some((entry) => entry.id === placed.id)).toBe(false)
  })
})

describe('dashboard rules', () => {
  const input = (categoryId: string, change: Partial<ProductInput> = {}): ProductInput => ({
    category_id: categoryId,
    name: 'Test Posy',
    slug: 'test-posy',
    description: 'A small test posy.',
    price_cents: 1250,
    stock: 4,
    is_active: true,
    image: { storage_path: 'illustrations/bouquet-lilac', alt_text: 'A small posy of lilac tulips' },
    ...change,
  })

  it('refuses visitors and customers', async () => {
    const product = bySlug('blush-peony-bouquet')
    for (const signIn of [null, CUSTOMER]) {
      if (signIn) await backend.auth.signIn(signIn)
      const expected = signIn ? 'forbidden' : 'auth-required'
      expect(await code(backend.admin.listProducts())).toBe(expected)
      expect(await code(backend.admin.listOrders())).toBe(expected)
      expect(await code(backend.admin.setProductStock(product.id, 99))).toBe(expected)
      expect(await code(backend.admin.setProductActive(product.id, false))).toBe(expected)
      expect(await code(backend.admin.deleteProduct(product.id))).toBe(expected)
      expect(await code(backend.admin.createProduct(input(product.category_id)))).toBe(expected)
    }
    expect((await backend.catalog.getProductBySlug(product.slug))?.stock).toBe(product.stock)
  })

  it('lets an operator add, edit, hide and delete a product', async () => {
    await backend.auth.signIn(OPERATOR)
    const categoryId = bySlug('blush-peony-bouquet').category_id
    const created = await backend.admin.createProduct(input(categoryId))
    expect(created.images?.[0]?.alt_text).toBe('A small posy of lilac tulips')
    expect((await backend.admin.listProducts()).some((product) => !product.is_active)).toBe(true)

    const updated = await backend.admin.updateProduct(created.id, input(categoryId, { price_cents: 1300, name: 'Test Posy Two' }))
    expect(updated.price_cents).toBe(1300)
    expect(updated.name).toBe('Test Posy Two')

    await backend.admin.setProductActive(created.id, false)
    expect(await backend.catalog.getProductBySlug('test-posy')).toBeNull()
    await backend.admin.deleteProduct(created.id)
    expect((await backend.admin.listProducts()).some((product) => product.id === created.id)).toBe(false)
  })

  it('requires an image description, whole cents and a free web address name', async () => {
    await backend.auth.signIn(OPERATOR)
    const categoryId = bySlug('blush-peony-bouquet').category_id
    expect(await code(backend.admin.createProduct(input(categoryId, { image: { storage_path: 'illustrations/bouquet-lilac', alt_text: '  ' } })))).toBe('invalid')
    expect(await code(backend.admin.createProduct(input(categoryId, { price_cents: 12.5 })))).toBe('invalid')
    expect(await code(backend.admin.createProduct(input(categoryId, { price_cents: -1 })))).toBe('invalid')
    expect(await code(backend.admin.createProduct(input(categoryId, { slug: 'blush-peony-bouquet' })))).toBe('invalid')
    expect(await code(backend.admin.setProductStock(bySlug('blush-peony-bouquet').id, -1))).toBe('invalid')
  })

  it('cannot delete a product that appears in an order', async () => {
    await backend.auth.signIn(OPERATOR)
    expect(await code(backend.admin.deleteProduct(bySlug('blush-peony-bouquet').id))).toBe('in-use')
  })

  it('moves an order along, restocks on cancel and keeps closed orders closed', async () => {
    await backend.auth.signIn(CUSTOMER)
    const monstera = bySlug('little-monstera')
    const placed = await backend.orders.place(order([[monstera, 2]]))
    await backend.auth.signOut()

    await backend.auth.signIn(OPERATOR)
    const listed = (await backend.admin.listOrders()).find((entry) => entry.id === placed.id)
    expect(listed?.customer_name).toBe('Maya Linden')
    await backend.admin.updateOrderStatus(placed.id, 'confirmed')
    await backend.admin.updateOrderStatus(placed.id, 'cancelled')
    const restocked = (await backend.admin.listProducts()).find((product) => product.id === monstera.id)
    expect(restocked?.stock).toBe(monstera.stock)
    expect(await code(backend.admin.updateOrderStatus(placed.id, 'pending'))).toBe('invalid')
    // @ts-expect-error a status outside the list must be refused at run time too
    expect(await code(backend.admin.updateOrderStatus(placed.id, 'shipped'))).toBe('invalid')
  })

  it('restores the sample data on reset', async () => {
    await backend.auth.signIn(OPERATOR)
    const peony = bySlug('blush-peony-bouquet')
    await backend.admin.setProductStock(peony.id, 1)
    await backend.reset()
    expect((await backend.catalog.getProductBySlug(peony.slug))?.stock).toBe(peony.stock)
  })
})
