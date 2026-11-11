import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

const inBrowserLikeEnvironment = typeof window !== 'undefined'

if (inBrowserLikeEnvironment) {
  // jsdom has no layout engine; these are the browser APIs the app touches.
  // Width queries answer for jsdom's window width (1024px: the widest layout).
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: (() => {
          const min = /\(min-width:\s*(\d+)px\)/.exec(query)
          return min ? window.innerWidth >= Number(min[1]) : false
        })(),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  }
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    window.sessionStorage.clear()
    document.documentElement.removeAttribute('data-overlay-open')
  })
}
