import { Link, NavLink, useLocation } from 'react-router'
import { Icon, type IconName } from '@/components/ui'
import styles from './Navigation.module.css'

export interface NavItem {
  to: string
  label: string
  icon?: IconName
  /** Matches only the exact path, e.g. "/admin" but not "/admin/orders". */
  end?: boolean
  /** A count shown after the label and read as part of the link name. */
  count?: { value: number; description: string }
  /**
   * Decides "current page" for links that differ only by their query string
   * (the shop's category links). Without it the router matches on the path.
   */
  current?: (location: { pathname: string; search: string }) => boolean
}

/** A link to the shop, filtered to one category, or to everything with `null`. */
export function shopNavItem(label: string, categorySlug: string | null): NavItem {
  return {
    to: categorySlug ? `/shop?category=${encodeURIComponent(categorySlug)}` : '/shop',
    label,
    current: ({ pathname, search }) =>
      pathname === '/shop' && new URLSearchParams(search).get('category') === categorySlug,
  }
}

export interface NavListProps {
  items: NavItem[]
  /**
   * `inline`: the header row. `stacked`: the mobile menu and the account
   * panel. `sidebar`: the admin sidebar, on kraft. `footer`: the footer row.
   */
  variant: 'inline' | 'stacked' | 'sidebar' | 'footer'
}

export function navItemClassName(variant: NavListProps['variant']): string {
  return `${styles.item} ${styles[`${variant}Item`] ?? ''}`
}

/**
 * A list of navigation links. Wrap it in a `<nav>` with its own `aria-label`.
 *
 * States (guidelines 4.7): default, hover, focus-visible, active and current
 * page (`aria-current="page"`, set by the router, shown with colour, weight
 * and a green bar). Disabled is not used: an item the user may not open is
 * left out. Loading and error belong to the account area that hosts the list.
 */
export function NavList({ items, variant }: NavListProps) {
  const location = useLocation()
  return (
    <ul className={`${styles.list} ${styles[variant]}`}>
      {items.map((item) => {
        const content = (
          <>
            {item.icon ? <Icon name={item.icon} /> : null}
            <span className={styles.label}>{item.label}</span>
            {item.count && item.count.value > 0 ? (
              <>
                <span className={styles.count} aria-hidden="true">
                  {item.count.value > 99 ? '99+' : item.count.value}
                </span>
                <span className="visually-hidden">, {item.count.description}</span>
              </>
            ) : null}
          </>
        )
        return (
          <li key={item.to}>
            {item.current ? (
              <Link
                to={item.to}
                className={navItemClassName(variant)}
                aria-current={item.current(location) ? 'page' : undefined}
              >
                {content}
              </Link>
            ) : (
              <NavLink to={item.to} end={item.end} className={navItemClassName(variant)}>
                {content}
              </NavLink>
            )}
          </li>
        )
      })}
    </ul>
  )
}
