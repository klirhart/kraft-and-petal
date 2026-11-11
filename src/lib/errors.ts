export type DataErrorCode =
  | 'auth-required'
  | 'forbidden'
  | 'invalid-credentials'
  | 'email-taken'
  | 'not-found'
  | 'out-of-stock'
  | 'unavailable'
  | 'in-use'
  | 'invalid'
  | 'network'
  | 'unknown'

/** One error type for every backend, so screens never branch on the provider. */
export class DataError extends Error {
  readonly code: DataErrorCode

  constructor(code: DataErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'DataError'
    this.code = code
  }
}

const FRIENDLY: Record<DataErrorCode, string> = {
  'auth-required': 'Please sign in to continue.',
  forbidden: "Your account can't do that.",
  'invalid-credentials': "That email and password don't match. Please try again.",
  'email-taken': 'There is already an account with that email. Try signing in.',
  'not-found': "We couldn't find that.",
  'out-of-stock': "Sorry, we don't have enough of that left.",
  unavailable: 'Sorry, that item is no longer available.',
  'in-use': 'This is part of past orders, so it cannot be deleted. Hide it instead.',
  invalid: 'Something in that request was not right. Please check and try again.',
  network: "We couldn't reach the shop. Check your connection and try again.",
  unknown: 'Something went wrong on our side. Please try again.',
}

/** Short, human copy for any thrown value. Never leaks raw backend text. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof DataError) {
    const detailed: DataErrorCode[] = ['out-of-stock', 'unavailable', 'invalid']
    if (detailed.includes(error.code) && error.message) return error.message
    return FRIENDLY[error.code]
  }
  return FRIENDLY.unknown
}

export function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value))
}

/** Which route-level error block fits: the request never arrived, or the backend failed. */
export function errorVariant(error: unknown): 'offline' | 'server' {
  if (error instanceof DataError && error.code === 'network') return 'offline'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline'
  return 'server'
}
