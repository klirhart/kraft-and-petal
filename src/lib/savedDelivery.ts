import type { DeliveryValues } from '@/lib/validators'

const KEY = 'kraft-petal.checkout.v1'

export const EMPTY_DELIVERY: DeliveryValues = {
  recipient: '',
  phone: '',
  street: '',
  city: '',
  postalCode: '',
  deliveryDate: '',
  note: '',
}

/**
 * Delivery details typed so far, kept for this browser tab only, so a
 * sign-in redirect or an expired session never asks for them twice.
 */
export function readSavedDelivery(): DeliveryValues {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_DELIVERY
    const saved = parsed as Record<string, unknown>
    const values = { ...EMPTY_DELIVERY }
    for (const name of Object.keys(values) as (keyof DeliveryValues)[]) {
      const value = saved[name]
      if (typeof value === 'string') values[name] = value
    }
    return values
  } catch {
    return EMPTY_DELIVERY
  }
}

export function saveDelivery(values: DeliveryValues): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(values))
  } catch {
    // Storage blocked: the form still works, it just will not survive a reload.
  }
}

export function clearSavedDelivery(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
