import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { LogoMark } from '@/components/illustrations/Scenes'
import { Button, ButtonLink, Drawer, Icon, Skeleton } from '@/components/ui'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import styles from './Header.module.css'
import { NavList, navItemClassName, shopNavItem, type NavItem } from './Navigation'

export type AccountState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; firstName: string; fullName: string; isOperator: boolean }

export interface HeaderProps {
  account: AccountState
  /** Where "Sign in" leads, with the return path already in it. */
  signInHref: string
  onSignOut: () => void
  cartCount: number
  /** The cart control opens the drawer, except on /cart and /checkout where it is a link. */
  cartAsLink: boolean
  onOpenCart: () => void
}

/* The main navigation sits on both sides of the centred logo. */
const LEADING_ITEMS: NavItem[] = [
  shopNavItem('Shop all', null),
  shopNavItem('Bouquets', 'bouquets'),
  shopNavItem('Plants', 'plants'),
  shopNavItem('Gifts', 'gifts'),
]

const TRAILING_ITEMS: NavItem[] = [
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const WORKSHOPS = shopNavItem('Workshops', 'workshops')

/** The mobile menu lists everything in one column. */
const MENU_ITEMS: NavItem[] = [...LEADING_ITEMS, WORKSHOPS, ...TRAILING_ITEMS]

const ANNOUNCEMENT = 'Every bouquet is tied by hand on the day it leaves the shop'

function accountItems(account: AccountState): NavItem[] {
  if (account.status !== 'signed-in') return []
  const items: NavItem[] = [{ to: '/account/orders', label: 'Your orders', icon: 'package' }]
  if (account.isOperator) items.push({ to: '/admin', label: 'Dashboard', icon: 'dashboard', end: true })
  return items
}

/** The logo link, shared by the header and the admin sidebar. */
export function LogoLink() {
  return (
    <Link to="/" className={styles.logo} aria-label="Kraft & Petal, home">
      <LogoMark className={styles.logoMark} />
      <span className={`font-display ${styles.logoText}`}>Kraft &amp; Petal</span>
    </Link>
  )
}

/** First focusable element of every page. Moves focus to `<main>`. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className={styles.skipLink}
      onClick={(event) => {
        event.preventDefault()
        const main = document.getElementById('main')
        main?.focus()
        main?.scrollIntoView()
      }}
    >
      Skip to main content
    </a>
  )
}

/** Account disclosure: a button and a plain list of links. Not a menu. */
function AccountPanel({
  account,
  onSignOut,
}: {
  account: Extract<AccountState, { status: 'signed-in' }>
  onSignOut: () => void
}) {
  // The panel remembers the page it was opened on, so a route change closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null)
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const open = openedOn === pathname

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpenedOn(null)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpenedOn(null)
      buttonRef.current?.focus()
    }
    document.addEventListener('click', onPointer)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onPointer)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={styles.account} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`${navItemClassName('inline')} ${styles.iconItem}`}
        aria-label={`Account, ${account.firstName}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpenedOn(open ? null : pathname)}
      >
        <Icon name="user" />
        <span className={styles.signedInDot} aria-hidden="true" />
      </button>
      <div id={panelId} className={styles.accountPanel} hidden={!open}>
        <p className={`type-caption ${styles.accountFullName}`}>Signed in as {account.fullName}</p>
        <NavList items={accountItems(account)} variant="stacked" />
        <button type="button" className={navItemClassName('stacked')} onClick={onSignOut}>
          <Icon name="sign-out" />
          Sign out
        </button>
      </div>
    </div>
  )
}

function cartLabel(count: number): string {
  if (count === 0) return 'Cart, empty'
  return `Cart, ${count} ${count === 1 ? 'item' : 'items'}`
}

/*
 * Storefront header (guidelines 4.7.1, restyled). An announcement band, then
 * one row with the logo in the centre. DOM order follows the reading order:
 * skip link, menu button (narrow screens), the main navigation (links, logo,
 * links), account control, Workshops, cart control. Below `breakpoint.lg`
 * the navigation links move into the mobile menu and the logo stays centred
 * between the menu button and the cart.
 */
export function Header({ account, signInHref, onSignOut, cartCount, cartAsLink, onOpenCart }: HeaderProps) {
  const { pathname, search } = useLocation()
  const isWide = useMediaQuery('(min-width: 1024px)')
  const menuId = useId()
  // The menu remembers where it was opened, so it closes on route change and
  // when the screen grows past the breakpoint.
  const here = pathname + search
  const [menuOpenedOn, setMenuOpenedOn] = useState<string | null>(null)
  const menuOpen = !isWide && menuOpenedOn === here
  const setMenuOpen = (next: boolean) => setMenuOpenedOn(next ? here : null)

  const count = cartCount > 99 ? '99+' : String(cartCount)
  const cartContent = (
    <>
      <Icon name="cart" />
      {cartCount > 0 ? (
        <span className={styles.cartCount} aria-hidden="true">
          {count}
        </span>
      ) : null}
    </>
  )
  const cartClassName = `${navItemClassName('inline')} ${styles.iconItem}`

  return (
    <header className={styles.header}>
      <SkipLink />
      <div className={styles.announcement}>
        <p className={styles.announcementText}>{ANNOUNCEMENT}</p>
      </div>
      <div className={styles.inner}>
        <button
          type="button"
          className={`${navItemClassName('inline')} ${styles.iconItem} ${styles.menuButton}`}
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen(true)}
        >
          <Icon name="menu" />
        </button>

        <nav className={styles.mainNav} aria-label="Main">
          <div className={styles.navLeading}>
            <NavList items={LEADING_ITEMS} variant="inline" />
          </div>
          <LogoLink />
          <div className={styles.navTrailing}>
            <NavList items={TRAILING_ITEMS} variant="inline" />
          </div>
        </nav>

        <div className={styles.tools}>
          <div className={styles.accountArea}>
            {account.status === 'loading' ? (
              <Skeleton shape="chip" className={styles.accountSkeleton} />
            ) : account.status === 'signed-in' ? (
              <nav aria-label="Account">
                <AccountPanel account={account} onSignOut={onSignOut} />
              </nav>
            ) : (
              <Link to={signInHref} className={`${navItemClassName('inline')} ${styles.iconItem}`} aria-label="Sign in">
                <Icon name="user" />
              </Link>
            )}
          </div>

          <ButtonLink
            to={WORKSHOPS.to}
            className={styles.workshops}
            aria-current={WORKSHOPS.current?.({ pathname, search }) ? 'page' : undefined}
          >
            {WORKSHOPS.label}
          </ButtonLink>

          {cartAsLink ? (
            <Link
              to="/cart"
              className={cartClassName}
              aria-label={cartLabel(cartCount)}
              aria-current={pathname === '/cart' ? 'page' : undefined}
            >
              {cartContent}
            </Link>
          ) : (
            <button
              type="button"
              className={cartClassName}
              aria-label={cartLabel(cartCount)}
              aria-haspopup="dialog"
              onClick={onOpenCart}
              data-cart-button=""
            >
              {cartContent}
            </button>
          )}
        </div>
        <p className="visually-hidden" role="status">
          {cartLabel(cartCount)}
        </p>
      </div>

      <div id={menuId}>
        <Drawer
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          title="Menu"
          side="leading"
          closeLabel="Close menu"
        >
          <nav aria-label="Main menu">
            <NavList items={MENU_ITEMS} variant="stacked" />
          </nav>
          <hr className={styles.divider} />
          {account.status === 'loading' ? (
            <Skeleton shape="row" />
          ) : account.status === 'signed-in' ? (
            <nav aria-label="Account menu" className={styles.menuAccount}>
              <p className={`type-caption ${styles.accountFullName}`}>Signed in as {account.fullName}</p>
              <NavList items={accountItems(account)} variant="stacked" />
              <Button variant="secondary" fullWidth onClick={onSignOut} iconStart={<Icon name="sign-out" />}>
                Sign out
              </Button>
            </nav>
          ) : (
            <ButtonLink to={signInHref} variant="secondary" fullWidth iconStart={<Icon name="user" />}>
              Sign in
            </ButtonLink>
          )}
        </Drawer>
      </div>
    </header>
  )
}
