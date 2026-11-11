import { SHOP_CONFIG } from '@/lib/config'
import { data } from '@/lib/data'
import { DataError } from '@/lib/errors'
import type { Order, PlaceOrderInput } from '@/types'
import { getPaymentProvider, type PaymentProvider } from './payment'

export type CheckoutResult =
  | { status: 'placed'; order: Order }
  /** `stock`: an item sold out or left the shop, so the cart needs a look. */
  | { status: 'failed'; kind: 'payment' | 'stock' | 'session' | 'network' | 'server'; message: string }

export interface CheckoutRequest extends Omit<PlaceOrderInput, 'request_id'> {
  /** What the customer saw as the total. The database works out the real one. */
  expectedTotalCents: number
  /** One-time key for this checkout attempt. */
  requestId: string
  testOutcome?: string
}

/**
 * Takes the payment through the provider, then asks the backend to create
 * the order. The backend sets prices, total, customer and status itself;
 * nothing here is trusted for those.
 */
export async function checkout(
  request: CheckoutRequest,
  provider: PaymentProvider = getPaymentProvider(),
): Promise<CheckoutResult> {
  let payment
  try {
    payment = await provider.createPayment({
      amountCents: request.expectedTotalCents,
      currency: SHOP_CONFIG.currency,
      reference: request.requestId,
      testOutcome: request.testOutcome,
    })
  } catch {
    return {
      status: 'failed',
      kind: 'network',
      message: "We couldn't reach the payment service. You haven't been charged. Try again.",
    }
  }
  if (payment.status === 'cancelled') {
    return { status: 'failed', kind: 'payment', message: "The payment was cancelled. You haven't been charged." }
  }
  if (payment.status === 'failed') {
    return {
      status: 'failed',
      kind: 'payment',
      message: "The payment didn't go through, so we haven't placed your order. Try again or use another way to pay.",
    }
  }

  try {
    const order = await data.orders.place({
      items: request.items,
      delivery_date: request.delivery_date,
      delivery_address: request.delivery_address,
      note: request.note,
      request_id: request.requestId,
    })
    return { status: 'placed', order }
  } catch (error) {
    if (error instanceof DataError) {
      if (error.code === 'out-of-stock' || error.code === 'unavailable') {
        return { status: 'failed', kind: 'stock', message: error.message }
      }
      if (error.code === 'auth-required') {
        return { status: 'failed', kind: 'session', message: 'Your session ended. Sign in again and your details will still be here.' }
      }
      if (error.code === 'network') {
        return { status: 'failed', kind: 'network', message: 'You seem to be offline. Check your connection and try again.' }
      }
      if (error.code === 'invalid' && error.message) {
        return { status: 'failed', kind: 'server', message: error.message }
      }
    }
    return {
      status: 'failed',
      kind: 'server',
      message: "Something went wrong on our side, so we haven't placed your order. Your cart is safe. Try again.",
    }
  }
}
