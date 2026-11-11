// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { LIMITS, SHOP_CONFIG } from '@/lib/config'
import { addDays, shopToday } from '@/lib/formatters'
import {
  clampQuantity,
  earliestDeliveryDate,
  formatDeliveryAddress,
  hasErrors,
  isEmail,
  isSlug,
  latestDeliveryDate,
  maxCartQuantity,
  parseStock,
  validateDelivery,
  validateProductForm,
  validateSignIn,
  validateSignUp,
  type DeliveryValues,
  type ProductFormValues,
} from '@/lib/validators'

const NOW = new Date('2026-11-10T15:00:00Z')

const delivery: DeliveryValues = {
  recipient: 'Maya Linden',
  phone: '555 010 2030',
  street: '4 Fern Lane',
  city: 'Quezon City',
  postalCode: '1100',
  deliveryDate: '2026-11-13',
  note: '',
}

const product: ProductFormValues = {
  name: 'Test Posy',
  slug: 'test-posy',
  categoryId: 'c1',
  description: 'A small posy.',
  price: '12.50',
  stock: '4',
  storagePath: 'illustrations/bouquet-lilac',
  altText: 'A small posy of lilac tulips',
}

describe('shop config', () => {
  it('holds the business rules from the guidelines', () => {
    expect(SHOP_CONFIG.lowStockThreshold).toBe(5)
    expect(SHOP_CONFIG.earliestDeliveryInDays).toBe(1)
    expect(SHOP_CONFIG.currency).toMatch(/^[A-Z]{3}$/)
    expect(LIMITS.orderNote).toBe(500)
  })
})

describe('sign in and sign up', () => {
  it('recognises email addresses', () => {
    expect(isEmail('maya@example.com')).toBe(true)
    for (const bad of ['', 'maya', 'maya@', '@example.com', 'a b@example.com']) expect(isEmail(bad), bad).toBe(false)
  })

  it('asks for both fields on sign in', () => {
    expect(Object.keys(validateSignIn({ email: '', password: '' })).sort()).toEqual(['email', 'password'])
    expect(hasErrors(validateSignIn({ email: 'maya@example.com', password: 'x' }))).toBe(false)
  })

  it('asks for a name and a password of at least eight characters on sign up', () => {
    const errors = validateSignUp({ fullName: ' ', email: 'maya@example.com', password: 'short' })
    expect(errors.fullName).toBeTruthy()
    expect(errors.password).toContain(String(LIMITS.passwordMin))
    expect(hasErrors(validateSignUp({ fullName: 'Maya', email: 'maya@example.com', password: 'longenough' }))).toBe(false)
  })
})

describe('delivery details', () => {
  it('accepts a complete form', () => {
    expect(validateDelivery(delivery, NOW)).toEqual({})
  })

  it('names every missing field', () => {
    const errors = validateDelivery(
      { recipient: '', phone: '', street: '', city: '', postalCode: '', deliveryDate: '', note: '' },
      NOW,
    )
    expect(Object.keys(errors).sort()).toEqual(['city', 'deliveryDate', 'phone', 'postalCode', 'recipient', 'street'])
  })

  it('offers tomorrow as the earliest delivery date', () => {
    const today = shopToday(NOW)
    expect(earliestDeliveryDate(NOW)).toBe(addDays(today, 1))
    expect(validateDelivery({ ...delivery, deliveryDate: today }, NOW).deliveryDate).toBeTruthy()
    expect(validateDelivery({ ...delivery, deliveryDate: addDays(today, 1) }, NOW).deliveryDate).toBeUndefined()
    expect(validateDelivery({ ...delivery, deliveryDate: addDays(latestDeliveryDate(NOW), 1) }, NOW).deliveryDate).toBeTruthy()
  })

  it('limits the note', () => {
    expect(validateDelivery({ ...delivery, note: 'x'.repeat(LIMITS.orderNote + 1) }, NOW).note).toBeTruthy()
    expect(validateDelivery({ ...delivery, note: 'x'.repeat(LIMITS.orderNote) }, NOW).note).toBeUndefined()
  })

  it('writes the address as text lines', () => {
    const address = formatDeliveryAddress(delivery)
    expect(address).toContain('Maya Linden')
    expect(address).toContain('4 Fern Lane')
    expect(address.split('\n').length).toBeGreaterThanOrEqual(3)
    expect(address.length).toBeLessThanOrEqual(LIMITS.deliveryAddress)
  })
})

describe('product form', () => {
  it('accepts a complete form', () => {
    expect(validateProductForm(product)).toEqual({})
  })

  it('requires an image description', () => {
    expect(validateProductForm({ ...product, altText: '   ' }).altText).toBeTruthy()
    expect(validateProductForm({ ...product, altText: 'x'.repeat(LIMITS.imageDescription + 1) }).altText).toBeTruthy()
  })

  it('checks the price, stock and web address name', () => {
    expect(validateProductForm({ ...product, price: '12.505' }).price).toBeTruthy()
    expect(validateProductForm({ ...product, price: '-1' }).price).toBeTruthy()
    expect(validateProductForm({ ...product, stock: '1.5' }).stock).toBeTruthy()
    expect(validateProductForm({ ...product, stock: String(SHOP_CONFIG.maxStock + 1) }).stock).toBeTruthy()
    expect(validateProductForm({ ...product, slug: 'Not A Slug' }).slug).toBeTruthy()
    expect(isSlug('blush-peony-bouquet')).toBe(true)
    expect(isSlug('-bad-')).toBe(false)
  })
})

describe('quantities', () => {
  it('reads stock as a whole number, zero or more', () => {
    expect(parseStock('12')).toBe(12)
    expect(parseStock('0')).toBe(0)
    for (const bad of ['', '-1', '1.5', 'ten']) expect(parseStock(bad), bad).toBeNull()
  })

  it('caps a cart line at the stock level and the per-line limit', () => {
    expect(maxCartQuantity(3)).toBe(3)
    expect(maxCartQuantity(5000)).toBe(SHOP_CONFIG.maxPerCartLine)
    expect(clampQuantity(0, 1, 5)).toBe(1)
    expect(clampQuantity(9, 1, 5)).toBe(5)
    expect(clampQuantity(3, 1, 5)).toBe(3)
  })
})
