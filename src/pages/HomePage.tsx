import { Link } from 'react-router'
import { ArchedHeroArt, HeroArt, StepDeliverArt, StepPickArt, StepWrapArt } from '@/components/illustrations/Scenes'
import { PageContainer, PageTitle } from '@/components/layout'
import { Alert, Button, ButtonLink, EmptyState, Icon, LoadingState } from '@/components/ui'
import { useAddToCart } from '@/features/cart'
import { ProductGrid, ProductGridSkeleton } from '@/features/catalog'
import { useAsyncData } from '@/hooks/useAsyncData'
import { usePageTitle } from '@/hooks/usePageTitle'
import { SHOP_CONFIG } from '@/lib/config'
import { data } from '@/lib/data'
import styles from './pages.module.css'

const HEADLINE = 'Flowers wrapped by hand, tied with twine'

const STEPS = [
  { Art: StepPickArt, title: 'Pick your stems', text: 'Choose a bouquet, a plant or a small gift from the shop.' },
  { Art: StepWrapArt, title: 'We wrap them by hand', text: 'Kraft paper, a twine bow and a card with your note.' },
  { Art: StepDeliverArt, title: 'Delivered to the door', text: 'We bring your order round on the day you choose.' },
]

export default function HomePage() {
  usePageTitle('Home')
  const featured = useAsyncData('home-featured', () =>
    data.catalog.listProducts({ categorySlug: 'bouquets', limit: 4 }),
  )
  const { addToCart, addingId } = useAddToCart()

  return (
    <PageContainer>
      <section className={styles.hero}>
        {/* Wide screens set the headline on an arch over the drawing; narrow
            screens show it as plain lines above the drawing. One h1 either way. */}
        <PageTitle className={styles.heroTitle}>
          <span className={`type-display ${styles.heroTitleText}`}>{HEADLINE}</span>
          <ArchedHeroArt headline={HEADLINE} className={styles.heroArch} />
        </PageTitle>
        <HeroArt className={styles.heroArt} />
        <p className={`type-body ${styles.heroCopy}`}>
          Kraft &amp; Petal is a small flower shop. We make hand-tied bouquets, pot up easy house plants and
          deliver them to your door.
        </p>
        <div className={styles.heroActions}>
          <ButtonLink to="/shop" iconEnd={<Icon name="arrow-right" />}>
            Browse the shop
          </ButtonLink>
          <Link to="/about" className="link-standalone">
            Read our story
          </Link>
        </div>
        <div className={`type-ui ${styles.heroFacts}`}>
          {SHOP_CONFIG.contact.hours ? <p>Open {SHOP_CONFIG.contact.hours[0]}</p> : null}
          <p>Delivered by hand on the day you choose</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="featured-title">
        <div className={styles.sectionHeader}>
          <h2 id="featured-title">Fresh this week</h2>
          <Link to="/shop?category=bouquets" className="link-standalone">
            See all bouquets
            <Icon name="arrow-right" size="sm" />
          </Link>
        </div>
        {featured.status === 'loading' ? (
          <LoadingState label="Loading this week's bouquets" onRetry={() => void featured.reload()}>
            <ProductGridSkeleton count={4} />
          </LoadingState>
        ) : featured.status === 'error' ? (
          <Alert
            variant="error"
            action={
              <Button variant="secondary" onClick={() => void featured.reload()}>
                Try again
              </Button>
            }
          >
            We couldn&apos;t load this week&apos;s bouquets. Try again.
          </Alert>
        ) : featured.data.length === 0 ? (
          <EmptyState
            heading="Fresh stems are on their way"
            message="We're restocking the buckets. Ask us what's coming in."
            headingLevel={3}
            action={
              <Link to="/contact" className="link-standalone">
                Get in touch
              </Link>
            }
          />
        ) : (
          <ProductGrid
            products={featured.data}
            variant="featured"
            onAddToCart={addToCart}
            addingId={addingId}
            headingLevel={3}
          />
        )}
      </section>

      <section className={styles.section} aria-labelledby="steps-title">
        <h2 id="steps-title">How it works</h2>
        <ol className={styles.steps}>
          {STEPS.map(({ Art, title, text }) => (
            <li key={title} className={styles.step}>
              <Art className={styles.stepArt} />
              <h3 className="type-heading-3">{title}</h3>
              <p className={`type-ui ${styles.secondary}`}>{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </PageContainer>
  )
}
