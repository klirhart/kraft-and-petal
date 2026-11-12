import { data } from '@/lib/data'
import { DataError } from '@/lib/errors'
import type { Order, PlaceOrderInput } from '@/types'

export type CheckoutResult =
  | { status: 'placed'; order: Order }
  /** `stock`: an item sold out or left the shop, so the cart needs a look. */
  | { status: 'failed'; kind: 'payment' | 'stock' | 'session' | 'network' | 'server'; message: string }

export interface CheckoutRequest extends Omit<PlaceOrderInput, 'request_id'> {
  /** What the customer saw as the total. The database works out the real one. */
  expectedTotalCents: number
  /** One-time key for this checkout attempt. */
  requestId: string
  paymentFile?: File | null
}

/** Orders are unpaid until an operator verifies an actual transfer (or collects COD). */
export async function checkout(request: CheckoutRequest): Promise<CheckoutResult> {
  if (!request.payment_method) {
    return { status: 'failed', kind: 'payment', message: 'Select a payment method.' }
  }
  if (request.payment_method !== 'cod' && !request.payment_reference?.trim() && !request.paymentFile) {
    return { status: 'failed', kind: 'payment', message: 'Enter a transaction reference or upload payment proof.' }
  }
  let proofPath = request.payment_proof_path ?? null
  if (request.paymentFile) {
    try {
      proofPath = await data.orders.uploadPaymentProof(request.paymentFile, request.requestId)
    } catch {
      return { status: 'failed', kind: 'network', message: 'Could not upload the proof image. Try again or enter a transaction reference.' }
    }
  }
  try {
    const order = await data.orders.place({
      items: request.items,
      delivery_date: request.delivery_date,
      delivery_address: request.delivery_address,
      note: request.note,
      request_id: request.requestId,
      payment_method: request.payment_method,
      payment_reference: request.payment_reference?.trim() || null,
      payment_proof_path: proofPath,
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
