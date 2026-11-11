/*
 * The payment seam. Everything outside `features/checkout` knows nothing
 * about payments; everything inside talks only to this interface. To take
 * real payments, write one new `PaymentProvider` and return it from
 * `getPaymentProvider`. A real provider keeps its secret key on a server
 * function (Supabase Edge Function or Cloudflare Pages Function), never in
 * the bundle, and the order is marked paid only from that server side.
 */
import { mockPaymentProvider } from './mockPaymentProvider'

export interface PaymentRequest {
  /** Integer cents. Shown to the customer before they pay. */
  amountCents: number
  /** ISO 4217 code, from the shop config. */
  currency: string
  /** One-time key for this attempt, so a repeat cannot charge twice. */
  reference: string
  /** Only read by a simulated provider: which outcome to play. */
  testOutcome?: string
}

export type PaymentResult =
  | { status: 'paid'; reference: string }
  | { status: 'failed'; reason: string }
  | { status: 'cancelled' }

export interface PaymentProvider {
  id: string
  /** True while no money moves. The checkout page then says payment is simulated. */
  isSimulated: boolean
  /** Outcomes a simulated provider can play, for trying the failure path. */
  testOutcomes?: { value: string; label: string }[]
  createPayment(request: PaymentRequest): Promise<PaymentResult>
}

export function getPaymentProvider(): PaymentProvider {
  return mockPaymentProvider
}
