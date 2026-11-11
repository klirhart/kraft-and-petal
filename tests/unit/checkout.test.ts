/*
 * The payment seam: the app talks to one interface, the mock provider plays
 * outcomes without touching card data, and an order exists only after a
 * successful payment.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkout, getPaymentProvider, mockPaymentProvider, type PaymentProvider } from '@/features/checkout'
import { data, resetSampleData } from '@/lib/data'
import { addDays, shopToday } from '@/lib/formatters'
import { read } from '../helpers/css'
import { CUSTOMER } from '../helpers/sampleBackend'

const request = async (change: Record<string, unknown> = {}) => {
  const product = (await data.catalog.getProductBySlug('sunny-meadow-bunch'))!
  return {
    product,
    request: {
      items: [{ product_id: product.id, quantity: 1 }],
      delivery_date: addDays(shopToday(), 3),
      delivery_address: 'Maya Linden\n4 Fern Lane\nQuezon City 1100',
      note: null,
      expectedTotalCents: product.price_cents,
      requestId: crypto.randomUUID(),
      ...change,
    },
  }
}

beforeEach(async () => {
  await resetSampleData()
  await data.auth.signIn(CUSTOMER)
})

describe('mock payment provider', () => {
  it('is the active provider and says it is simulated', () => {
    expect(getPaymentProvider()).toBe(mockPaymentProvider)
    expect(mockPaymentProvider.isSimulated).toBe(true)
  })

  it('plays paid, failed and cancelled without any card details', async () => {
    const base = { amountCents: 140000, currency: 'PHP', reference: 'ref-1' }
    expect(await mockPaymentProvider.createPayment(base)).toEqual({ status: 'paid', reference: 'mock_ref-1' })
    expect((await mockPaymentProvider.createPayment({ ...base, testOutcome: 'failed' })).status).toBe('failed')
    expect((await mockPaymentProvider.createPayment({ ...base, testOutcome: 'cancelled' })).status).toBe('cancelled')
    expect((await mockPaymentProvider.createPayment({ ...base, amountCents: 28.5 })).status).toBe('failed')
  })
})

describe('checkout', () => {
  it('places the order after a successful payment', async () => {
    const { product, request: input } = await request()
    const result = await checkout(input)
    expect(result.status).toBe('placed')
    if (result.status !== 'placed') return
    expect(result.order.total_cents).toBe(product.price_cents)
    expect(result.order.status).toBe('pending')
    expect((await data.orders.listMine())[0]?.id).toBe(result.order.id)
  })

  it('places no order when the payment is declined or cancelled', async () => {
    const before = (await data.orders.listMine()).length
    for (const testOutcome of ['failed', 'cancelled']) {
      const { request: input } = await request({ testOutcome })
      const result = await checkout(input)
      expect(result).toMatchObject({ status: 'failed', kind: 'payment' })
    }
    expect(await data.orders.listMine()).toHaveLength(before)
  })

  it('reports a payment service that cannot be reached, and places no order', async () => {
    const broken: PaymentProvider = { id: 'broken', isSimulated: true, createPayment: vi.fn().mockRejectedValue(new Error('offline')) }
    const { request: input } = await request()
    expect(await checkout(input, broken)).toMatchObject({ status: 'failed', kind: 'network' })
  })

  it('sends the provider the amount in whole cents and a one-time reference', async () => {
    const createPayment = vi.fn().mockResolvedValue({ status: 'paid', reference: 'x' })
    const { product, request: input } = await request()
    await checkout(input, { id: 'spy', isSimulated: true, createPayment })
    expect(createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: product.price_cents, currency: 'PHP', reference: input.requestId }),
    )
  })

  it('explains a stock problem so the cart can show it', async () => {
    const { product, request: input } = await request()
    const result = await checkout({ ...input, items: [{ product_id: product.id, quantity: product.stock + 1 }] })
    expect(result).toMatchObject({ status: 'failed', kind: 'stock' })
    if (result.status === 'failed') expect(result.message).toContain(product.name)
  })

  it('asks the visitor to sign in again when the session has ended', async () => {
    await data.auth.signOut()
    const { request: input } = await request()
    expect(await checkout(input)).toMatchObject({ status: 'failed', kind: 'session' })
  })

  it('does not place a second order when the same attempt is sent twice', async () => {
    const { request: input } = await request()
    const first = await checkout(input)
    const second = await checkout(input)
    expect(first.status === 'placed' && second.status === 'placed' && first.order.id === second.order.id).toBe(true)
  })
})

describe('payment code stays inside features/checkout', () => {
  it('nothing outside the feature imports its internals', async () => {
    const { listFiles } = await import('../helpers/css')
    const offenders = listFiles('src', (name) => /\.(ts|tsx)$/.test(name))
      .filter((path) => !path.startsWith('src/features/checkout/'))
      .filter((path) => /from ['"]@\/features\/checkout\/[^'"]+['"]/.test(read(path)))
    expect(offenders).toEqual([])
  })
})
