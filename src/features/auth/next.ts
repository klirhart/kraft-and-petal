/** Builds the sign-in address that returns to `path` afterwards. */
export function signInHref(path: string): string {
  return path === '/' || path.startsWith('/login') || path.startsWith('/signup')
    ? '/login'
    : `/login?next=${encodeURIComponent(path)}`
}

/**
 * Reads the `next` path from the query string. Only paths inside this site
 * are accepted, so a crafted link cannot send someone elsewhere after sign-in.
 */
export function readNextPath(search: string): string {
  const next = new URLSearchParams(search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/'
  return next
}
