import type { PaymentProvider } from './payment'

/**
 * Stands in for a payment company until one is chosen. It takes no card
 * details and moves no money: it waits a moment and plays the outcome that
 * was asked for (approved unless told otherwise).
 */
export const mockPaymentProvider: PaymentProvider = {
  id: 'mock',
  isSimulated: true,
  testOutcomes: [
    { value: 'paid', label: 'Payment goes through' },
    { value: 'failed', label: 'Payment is declined' },
  ],
  async createPayment(request) {
    await new Promise((resolve) => setTimeout(resolve, import.meta.env.MODE === 'test' ? 0 : 600))
    if (!Number.isInteger(request.amountCents) || request.amountCents < 0) {
      return { status: 'failed', reason: 'The amount to pay was not valid.' }
    }
    switch (request.testOutcome) {
      case 'failed':
        return { status: 'failed', reason: 'The payment was declined.' }
      case 'cancelled':
        return { status: 'cancelled' }
      default:
        return { status: 'paid', reference: `mock_${request.reference}` }
    }
  },
}
