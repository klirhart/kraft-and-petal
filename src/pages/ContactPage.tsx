import { StepDeliverArt } from '@/components/illustrations/Scenes'
import { PageContainer, PageTitle } from '@/components/layout'
import { usePageTitle } from '@/hooks/usePageTitle'
import { SHOP_CONFIG } from '@/lib/config'
import styles from './pages.module.css'

export default function ContactPage() {
  usePageTitle('Contact')
  const { contact } = SHOP_CONFIG
  return (
    <PageContainer>
      <div className={styles.intro}>
        <div className={styles.introText}>
          <PageTitle className="type-display">Contact</PageTitle>
          <p className={`type-body ${styles.secondary}`}>
            Questions about an order, a wedding or a workshop? We&apos;re happy to help.
          </p>
          <StepDeliverArt className={styles.contactArt} />
        </div>
        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="contact-email">
            <h2 id="contact-email">Write to us</h2>
            <p className="type-body">
              Email <a href={`mailto:${contact.email}`} className={styles.typed}>{contact.email}</a> and we&apos;ll reply
              within one working day.
            </p>
            {contact.phone ? (
              <p className="type-body">
                Or call <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`}>{contact.phone}</a> during opening hours.
              </p>
            ) : null}
          </section>
          <section className={styles.panel} aria-labelledby="contact-visit">
            <h2 id="contact-visit">Visit the shop</h2>
            <address className={`type-body ${styles.address}`}>
              {SHOP_CONFIG.name}
              {contact.addressLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
          </section>
          {contact.hours ? (
            <section className={styles.panel} aria-labelledby="contact-hours">
              <h2 id="contact-hours">Opening hours</h2>
              <ul className={`type-body ${styles.plainList}`}>
                {contact.hours.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </PageContainer>
  )
}
