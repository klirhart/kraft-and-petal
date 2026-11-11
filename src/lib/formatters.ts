import type { OrderStatus } from '@/types'
import { SHOP_CONFIG } from './config'

const priceFormat = new Intl.NumberFormat(SHOP_CONFIG.locale, {
  style: 'currency',
  currency: SHOP_CONFIG.currency,
})
const currencyParts = priceFormat.formatToParts(0)

// Calendar dates carry no time, so they are formatted in UTC and never shift
// with the viewer's time zone.
const dateFormat = new Intl.DateTimeFormat(SHOP_CONFIG.locale, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const dateTimeFormat = new Intl.DateTimeFormat(SHOP_CONFIG.locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const shopDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHOP_CONFIG.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Formats integer cents for display. The only way money is written in the UI. */
export function formatPrice(cents: number): string {
  return priceFormat.format(cents / 100)
}

/** The currency symbol, for the adornment inside a price field. */
export const currencySymbol: string =
  currencyParts.find((part) => part.type === 'currency')?.value ?? SHOP_CONFIG.currency

/**
 * Turns what an operator typed ("12", "12.5", "12.50") into integer cents by
 * reading the digits, never by multiplying a float. Null when it is not a
 * valid amount.
 */
export function parsePriceToCents(input: string): number | null {
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(input.trim())
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? '').padEnd(2, '0') || '0')
  return whole * 100 + fraction
}

/** Integer cents as a plain "12.50" string for a price field. */
export function centsToInputValue(cents: number): string {
  const whole = Math.trunc(cents / 100)
  const fraction = String(cents % 100).padStart(2, '0')
  return `${whole}.${fraction}`
}

/** Formats a calendar date (YYYY-MM-DD) with its weekday, e.g. "Thursday, November 12". */
export function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? isoDate : dateFormat.format(date)
}

export function formatDateTime(isoTimestamp: string): string {
  const date = new Date(isoTimestamp)
  return Number.isNaN(date.getTime()) ? isoTimestamp : dateTimeFormat.format(date)
}

/** Today's calendar date in the shop's time zone, as YYYY-MM-DD. */
export function shopToday(now: Date = new Date()): string {
  return shopDayFormat.format(now)
}

/** A calendar date a number of days after another, as YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Order received',
  confirmed: 'Confirmed',
  preparing: 'Being arranged',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function formatOrderStatus(status: OrderStatus): string {
  return STATUS_LABELS[status]
}

/** The order number people read out: the first 8 characters of the id, e.g. "3F9A12C4". */
export function formatOrderNumber(orderId: string): string {
  return orderId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** "Maya Linden" to "Maya". Falls back to "Account" when there is no name. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'Account'
}
