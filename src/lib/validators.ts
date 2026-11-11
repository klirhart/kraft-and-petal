import { LIMITS, SHOP_CONFIG } from './config'
import { addDays, formatDate, parsePriceToCents, shopToday } from './formatters'

/** Field name to message. An empty object means the form is valid. */
export type FieldErrors<T extends string = string> = Partial<Record<T, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const POSTAL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]{1,10}$/

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

export function isSlug(value: string): boolean {
  return SLUG_PATTERN.test(value)
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean)
}

export interface SignInValues {
  email: string
  password: string
}

export function validateSignIn(values: SignInValues): FieldErrors<keyof SignInValues> {
  const errors: FieldErrors<keyof SignInValues> = {}
  if (!values.email.trim()) errors.email = 'Enter your email address.'
  else if (!isEmail(values.email)) errors.email = 'Enter an email address like name@example.com.'
  if (!values.password) errors.password = 'Enter your password.'
  return errors
}

export interface SignUpValues extends SignInValues {
  fullName: string
}

export function validateSignUp(values: SignUpValues): FieldErrors<keyof SignUpValues> {
  const errors: FieldErrors<keyof SignUpValues> = validateSignIn(values)
  const name = values.fullName.trim()
  if (!name) errors.fullName = 'Enter your full name.'
  else if (name.length > LIMITS.fullName) {
    errors.fullName = `Enter a name of ${LIMITS.fullName} characters or fewer.`
  }
  if (!values.password) errors.password = 'Choose a password.'
  else if (values.password.length < LIMITS.passwordMin) {
    errors.password = `Choose a password of at least ${LIMITS.passwordMin} characters.`
  }
  return errors
}

export interface DeliveryValues {
  recipient: string
  phone: string
  street: string
  city: string
  postalCode: string
  deliveryDate: string
  note: string
}

export function earliestDeliveryDate(now: Date = new Date()): string {
  return addDays(shopToday(now), SHOP_CONFIG.earliestDeliveryInDays)
}

export function latestDeliveryDate(now: Date = new Date()): string {
  return addDays(shopToday(now), SHOP_CONFIG.latestDeliveryInDays)
}

export function validateDelivery(
  values: DeliveryValues,
  now: Date = new Date(),
): FieldErrors<keyof DeliveryValues> {
  const errors: FieldErrors<keyof DeliveryValues> = {}
  const recipient = values.recipient.trim()
  if (!recipient) errors.recipient = 'Enter the name of the person receiving the order.'
  else if (recipient.length > LIMITS.fullName) {
    errors.recipient = `Enter a name of ${LIMITS.fullName} characters or fewer.`
  }
  if (!/^[0-9+()\-.\s]{7,20}$/.test(values.phone.trim())) {
    errors.phone = 'Enter a phone number we can reach on delivery day.'
  }
  if (!values.street.trim()) errors.street = 'Enter your delivery address.'
  else if (values.street.trim().length > 200) {
    errors.street = 'Enter a street address of 200 characters or fewer.'
  }
  if (!values.city.trim()) errors.city = 'Enter the town or city.'
  else if (values.city.trim().length > 80) errors.city = 'Enter a town or city of 80 characters or fewer.'
  if (!POSTAL_CODE_PATTERN.test(values.postalCode.trim())) {
    errors.postalCode = 'Enter the postal code for the delivery address.'
  }
  const earliest = earliestDeliveryDate(now)
  const latest = latestDeliveryDate(now)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.deliveryDate) || values.deliveryDate < earliest) {
    errors.deliveryDate = `Choose a delivery date from ${formatDate(earliest)}.`
  } else if (values.deliveryDate > latest) {
    errors.deliveryDate = `Choose a delivery date up to ${formatDate(latest)}.`
  }
  if (values.note.length > LIMITS.orderNote) {
    errors.note = `Keep the note to ${LIMITS.orderNote} characters or fewer.`
  }
  return errors
}

/** Joins the delivery form into the single `delivery_address` text column. */
export function formatDeliveryAddress(values: DeliveryValues): string {
  return [
    values.recipient,
    values.street,
    `${values.city.trim()} ${values.postalCode.trim().toUpperCase()}`,
    `Phone ${values.phone.trim()}`,
  ]
    .map((part) => part.trim())
    .join('\n')
}

export interface ProductFormValues {
  name: string
  slug: string
  categoryId: string
  description: string
  price: string
  stock: string
  storagePath: string
  altText: string
}

export function validateProductForm(values: ProductFormValues): FieldErrors<keyof ProductFormValues> {
  const errors: FieldErrors<keyof ProductFormValues> = {}
  const name = values.name.trim()
  if (!name) errors.name = 'Enter a product name.'
  else if (name.length > LIMITS.productName) {
    errors.name = `Enter a name of ${LIMITS.productName} characters or fewer.`
  }
  if (!isSlug(values.slug)) {
    errors.slug = 'Enter a web address name using lowercase letters, numbers and hyphens.'
  }
  if (!values.categoryId) errors.categoryId = 'Choose a category.'
  if (values.description.length > LIMITS.productDescription) {
    errors.description = `Keep the description to ${LIMITS.productDescription} characters or fewer.`
  }
  if (parsePriceToCents(values.price) === null) {
    errors.price = 'Enter a price like 1899.00.'
  }
  if (parseStock(values.stock) === null) {
    errors.stock = `Enter a whole number from 0 to ${SHOP_CONFIG.maxStock}.`
  }
  if (!values.storagePath) errors.storagePath = 'Choose a picture for the product.'
  const alt = values.altText.trim()
  if (!alt) errors.altText = 'Enter an image description for people who cannot see the picture.'
  else if (alt.length > LIMITS.imageDescription) {
    errors.altText = `Keep the image description to ${LIMITS.imageDescription} characters or fewer.`
  } else if (/^(image|photo|picture) of\b/i.test(alt)) {
    errors.altText = 'Describe what is in the picture, without starting "Image of" or "Photo of".'
  }
  return errors
}

/** Whole stock count from 0 to the maximum, or null when the text is not one. */
export function parseStock(input: string): number | null {
  if (!/^\d{1,4}$/.test(input.trim())) return null
  const value = Number(input.trim())
  return value <= SHOP_CONFIG.maxStock ? value : null
}

/** The most of a product one cart line may hold. */
export function maxCartQuantity(stock: number): number {
  return Math.max(0, Math.min(stock, SHOP_CONFIG.maxPerCartLine))
}

/** Nearest allowed quantity between `min` and `max`. */
export function clampQuantity(quantity: number, min: number, max: number): number {
  if (!Number.isFinite(quantity)) return min
  return Math.max(min, Math.min(Math.trunc(quantity), Math.max(min, max)))
}
