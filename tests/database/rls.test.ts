// @vitest-environment node
/*
 * Access-rule tests RLS-01 to RLS-15 (design guidelines 3.5.4) plus the order
 * integrity rules (3.5.3). They run the real migrations and seed in PGlite.
 * Repeat them after every change to a policy, grant, trigger or function.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestDatabase, rejection, type TestDatabase } from '../helpers/database'

const DENIED = '42501'

let db: TestDatabase
let customerA: string
let customerB: string
let operator: string
let activeProduct: { id: string; price_cents: number; stock: number; name: string }
let secondProduct: { id: string; price_cents: number; stock: number; name: string }
let hiddenProduct: { id: string; name: string }
let soldOutProduct: { id: string; name: string }
let categoryId: string
let orderOfB: string
let deliveryDate: string

function items(...lines: [productId: string, quantity: number][]): string {
  return JSON.stringify(lines.map(([product_id, quantity]) => ({ product_id, quantity })))
}

async function placeOrder(userId: string, lines: string, options: { date?: string; address?: string; note?: string | null; requestId?: string | null } = {}) {
  return db.as('authenticated', userId, async (run) => {
    const rows = await run<{ id: string }>(
      `select public.place_order($1::jsonb, $2::date, $3, $4, $5::uuid) as id`,
      [lines, options.date ?? deliveryDate, options.address ?? '4 Fern Lane\nQuezon City', options.note ?? null, options.requestId ?? null],
    )
    return rows[0]!.id
  })
}

async function stockOf(productId: string): Promise<number> {
  const rows = await db.owner<{ stock: number }>(`select stock from public.products where id = $1`, [productId])
  return rows[0]!.stock
}

beforeAll(async () => {
  db = await createTestDatabase()
  customerA = await db.signUp('a@example.com', { full_name: 'Ada Customer' })
  customerB = await db.signUp('b@example.com', { full_name: 'Ben Customer' })
  // Asking for a role at sign-up must not work; operators are promoted by the owner.
  operator = await db.signUp('staff@example.com', { full_name: 'Olive Staff', role: 'operator' })

  const products = await db.owner<{ id: string; price_cents: number; stock: number; name: string; is_active: boolean }>(
    `select id, price_cents, stock, name, is_active from public.products order by created_at`,
  )
  const inStock = products.filter((product) => product.is_active && product.stock >= 5)
  activeProduct = inStock[0]!
  secondProduct = inStock[1]!
  hiddenProduct = products.find((product) => !product.is_active)!
  soldOutProduct = products.find((product) => product.is_active && product.stock === 0)!
  categoryId = (await db.owner<{ id: string }>(`select id from public.categories order by sort_order limit 1`))[0]!.id
  deliveryDate = (await db.owner<{ day: string }>(`select (public.shop_today() + 3)::text as day`))[0]!.day

  orderOfB = await placeOrder(customerB, items([activeProduct.id, 1]))
}, 120_000)

afterAll(async () => {
  await db?.close()
})

describe('profiles created at sign-up', () => {
  it('always start as customers, whatever the browser asked for', async () => {
    const rows = await db.owner<{ role: string; full_name: string }>(
      `select role, full_name from public.profiles where user_id = $1`,
      [operator],
    )
    expect(rows).toEqual([{ role: 'customer', full_name: 'Olive Staff' }])
  })

  it('the owner promotes the first operator with SQL', async () => {
    await db.owner(`update public.profiles set role = 'operator' where user_id = $1`, [operator])
    const isOperator = await db.as('authenticated', operator, (run) =>
      run<{ ok: boolean }>(`select public.is_operator() as ok`),
    )
    expect(isOperator[0]!.ok).toBe(true)
  })
})

describe('every role', () => {
  it('RLS-01: row security is on for every table in public', async () => {
    const open = await db.owner(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    )
    expect(open).toEqual([])
  })
})

describe('visitor (anon)', () => {
  it('RLS-02: sees only active products', async () => {
    const rows = await db.as('anon', null, (run) => run<{ id: string; is_active: boolean }>(`select id, is_active from public.products`))
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.is_active)).toBe(true)
    expect(rows.some((row) => row.id === hiddenProduct.id)).toBe(false)
  })

  it('RLS-03: sees no images of an inactive product', async () => {
    const rows = await db.as('anon', null, (run) =>
      run(`select id from public.product_images where product_id = $1`, [hiddenProduct.id]),
    )
    expect(rows).toEqual([])
    const visible = await db.as('anon', null, (run) =>
      run(`select id from public.product_images where product_id = $1`, [activeProduct.id]),
    )
    expect(visible).toHaveLength(1)
  })

  it('RLS-04: cannot read orders, order items or profiles', async () => {
    for (const table of ['orders', 'order_items', 'profiles', 'order_requests']) {
      const error = await rejection(db.as('anon', null, (run) => run(`select * from public.${table}`)))
      expect(error.code, table).toBe(DENIED)
    }
  })

  it('RLS-05: cannot insert, update or delete anywhere', async () => {
    const attempts = [
      `insert into public.categories (name, slug) values ('Hats', 'hats')`,
      `update public.categories set name = 'Hats'`,
      `delete from public.categories`,
      `insert into public.products (category_id, name, slug, price_cents) values ('${categoryId}', 'Free', 'free', 0)`,
      `update public.products set price_cents = 0`,
      `delete from public.products`,
      `insert into public.product_images (product_id, storage_path, alt_text) values ('${activeProduct.id}', 'x', 'x')`,
      `update public.product_images set alt_text = 'x'`,
      `delete from public.product_images`,
      `update public.orders set status = 'delivered'`,
      `delete from public.orders`,
      `delete from public.order_items`,
      `update public.profiles set role = 'operator'`,
      `insert into public.profiles (user_id, full_name, role) values (gen_random_uuid(), 'x', 'operator')`,
    ]
    for (const sql of attempts) {
      const error = await rejection(db.as('anon', null, (run) => run(sql)))
      expect(error.code, sql).toBe(DENIED)
    }
  })

  it('cannot place an order', async () => {
    const error = await rejection(
      db.as('anon', null, (run) =>
        run(`select public.place_order($1::jsonb, $2::date, 'Somewhere')`, [items([activeProduct.id, 1]), deliveryDate]),
      ),
    )
    expect(error.code).toBe(DENIED)
  })
})

describe('customer', () => {
  let orderOfA: string

  it('places an order: the database sets prices, total, owner, status and stock', async () => {
    const before = await stockOf(activeProduct.id)
    orderOfA = await placeOrder(customerA, items([activeProduct.id, 2], [secondProduct.id, 1], [activeProduct.id, 1]), {
      note: '  Happy birthday!  ',
    })
    const order = (await db.owner<{ customer_id: string; status: string; total_cents: number; note: string }>(
      `select customer_id, status, total_cents, note from public.orders where id = $1`,
      [orderOfA],
    ))[0]!
    expect(order).toEqual({
      customer_id: customerA,
      status: 'pending',
      total_cents: activeProduct.price_cents * 3 + secondProduct.price_cents,
      note: 'Happy birthday!',
    })
    const lines = await db.owner<{ product_id: string; quantity: number; unit_price_cents: number; product_name: string }>(
      `select product_id, quantity, unit_price_cents, product_name from public.order_items where order_id = $1 order by quantity desc`,
      [orderOfA],
    )
    expect(lines).toEqual([
      { product_id: activeProduct.id, quantity: 3, unit_price_cents: activeProduct.price_cents, product_name: activeProduct.name },
      { product_id: secondProduct.id, quantity: 1, unit_price_cents: secondProduct.price_cents, product_name: secondProduct.name },
    ])
    expect(await stockOf(activeProduct.id)).toBe(before - 3)
  })

  it('RLS-06: reads only their own orders and order items', async () => {
    const orders = await db.as('authenticated', customerA, (run) => run<{ id: string; customer_id: string }>(`select id, customer_id from public.orders`))
    expect(orders.map((row) => row.id)).toEqual([orderOfA])
    const lines = await db.as('authenticated', customerA, (run) => run<{ order_id: string }>(`select order_id from public.order_items`))
    expect(lines.length).toBe(2)
    expect(lines.every((row) => row.order_id === orderOfA)).toBe(true)
    const others = await db.as('authenticated', customerA, (run) => run(`select id from public.orders where id = $1`, [orderOfB]))
    expect(others).toEqual([])
  })

  it('reads only their own profile', async () => {
    const rows = await db.as('authenticated', customerA, (run) => run<{ user_id: string }>(`select user_id from public.profiles`))
    expect(rows).toEqual([{ user_id: customerA }])
  })

  it("RLS-07: cannot create an order for someone else or with a made-up price", async () => {
    const direct = await rejection(
      db.as('authenticated', customerA, (run) =>
        run(
          `insert into public.orders (customer_id, status, total_cents, delivery_date, delivery_address)
           values ($1, 'delivered', 1, $2::date, 'Somewhere')`,
          [customerB, deliveryDate],
        ),
      ),
    )
    expect(direct.code).toBe(DENIED)

    const directLine = await rejection(
      db.as('authenticated', customerA, (run) =>
        run(
          `insert into public.order_items (order_id, product_id, product_name, quantity, unit_price_cents)
           values ($1, $2, 'Cheap', 1, 1)`,
          [orderOfA, activeProduct.id],
        ),
      ),
    )
    expect(directLine.code).toBe(DENIED)

    // Extra keys sent with a line (a price, another customer) are ignored.
    const sneaky = JSON.stringify([
      { product_id: secondProduct.id, quantity: 1, unit_price_cents: 1, price_cents: 1, customer_id: customerB, total_cents: 1 },
    ])
    const id = await placeOrder(customerA, sneaky)
    const order = (await db.owner<{ customer_id: string; total_cents: number }>(
      `select customer_id, total_cents from public.orders where id = $1`,
      [id],
    ))[0]!
    expect(order).toEqual({ customer_id: customerA, total_cents: secondProduct.price_cents })
  })

  it('RLS-08: cannot change an order status or delete an order', async () => {
    // The update is allowed by the column grant but matches no rows under RLS.
    const updated = await db.as('authenticated', customerA, (run) =>
      run(`update public.orders set status = 'delivered' where id = $1 returning id`, [orderOfA]),
    )
    expect(updated).toEqual([])
    const status = await db.owner<{ status: string }>(`select status from public.orders where id = $1`, [orderOfA])
    expect(status[0]!.status).toBe('pending')

    const deleted = await rejection(db.as('authenticated', customerA, (run) => run(`delete from public.orders where id = $1`, [orderOfA])))
    expect(deleted.code).toBe(DENIED)
    const total = await rejection(db.as('authenticated', customerA, (run) => run(`update public.orders set total_cents = 0 where id = $1`, [orderOfA])))
    expect(total.code).toBe(DENIED)
  })

  it('RLS-09: cannot make themselves an operator', async () => {
    const error = await rejection(
      db.as('authenticated', customerA, (run) => run(`update public.profiles set role = 'operator' where user_id = $1`, [customerA])),
    )
    expect(error.code).toBe(DENIED)
    const moved = await rejection(
      db.as('authenticated', customerA, (run) => run(`update public.profiles set user_id = $2 where user_id = $1`, [customerA, operator])),
    )
    expect(moved.code).toBe(DENIED)
    const inserted = await rejection(
      db.as('authenticated', customerA, (run) =>
        run(`insert into public.profiles (user_id, full_name, role) values (gen_random_uuid(), 'x', 'operator')`),
      ),
    )
    expect(inserted.code).toBe(DENIED)
    const role = await db.owner<{ role: string }>(`select role from public.profiles where user_id = $1`, [customerA])
    expect(role[0]!.role).toBe('customer')
  })

  it('can change their own name, and nobody else\u2019s', async () => {
    const own = await db.as('authenticated', customerA, (run) =>
      run(`update public.profiles set full_name = 'Ada Lovelace' where user_id = $1 returning full_name`, [customerA]),
    )
    expect(own).toEqual([{ full_name: 'Ada Lovelace' }])
    const other = await db.as('authenticated', customerA, (run) =>
      run(`update public.profiles set full_name = 'Hacked' where user_id = $1 returning full_name`, [customerB]),
    )
    expect(other).toEqual([])
  })

  it('RLS-10: cannot change products, categories or product images', async () => {
    const blocked = [
      `insert into public.categories (name, slug) values ('Hats', 'hats')`,
      `insert into public.products (category_id, name, slug, price_cents) values ('${categoryId}', 'Free', 'free', 0)`,
      `insert into public.product_images (product_id, storage_path, alt_text) values ('${activeProduct.id}', 'x', 'x')`,
    ]
    for (const sql of blocked) {
      const error = await rejection(db.as('authenticated', customerA, (run) => run(sql)))
      expect(error.code, sql).toBe(DENIED)
    }
    // Updates and deletes are filtered by RLS: they run but touch no rows.
    const silent = [
      `update public.products set price_cents = 0 returning id`,
      `delete from public.products returning id`,
      `update public.categories set name = 'Hats' returning id`,
      `delete from public.categories returning id`,
      `update public.product_images set alt_text = 'x' returning id`,
      `delete from public.product_images returning id`,
    ]
    for (const sql of silent) {
      const rows = await db.as('authenticated', customerA, (run) => run(sql)).catch((error: { code?: string }) => {
        // A delete that would break a reference may be refused outright instead.
        expect(error.code, sql).toBe(DENIED)
        return []
      })
      expect(rows, sql).toEqual([])
    }
    const price = await db.owner<{ price_cents: number }>(`select price_cents from public.products where id = $1`, [activeProduct.id])
    expect(price[0]!.price_cents).toBe(activeProduct.price_cents)
  })

  it('cannot see hidden products, even by id', async () => {
    const rows = await db.as('authenticated', customerA, (run) => run(`select id from public.products where id = $1`, [hiddenProduct.id]))
    expect(rows).toEqual([])
  })

  it('RLS-15: cannot upload to the product-images bucket', async () => {
    const error = await rejection(
      db.as('authenticated', customerA, (run) =>
        run(`insert into storage.objects (bucket_id, name) values ('product-images', 'products/evil.webp')`),
      ),
    )
    expect(error.code).toBe(DENIED)
    const visitor = await rejection(
      db.as('anon', null, (run) => run(`insert into storage.objects (bucket_id, name) values ('product-images', 'products/evil.webp')`)),
    )
    expect(visitor.code).toBe(DENIED)
  })
})

describe('order integrity', () => {
  it('rejects the whole order and names the product when one line is sold out', async () => {
    const before = await stockOf(activeProduct.id)
    const orders = await db.owner<{ count: number }>(`select count(*)::int as count from public.orders`)
    const error = await rejection(placeOrder(customerA, items([activeProduct.id, 1], [soldOutProduct.id, 1])))
    expect(error.message).toBe('KP_OUT_OF_STOCK')
    expect(error.detail).toContain(soldOutProduct.name)
    expect(await stockOf(activeProduct.id)).toBe(before)
    expect(await db.owner(`select count(*)::int as count from public.orders`)).toEqual(orders)
  })

  it('rejects more than is in stock and says how many are left', async () => {
    const left = await stockOf(secondProduct.id)
    const error = await rejection(placeOrder(customerA, items([secondProduct.id, left + 1])))
    expect(error.message).toBe('KP_OUT_OF_STOCK')
    expect(error.detail).toContain(`only have ${left} of ${secondProduct.name}`)
  })

  it('rejects a hidden product and names it', async () => {
    const error = await rejection(placeOrder(customerA, items([hiddenProduct.id, 1])))
    expect(error.message).toBe('KP_PRODUCT_UNAVAILABLE')
    expect(error.detail).toContain(hiddenProduct.name)
  })

  it('rejects a product that does not exist', async () => {
    const error = await rejection(placeOrder(customerA, items(['11111111-1111-4111-8111-111111111111', 1])))
    expect(error.message).toBe('KP_PRODUCT_UNAVAILABLE')
  })

  it.each([
    ['an empty cart', '[]', {}],
    ['a quantity of zero', null, { quantity: 0 }],
    ['a negative quantity', null, { quantity: -2 }],
    ['a fractional quantity', null, { quantity: 1.5 }],
    ['a delivery date of today', null, { today: true }],
    ['a blank address', null, { address: '   ' }],
    ['a note over 500 characters', null, { note: 'x'.repeat(501) }],
  ] as const)('rejects %s', async (_label, raw, change: { quantity?: number; today?: boolean; address?: string; note?: string }) => {
    const today = (await db.owner<{ day: string }>(`select public.shop_today()::text as day`))[0]!.day
    const lines = raw ?? items([activeProduct.id, change.quantity ?? 1])
    const error = await rejection(
      placeOrder(customerA, lines, { date: change.today ? today : deliveryDate, address: change.address, note: change.note }),
    )
    expect(error.message).toBe('KP_INVALID_ORDER')
  })

  it('accepts tomorrow as the earliest delivery date', async () => {
    const tomorrow = (await db.owner<{ day: string }>(`select (public.shop_today() + 1)::text as day`))[0]!.day
    await expect(placeOrder(customerA, items([secondProduct.id, 1]), { date: tomorrow })).resolves.toMatch(/^[0-9a-f-]{36}$/)
  })

  it('a repeated request returns the first order and takes stock once', async () => {
    const requestId = '22222222-2222-4222-8222-222222222222'
    const before = await stockOf(activeProduct.id)
    const first = await placeOrder(customerA, items([activeProduct.id, 1]), { requestId })
    const second = await placeOrder(customerA, items([activeProduct.id, 1]), { requestId })
    expect(second).toBe(first)
    expect(await stockOf(activeProduct.id)).toBe(before - 1)
    // The same key from another customer is a different request.
    const other = await placeOrder(customerB, items([activeProduct.id, 1]), { requestId })
    expect(other).not.toBe(first)
  })
})

describe('operator', () => {
  let productId: string

  it('RLS-11: creates, updates and hides a product, and adds an image with alt text', async () => {
    productId = await db.as('authenticated', operator, async (run) => {
      const created = await run<{ id: string }>(
        `insert into public.products (category_id, name, slug, description, price_cents, stock, is_active)
         values ($1, 'Test Posy', 'test-posy', 'A small test posy.', 1250, 4, true) returning id`,
        [categoryId],
      )
      const id = created[0]!.id
      await run(`insert into public.product_images (product_id, storage_path, alt_text) values ($1, 'illustrations/bouquet-lilac', 'A small posy of tulips')`, [id])
      await run(`update public.products set price_cents = 1300, stock = 6 where id = $1`, [id])
      await run(`update public.products set is_active = false where id = $1`, [id])
      return id
    })
    const row = await db.as('authenticated', operator, (run) =>
      run(`select price_cents, stock, is_active from public.products where id = $1`, [productId]),
    )
    expect(row).toEqual([{ price_cents: 1300, stock: 6, is_active: false }])
    const hiddenFromVisitors = await db.as('anon', null, (run) => run(`select id from public.products where id = $1`, [productId]))
    expect(hiddenFromVisitors).toEqual([])
  })

  it('reads every product, order and profile', async () => {
    const counts = await db.as('authenticated', operator, async (run) => ({
      hidden: (await run(`select id from public.products where not is_active`)).length,
      customers: (await run<{ customer_id: string }>(`select distinct customer_id from public.orders`)).length,
      profiles: (await run(`select id from public.profiles`)).length,
    }))
    expect(counts.hidden).toBeGreaterThanOrEqual(2)
    expect(counts.customers).toBe(2)
    expect(counts.profiles).toBe(3)
  })

  it('RLS-12: cannot add an image with empty alt text', async () => {
    for (const alt of ['', '   ']) {
      const error = await rejection(
        db.as('authenticated', operator, (run) =>
          run(`insert into public.product_images (product_id, storage_path, alt_text) values ($1, 'illustrations/bouquet-lilac', $2)`, [productId, alt]),
        ),
      )
      expect(error.code).toBe('23514')
    }
  })

  it('stores money as whole cents only', async () => {
    const types = await db.owner<{ column_name: string; data_type: string }>(
      `select column_name, data_type from information_schema.columns
       where table_schema = 'public' and column_name like '%cents'`,
    )
    expect(types.length).toBe(3)
    expect(types.every((column) => column.data_type === 'integer')).toBe(true)
    const negative = await rejection(
      db.as('authenticated', operator, (run) => run(`update public.products set price_cents = -1 where id = $1`, [productId])),
    )
    expect(negative.code).toBe('23514')
  })

  it('RLS-13: updates an order status', async () => {
    const rows = await db.as('authenticated', operator, (run) =>
      run(`update public.orders set status = 'confirmed' where id = $1 returning status`, [orderOfB]),
    )
    expect(rows).toEqual([{ status: 'confirmed' }])
  })

  it('RLS-14: cannot change an order total or delete an order', async () => {
    const total = await rejection(
      db.as('authenticated', operator, (run) => run(`update public.orders set total_cents = 1 where id = $1`, [orderOfB])),
    )
    expect(total.code).toBe(DENIED)
    const owner = await rejection(
      db.as('authenticated', operator, (run) => run(`update public.orders set customer_id = $2 where id = $1`, [orderOfB, operator])),
    )
    expect(owner.code).toBe(DENIED)
    const deleted = await rejection(db.as('authenticated', operator, (run) => run(`delete from public.orders where id = $1`, [orderOfB])))
    expect(deleted.code).toBe(DENIED)
    const lines = await rejection(db.as('authenticated', operator, (run) => run(`update public.order_items set quantity = 99`)))
    expect(lines.code).toBe(DENIED)
    const deletedLines = await rejection(db.as('authenticated', operator, (run) => run(`delete from public.order_items`)))
    expect(deletedLines.code).toBe(DENIED)
  })

  it('cannot change a role from the app, not even their own', async () => {
    const promote = await rejection(
      db.as('authenticated', operator, (run) => run(`update public.profiles set role = 'operator' where user_id = $1`, [customerA])),
    )
    expect(promote.code).toBe(DENIED)
    const rename = await db.as('authenticated', operator, (run) =>
      run(`update public.profiles set full_name = 'Renamed' where user_id = $1 returning id`, [customerA]),
    )
    expect(rename).toEqual([])
  })

  it('cancelling an order puts its items back in stock, and a closed order stays closed', async () => {
    const before = await stockOf(activeProduct.id)
    await db.as('authenticated', operator, (run) => run(`update public.orders set status = 'cancelled' where id = $1`, [orderOfB]))
    expect(await stockOf(activeProduct.id)).toBe(before + 1)

    const reopened = await rejection(
      db.as('authenticated', operator, (run) => run(`update public.orders set status = 'pending' where id = $1`, [orderOfB])),
    )
    expect(reopened.message).toBe('KP_ORDER_CLOSED')
    expect(await stockOf(activeProduct.id)).toBe(before + 1)
  })

  it('rejects a status that is not on the list', async () => {
    const pending = await placeOrder(customerB, items([secondProduct.id, 1]))
    const error = await rejection(
      db.as('authenticated', operator, (run) => run(`update public.orders set status = 'shipped' where id = $1`, [pending])),
    )
    expect(error.code).toBe('23514')
  })

  it('cannot delete a product that appears in an order, but can delete one that does not', async () => {
    const used = await rejection(db.as('authenticated', operator, (run) => run(`delete from public.products where id = $1`, [activeProduct.id])))
    // Foreign key violation; PostgreSQL 18 reports RESTRICT as 23001.
    expect(['23503', '23001']).toContain(used.code)
    const removed = await db.as('authenticated', operator, (run) => run(`delete from public.products where id = $1 returning id`, [productId]))
    expect(removed).toHaveLength(1)
    const images = await db.owner(`select id from public.product_images where product_id = $1`, [productId])
    expect(images).toEqual([])
  })

  it('uploads, replaces and deletes files in the product-images bucket only', async () => {
    await db.as('authenticated', operator, async (run) => {
      await run(`insert into storage.objects (bucket_id, name) values ('product-images', 'products/a.webp')`)
      expect(await run(`update storage.objects set name = 'products/b.webp' where name = 'products/a.webp' returning id`)).toHaveLength(1)
      expect(await run(`delete from storage.objects where name = 'products/b.webp' returning id`)).toHaveLength(1)
    })
    await db.owner(`insert into storage.buckets (id, name) values ('private-files', 'private-files')`)
    const other = await rejection(
      db.as('authenticated', operator, (run) => run(`insert into storage.objects (bucket_id, name) values ('private-files', 'x')`)),
    )
    expect(other.code).toBe(DENIED)
  })
})

describe('seed', () => {
  it('can be run again without duplicating rows', async () => {
    const before = await db.owner(`select (select count(*)::int from public.categories) as categories, (select count(*)::int from public.product_images) as images`)
    const { readFileSync } = await import('node:fs')
    await db.pg.exec(readFileSync('supabase/seed.sql', 'utf8'))
    const after = await db.owner(`select (select count(*)::int from public.categories) as categories, (select count(*)::int from public.product_images) as images`)
    expect(after).toEqual(before)
  })
})
