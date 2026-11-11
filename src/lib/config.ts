/*
 * Shop-wide constants. Change a business rule here, not in a component.
 *
 * Prices are Philippine pesos (PHP). Changing locale / currency here
 * re-formats every price and date across the shop and dashboard.
 */
export const SHOP_CONFIG = {
  name: 'Kraft & Petal',
  locale: 'en-PH',
  currency: 'PHP',
  /** The earliest delivery date is worked out in the shop's own time zone. */
  timeZone: 'Asia/Manila',
  /** "Only N left" shows at this stock level or lower. */
  lowStockThreshold: 5,
  /** Earliest delivery is tomorrow: we need a day to arrange an order. */
  earliestDeliveryInDays: 1,
  latestDeliveryInDays: 60,
  /** Most of one product a cart may hold, stock permitting. */
  maxPerCartLine: 99,
  maxStock: 9999,
  /** Products shown per "Show more" step on /shop. */
  shopPageSize: 12,
  /** Rows per page in dashboard tables. */
  tablePageSize: 25,
  contact: {
    email: 'hello@kraftandpetal.example',
    phone: null as string | null,
    addressLines: ['12 Garden Row', 'Quezon City'],
    hours: ['Tuesday to Saturday, 9am to 5pm', 'Sunday, 10am to 2pm', 'Closed on Monday'] as
      | string[]
      | null,
  },
} as const

/** Length limits, enforced by the validators here and by the database. */
export const LIMITS = {
  passwordMin: 8,
  fullName: 80,
  productName: 80,
  productDescription: 2000,
  orderNote: 500,
  imageDescription: 125,
  deliveryAddress: 500,
} as const

/** Product photo uploads (Supabase Storage). */
export const IMAGE_UPLOAD = {
  maxBytes: 300 * 1024,
  /** Longest edge in pixels after the browser shrinks a photo. */
  maxEdge: 1600,
  types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>,
  accept: 'image/jpeg,image/png,image/webp',
} as const
