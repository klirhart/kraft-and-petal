import { render } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { Providers } from '@/app/providers'
import { AppRoutes } from '@/app/router'

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location" hidden>{location.pathname + location.search}</output>
}

/** Renders the whole app at `path`, the way a visitor opening that URL sees it. */
export function renderApp(path: string) {
  return render(
    <Providers>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </Providers>,
  )
}

export function currentLocation(): string {
  return document.querySelector('[data-testid="location"]')?.textContent ?? ''
}
