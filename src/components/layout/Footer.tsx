import { Badge } from '@/components/ui'
import { SHOP_CONFIG } from '@/lib/config'
import styles from './Footer.module.css'
import { NavList, type NavItem } from './Navigation'

const YEAR = new Date().getFullYear()

const FOOTER_ITEMS: NavItem[] = [
  { to: '/shop', label: 'Shop' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export interface FooterProps {
  /** Shows the "Sample data" badge so a demo is never mistaken for the live shop. */
  sampleData: boolean
}

/** Site footer on the deeper cream surface. The link to /contact sits here on every page. */
export function Footer({ sampleData }: FooterProps) {
  const { contact } = SHOP_CONFIG
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <nav aria-label="Footer">
          <NavList items={FOOTER_ITEMS} variant="footer" />
        </nav>
        <div className={styles.contact}>
          <p className="type-ui">{[SHOP_CONFIG.name, ...contact.addressLines].join(', ')}</p>
          <p className="type-ui">
            <a href={`mailto:${contact.email}`} className={styles.email}>
              {contact.email}
            </a>
          </p>
        </div>
        <div className={styles.meta}>
          <p className={`type-ui ${styles.secondary}`}>
            © {YEAR} {SHOP_CONFIG.name}. Wrapped by hand.
          </p>
          {sampleData ? (
            <Badge variant="attention" icon="info">
              Sample data
            </Badge>
          ) : null}
        </div>
      </div>
    </footer>
  )
}
