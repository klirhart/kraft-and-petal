// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  addDays,
  centsToInputValue,
  firstName,
  formatDate,
  formatOrderNumber,
  formatOrderStatus,
  formatPrice,
  parsePriceToCents,
  pluralize,
  shopToday,
  slugify,
} from '@/lib/formatters'
import { ORDER_STATUSES } from '@/types'

describe('formatPrice', () => {
  it('formats integer cents in the shop currency', () => {
    expect(formatPrice(190000)).toBe('₱1,900.00')
    expect(formatPrice(22500)).toBe('₱225.00')
    expect(formatPrice(0)).toBe('₱0.00')
    expect(formatPrice(123456)).toBe('₱1,234.56')
  })
})

describe('parsePriceToCents', () => {
  it('reads decimals as text, never through floating point', () => {
    expect(parsePriceToCents('24.50')).toBe(2450)
    expect(parsePriceToCents('24.5')).toBe(2450)
    expect(parsePriceToCents('24')).toBe(2400)
    expect(parsePriceToCents(' 0.07 ')).toBe(7)
    // 19.99 * 100 is 1998.9999999999998 in floating point.
    expect(parsePriceToCents('19.99')).toBe(1999)
    expect(parsePriceToCents('1.10')).toBe(110)
    expect(parsePriceToCents('0')).toBe(0)
  })

  it('rejects anything that is not a plain price', () => {
    for (const input of ['', 'abc', '-5', '1.999', '1,50', '1e3', '$5', '5.', '.5.5']) {
      expect(parsePriceToCents(input), input).toBeNull()
    }
  })

  it('round-trips with the value shown in the price field', () => {
    for (const cents of [0, 5, 450, 3800, 99999]) {
      expect(parsePriceToCents(centsToInputValue(cents))).toBe(cents)
    }
  })
})

describe('dates', () => {
  it('formats a calendar date without shifting it across time zones', () => {
    expect(formatDate('2026-11-13')).toBe('Friday, November 13')
  })

  it('works out the shop day in the shop time zone', () => {
    // Manila is UTC+8. 15:30 UTC on the 10th is already 23:30 on the 10th;
    // 16:30 UTC on the 10th is 00:30 on the 11th.
    expect(shopToday(new Date('2026-11-10T15:30:00Z'))).toBe('2026-11-10')
    expect(shopToday(new Date('2026-11-10T16:30:00Z'))).toBe('2026-11-11')
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('words', () => {
  it('has a customer-facing label for every order status', () => {
    for (const status of ORDER_STATUSES) {
      const label = formatOrderStatus(status)
      expect(label.length).toBeGreaterThan(3)
      expect(label).not.toContain('_')
    }
  })

  it('shortens an order id to eight characters', () => {
    expect(formatOrderNumber('a0fa0e85-0000-4000-8000-000600000003')).toBe('A0FA0E85')
  })

  it('makes web address names', () => {
    expect(slugify('Blush Peony Bouquet')).toBe('blush-peony-bouquet')
    expect(slugify('  Crème & Green — Wrap!  ')).toBe('creme-and-green-wrap')
  })

  it('pluralizes and finds a first name', () => {
    expect(pluralize(1, 'item')).toBe('1 item')
    expect(pluralize(3, 'item')).toBe('3 items')
    expect(firstName('Maya Linden')).toBe('Maya')
  })
})
