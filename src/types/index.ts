/*
 * Shared types. Table types mirror the database columns one to one
 * (snake_case), so the same shapes work for Supabase rows and sample data.
 */

export type Role = 'customer' | 'operator'

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Delivered and cancelled orders are closed: their status can no longer change. */
export const CLOSED_ORDER_STATUSES: readonly OrderStatus[] = ['delivered', 'cancelled']

export interface Profile {
  id: string
  created_at: string
  user_id: string
  full_name: string
  role: Role
  customer_number?: number
}

export interface Category {
  id: string
  created_at: string
  name: string
  slug: string
  sort_order: number
}

export interface ProductImage {
  id: string
  created_at: string
  product_id: string
  storage_path: string
  /** Required by the database. Describes the image for people who cannot see it. */
  alt_text: string
  sort_order: number
}

export interface Product {
  id: string
  created_at: string
  category_id: string
  name: string
  slug: string
  description: string
  /** Integer cents. Never a floating-point amount. */
  price_cents: number
  stock: number
  is_active: boolean
  images: ProductImage[]
}

export interface OrderItem {
  id: string
  created_at: string
  order_id: string
  product_id: string
  /** Name at the time of purchase, so history survives renames and hidden products. */
  product_name: string
  quantity: number
  unit_price_cents: number
}

export interface Order {
  id: string
  created_at: string
  /** The auth user id of the customer (`profiles.user_id`). */
  customer_id: string
  status: OrderStatus
  total_cents: number
  /** ISO date, YYYY-MM-DD. */
  delivery_date: string
  delivery_address: string
  note: string | null
  items: OrderItem[]
  /** Only present where the reader may see customer profiles (operators). */
  customer_name?: string
  customer_number?: number
  payment_method?: 'gcash' | 'maya' | 'gotyme' | 'cod' | null
  payment_status?: 'pending_verification' | 'unpaid_cod' | 'paid' | null
  payment_reference?: string | null
  payment_proof_path?: string | null
}

export interface Session {
  userId: string
  email: string
  profile: Profile
}

export interface SampleAccount {
  role: Role
  fullName: string
  email: string
  password: string
}

export interface Credentials {
  email: string
  password: string
}

export interface SignUpInput extends Credentials {
  fullName: string
}

export interface SignUpResult {
  session: Session | null
  /** True when the backend sent a confirmation email instead of signing in. */
  needsEmailConfirmation: boolean
}

export interface PlaceOrderInput {
  items: { product_id: string; quantity: number }[]
  delivery_date: string
  delivery_address: string
  note: string | null
  /** One-time key (a UUID). Sending the same key again returns the first order. */
  request_id?: string
  payment_method?: 'gcash' | 'maya' | 'gotyme' | 'cod'
  payment_reference?: string | null
  payment_proof_path?: string | null
}

export interface ProductInput {
  category_id: string
  name: string
  slug: string
  description: string
  price_cents: number
  stock: number
  is_active: boolean
  image: {
    storage_path: string
    alt_text: string
  }
}

export interface ProductFilter {
  categorySlug?: string
  limit?: number
}
