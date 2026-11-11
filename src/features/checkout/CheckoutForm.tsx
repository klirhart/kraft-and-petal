import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Button, ErrorSummary, Input, RadioGroup, Textarea } from '@/components/ui'
import { useForm } from '@/hooks/useForm'
import { LIMITS, SHOP_CONFIG } from '@/lib/config'
import { formatDate, formatPrice } from '@/lib/formatters'
import { newUuid } from '@/lib/ids'
import {
  earliestDeliveryDate,
  formatDeliveryAddress,
  latestDeliveryDate,
  validateDelivery,
  type DeliveryValues,
} from '@/lib/validators'
import type { Order } from '@/types'
import styles from './checkout.module.css'
import { getPaymentProvider } from './payment'
import { checkout, type CheckoutResult } from './placeOrder'
import { clearSavedDelivery, readSavedDelivery, saveDelivery } from '@/lib/savedDelivery'

export interface CheckoutFormProps {
  /** What is being bought. Only ids and quantities are sent: the backend prices them. */
  items: { product_id: string; quantity: number }[]
  totalCents: number
  /** The order review (items, total), shown above the "Place order" button. */
  review: React.ReactNode
  /** Why the order cannot be placed right now (e.g. a sold-out line), if anything. */
  blockedReason: string | null
  onPlaced: (order: Order) => void
}

type Failure = Extract<CheckoutResult, { status: 'failed' }>

/**
 * Delivery details, order review and payment on one screen (WCAG 3.3.4).
 * The submit button stays enabled; a failed submit shows an error summary
 * and keeps every value. A second press while pending is ignored, and the
 * request carries a one-time key so a repeat cannot create a second order.
 */
export function CheckoutForm({ items, totalCents, review, blockedReason, onPlaced }: CheckoutFormProps) {
  const provider = getPaymentProvider()
  const form = useForm<DeliveryValues>(readSavedDelivery(), validateDelivery)
  const [testOutcome, setTestOutcome] = useState(provider.testOutcomes?.[0]?.value ?? 'paid')
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [summaryShown, setSummaryShown] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const failureRef = useRef<HTMLDivElement>(null)
  const requestId = useRef<string>(newUuid())
  const earliest = earliestDeliveryDate()

  useEffect(() => saveDelivery(form.values), [form.values])

  // Once the summary shows, it follows the fields as they are fixed.
  const visibleSummary = summaryShown ? form.errorList : []

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    const invalid = form.validateAll()
    setSummaryShown(invalid.length > 0)
    if (invalid.length > 0) {
      setFailure(null)
      requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }
    if (blockedReason) {
      setFailure({ status: 'failed', kind: 'stock', message: blockedReason })
      requestAnimationFrame(() => failureRef.current?.focus())
      return
    }
    setPending(true)
    setFailure(null)
    const result = await checkout({
      items,
      delivery_date: form.values.deliveryDate,
      delivery_address: formatDeliveryAddress(form.values),
      note: form.values.note.trim() || null,
      expectedTotalCents: totalCents,
      requestId: requestId.current,
      testOutcome: provider.isSimulated ? testOutcome : undefined,
    })
    if (result.status === 'placed') {
      clearSavedDelivery()
      onPlaced(result.order)
      return
    }
    // A failed attempt changed nothing, so the next try gets a fresh key.
    requestId.current = newUuid()
    setFailure(result)
    setPending(false)
    requestAnimationFrame(() => failureRef.current?.focus())
  }

  return (
    <form className={styles.form} onSubmit={(event) => void onSubmit(event)} noValidate aria-busy={pending || undefined}>
      <ErrorSummary errors={visibleSummary} ref={summaryRef} />
      {failure ? (
        <Alert variant="error" ref={failureRef} focusable id="checkout-error">
          {failure.message}{' '}
          {failure.kind === 'stock' ? <Link to="/cart">Review your cart</Link> : null}
          {failure.kind === 'session' ? <Link to="/login?next=/checkout">Sign in again</Link> : null}
        </Alert>
      ) : null}

      <fieldset className={styles.group}>
        <legend className={`type-heading-3 ${styles.legend}`}>Delivery details</legend>
        <Input
          {...form.field('recipient')}
          label="Name of the person receiving the order"
          autoComplete="name"
          maxLength={LIMITS.fullName}
        />
        <Input
          {...form.field('phone')}
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="We only call if the driver can't find the address."
        />
        <Input {...form.field('street')} label="Street address" autoComplete="street-address" maxLength={200} />
        <Input {...form.field('city')} label="Town or city" autoComplete="address-level2" maxLength={80} />
        <Input
          {...form.field('postalCode')}
          label="Postal code"
          autoComplete="postal-code"
          autoCapitalize="characters"
          width="short"
          maxLength={11}
        />
        <Input
          {...form.field('deliveryDate')}
          label="Delivery date"
          type="date"
          min={earliest}
          max={latestDeliveryDate()}
          hint={`We deliver from ${formatDate(earliest)}.`}
        />
        <Textarea
          {...form.field('note')}
          label="Note for the florist"
          optional
          rows={3}
          maxLength={LIMITS.orderNote}
          hint="A message for the card, or where to leave the order."
        />
      </fieldset>

      <section className={styles.group} aria-labelledby="checkout-review-title">
        <h2 id="checkout-review-title" className="type-heading-3">
          Your order
        </h2>
        {review}
      </section>

      <section className={styles.group} aria-labelledby="checkout-payment-title">
        <h2 id="checkout-payment-title" className="type-heading-3">
          Payment
        </h2>
        {provider.isSimulated ? (
          <>
            <Alert variant="warning" live={false} title="Payment is simulated">
              {SHOP_CONFIG.name} isn&apos;t taking real payments yet. No card is needed and no money moves.
            </Alert>
            {provider.testOutcomes ? (
              <RadioGroup
                legend="What should the simulated payment do?"
                name="test-outcome"
                value={testOutcome}
                options={provider.testOutcomes}
                onChange={setTestOutcome}
                disabled={pending}
              />
            ) : null}
          </>
        ) : null}
      </section>

      <div className={styles.submit}>
        <Button
          type="submit"
          loading={pending}
          loadingLabel="Placing order"
          aria-describedby={failure ? 'checkout-error' : undefined}
        >
          Place order, {formatPrice(totalCents)}
        </Button>
        <Link to="/cart" className="link-standalone">
          Change your cart
        </Link>
      </div>
    </form>
  )
}
