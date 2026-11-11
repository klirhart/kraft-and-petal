import { Link } from 'react-router'
import { HeroArt } from '@/components/illustrations/Scenes'
import { PageContainer, PageTitle } from '@/components/layout'
import { ButtonLink, Icon } from '@/components/ui'
import { usePageTitle } from '@/hooks/usePageTitle'
import styles from './pages.module.css'

export default function AboutPage() {
  usePageTitle('About')
  return (
    <PageContainer>
      <section className={styles.intro}>
        <div className={styles.introText}>
          <PageTitle className="type-display">
            About <span className="text-accent">Kraft &amp; Petal</span>
          </PageTitle>
          <p className={`type-body ${styles.secondary}`}>
            A small flower shop with brown paper, twine and time for a chat.
          </p>
          <ButtonLink to="/shop" iconEnd={<Icon name="arrow-right" />}>
            Browse the shop
          </ButtonLink>
        </div>
        <HeroArt className={styles.introArt} />
      </section>

      <div className={styles.panels}>
        <section className={styles.panel} aria-labelledby="about-story">
          <h2 id="about-story">Our story</h2>
          <p className="type-body">
            Kraft &amp; Petal started at a market stall with three buckets of flowers and a roll of brown paper.
            People liked that every bunch was tied while they waited, so we kept doing it that way when we moved
            indoors.
          </p>
          <p className="type-body">
            We still buy stems in small batches, a few times a week. That keeps them fresh, and it means the shop
            changes with the season.
          </p>
        </section>
        <section className={styles.panel} aria-labelledby="about-how">
          <h2 id="about-how">How we work</h2>
          <ul className={`type-body ${styles.bullets}`}>
            <li>Every bouquet is tied by hand on the day it leaves the shop.</li>
            <li>We wrap in kraft paper and twine. No plastic sleeves.</li>
            <li>House plants come potted, with a care card in plain words.</li>
            <li>Workshops are small, so everyone gets help at the table.</li>
          </ul>
        </section>
        <section className={`${styles.panel} ${styles.panelWide}`} aria-labelledby="about-visit">
          <h2 id="about-visit">Come and say hello</h2>
          <p className="type-body">
            You can order here and we&apos;ll deliver, or drop in and choose your stems at the counter. Opening
            hours and directions are on the <Link to="/contact">contact page</Link>.
          </p>
        </section>
      </div>
    </PageContainer>
  )
}
