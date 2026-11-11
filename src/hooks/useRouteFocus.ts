import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/** Set while a route change is still waiting for its heading to render. */
export const routeFocus = { pending: false }

/**
 * After a route change, scrolls to the top and moves focus to the new page's
 * `h1` (which carries `tabindex="-1"`). A page whose heading renders later
 * (lazy route, loading state) takes the focus when it appears: `PageHeader`
 * and the error block read `routeFocus.pending`.
 */
export function useRouteFocus(): void {
  const { pathname } = useLocation()
  const previous = useRef(pathname)

  useEffect(() => {
    // The first page load keeps the browser's own focus and scroll position.
    if (previous.current === pathname) return
    previous.current = pathname
    window.scrollTo(0, 0)
    const heading = document.querySelector<HTMLElement>('main h1[tabindex="-1"]')
    if (heading) heading.focus({ preventScroll: true })
    routeFocus.pending = !heading
  }, [pathname])
}
