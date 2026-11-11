import { Link } from 'react-router'
import { Icon, Skeleton } from '@/components/ui'
import type { Category } from '@/types'
import styles from './catalog.module.css'

export interface CategoryChipsProps {
  categories: Category[]
  /** Slug of the chosen category, or null for everything. */
  selected: string | null
}

/**
 * Category filter (guidelines 4.6): links that put the choice in the URL, so
 * a filtered list can be shared and survives reload. Chips wrap onto more
 * lines and never sit in a sideways-scrolling strip.
 */
export function CategoryChips({ categories, selected }: CategoryChipsProps) {
  const chips = [
    { slug: null as string | null, name: 'Everything', to: '/shop' },
    ...categories.map((category) => ({
      slug: category.slug as string | null,
      name: category.name,
      to: `/shop?category=${encodeURIComponent(category.slug)}`,
    })),
  ]
  return (
    <nav aria-label="Categories">
      <ul className={styles.chips}>
        {chips.map((chip) => {
          const chosen = chip.slug === selected
          return (
            <li key={chip.to}>
              <Link
                to={chip.to}
                className={styles.chip}
                aria-current={chosen ? 'true' : undefined}
                // Changing the filter keeps the scroll position and the focus on the chip.
                preventScrollReset
                replace
              >
                {chosen ? <Icon name="check" size="sm" /> : null}
                {chip.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function CategoryChipsSkeleton() {
  return (
    <div className={styles.chips} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((chip) => (
        <Skeleton key={chip} shape="chip" />
      ))}
    </div>
  )
}
