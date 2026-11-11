import { useId, useState } from 'react'
import { useLocation } from 'react-router'
import { Drawer, Icon } from '@/components/ui'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import styles from './AdminNav.module.css'
import { LogoLink, SkipLink } from './Header'
import { NavList, navItemClassName, type NavItem } from './Navigation'

export interface AdminNavProps {
  /** Orders waiting to be confirmed. Null while loading or when the count failed. */
  ordersToConfirm: number | null
  /** Products at or under the low-stock threshold. Null while loading or failed. */
  lowStock: number | null
  onSignOut: () => void
}

function adminItems({ ordersToConfirm, lowStock }: AdminNavProps): NavItem[] {
  return [
    { to: '/admin', label: 'Overview', icon: 'dashboard', end: true },
    { to: '/admin/products', label: 'Products', icon: 'package' },
    {
      to: '/admin/orders',
      label: 'Orders',
      icon: 'clipboard',
      count: ordersToConfirm ? { value: ordersToConfirm, description: `${ordersToConfirm} to confirm` } : undefined,
    },
    {
      to: '/admin/inventory',
      label: 'Inventory',
      icon: 'boxes',
      count: lowStock ? { value: lowStock, description: `${lowStock} low on stock` } : undefined,
    },
  ]
}

const SHOP_ITEMS: NavItem[] = [{ to: '/shop', label: 'View shop', icon: 'store' }]

function AdminLinks(props: AdminNavProps & { label: string; withLogo?: boolean }) {
  return (
    <nav aria-label={props.label} className={styles.links}>
      {props.withLogo ? <LogoLink /> : null}
      <NavList items={adminItems(props)} variant="sidebar" />
      <hr className={styles.divider} />
      <NavList items={SHOP_ITEMS} variant="sidebar" />
      <button type="button" className={navItemClassName('sidebar')} onClick={props.onSignOut}>
        <Icon name="sign-out" />
        Sign out
      </button>
    </nav>
  )
}

/*
 * Admin navigation (guidelines 4.7.3). From `breakpoint.lg` it is a sticky
 * kraft sidebar beside the content. Below it, a top bar with a menu button
 * shows the same items in the mobile menu.
 */
export function AdminNav(props: AdminNavProps) {
  const { pathname } = useLocation()
  const isWide = useMediaQuery('(min-width: 1024px)')
  const menuId = useId()
  // Closes on route change and when the screen grows past the breakpoint.
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null)
  const menuOpen = !isWide && menuOpenedOn === pathname
  const setMenuOpen = (next: boolean) => setMenuOpenedOn(next ? pathname : null)

  return (
    <>
      {isWide ? (
        <header className={styles.sidebar}>
          <SkipLink />
          <AdminLinks {...props} label="Admin" withLogo />
        </header>
      ) : (
        <header className={styles.topBar}>
          <SkipLink />
          <button
            type="button"
            className={navItemClassName('inline')}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
            Menu
          </button>
          <LogoLink />
        </header>
      )}

      <div id={menuId}>
        <Drawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title="Dashboard menu"
          side="leading"
          closeLabel="Close menu"
        >
          <AdminLinks {...props} label="Admin" />
        </Drawer>
      </div>
    </>
  )
}
