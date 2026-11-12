import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Alert } from './Alert'
import { Icon } from './Icon'
import styles from './Modal.module.css'

/*
 * One overlay primitive (guidelines 4.7) behind the modal, the cart drawer
 * and the mobile menu: scrim, focus trap, Escape, focus return, scroll lock.
 *
 * States: default (open), hover, focus-visible and active belong to the
 * controls inside, disabled does not apply to the dialog itself, loading
 * (`busy`: nothing closes it), error (inline alert at the top, focus moves
 * to it).
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Open overlays, newest last, so Escape closes only the top one. */
const openOverlays: symbol[] = []

type Placement = 'center' | 'trailing' | 'leading'

interface OverlayProps {
  appearance?: 'default' | 'glass'
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  /** Buttons. The main action comes first in the DOM. */
  footer?: ReactNode
  placement: Placement
  size: 'sm' | 'md'
  role: 'dialog' | 'alertdialog'
  closeLabel: string
  /** A press on the scrim closes the overlay. */
  scrimCloses: boolean
  /** Where focus goes on open. */
  initialFocus: 'close' | 'first-field' | 'marked'
  initialFocusRef?: RefObject<HTMLElement | null>
  /** An action is running: Escape, the scrim and the close button do nothing. */
  busy?: boolean
  /** A failure message, shown in an inline alert at the top of the panel. */
  error?: string | null
  /** Id of the element that describes a confirm dialog. */
  describedBy?: string
  /** Removes the body padding so a list can run edge to edge. */
  flushBody?: boolean
}

function Overlay({
  appearance = 'default',
  open,
  onClose,
  title,
  children,
  footer,
  placement,
  size,
  role,
  closeLabel,
  scrimCloses,
  initialFocus,
  initialFocusRef,
  busy = false,
  error,
  describedBy,
  flushBody = false,
}: OverlayProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const busyRef = useRef(busy)
  useEffect(() => {
    onCloseRef.current = onClose
    busyRef.current = busy
  })

  useEffect(() => {
    if (!open) return
    const token = Symbol('overlay')
    const panel = panelRef.current
    const active = document.activeElement
    /* Kept across effect re-runs, so focus still returns to the control that opened the overlay. */
    if (active instanceof HTMLElement && !panel?.contains(active)) openerRef.current = active
    openOverlays.push(token)
    document.documentElement.setAttribute('data-overlay-open', '')

    const target =
      initialFocusRef?.current ??
      (initialFocus === 'first-field'
        ? panel?.querySelector<HTMLElement>('[data-overlay-body] :is(input, select, textarea):not([disabled])')
        : initialFocus === 'marked'
          ? panel?.querySelector<HTMLElement>('[data-autofocus]')
          : null) ??
      closeRef.current
    target?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape' || openOverlays.at(-1) !== token) return
      /* A toast with focus inside handles Escape itself. */
      if (event.defaultPrevented) return
      event.preventDefault()
      if (!busyRef.current) onCloseRef.current()
    }

    /* Focus that lands outside the panel (other than on a toast) comes back. */
    function onFocusIn(event: FocusEvent) {
      if (openOverlays.at(-1) !== token) return
      const node = event.target
      if (!(node instanceof HTMLElement) || !panel) return
      if (panel.contains(node) || node.closest('[data-toast-viewport]')) return
      ;(panel.querySelector<HTMLElement>(FOCUSABLE) ?? panel).focus()
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      const index = openOverlays.indexOf(token)
      if (index >= 0) openOverlays.splice(index, 1)
      if (openOverlays.length === 0) document.documentElement.removeAttribute('data-overlay-open')
      /* Still on screen means the effect is only re-running: leave focus where it is. */
      if (panel?.isConnected) return
      const opener = openerRef.current
      openerRef.current = null
      if (opener?.isConnected) opener.focus()
    }
  }, [open, initialFocus, initialFocusRef])

  useEffect(() => {
    if (open && error) errorRef.current?.focus()
  }, [open, error])

  if (!open) return null

  function trapTab(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (item) => item.getClientRects().length > 0 || item === document.activeElement,
    )
    const first = items[0]
    const last = items.at(-1)
    if (!first || !last) {
      event.preventDefault()
      return
    }
    const active = document.activeElement
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function requestClose() {
    if (!busy) onClose()
  }

  return createPortal(
    <div className={`${styles.root} ${styles[placement]} ${appearance === 'glass' ? styles.glass : ''}`}>
      <button
        type="button"
        className={styles.scrim}
        tabIndex={-1}
        aria-hidden="true"
        onClick={scrimCloses ? requestClose : undefined}
      />
      {/* Tab is trapped here; the dialog itself is not an interactive control. */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={panelRef}
        className={`${styles.panel} ${styles[size]}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        aria-busy={busy || undefined}
        tabIndex={-1}
        onKeyDown={trapTab}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className={styles.close}
            onClick={requestClose}
            aria-disabled={busy || undefined}
          >
            <Icon name="close" />
            <span className="visually-hidden">{closeLabel}</span>
          </button>
        </div>
        {error ? (
          <Alert variant="error" ref={errorRef} focusable>
            {error}
          </Alert>
        ) : null}
        <div className={flushBody ? `${styles.body} ${styles.flushBody}` : styles.body} data-overlay-body="">
          {children}
        </div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

export interface ModalProps {
  /** Frosted cream glass for branded informational overlays. */
  appearance?: 'default' | 'glass'
  open: boolean
  onClose: () => void
  title: ReactNode
  /**
   * `confirm`: an action that cannot be undone. `alertdialog`, focus starts
   * on the least destructive button (mark it with `data-autofocus`).
   * `form`: a short form. Focus starts on the first field and a press on the
   * scrim does nothing. `info`: read-only detail, focus starts on Close.
   */
  variant?: 'confirm' | 'form' | 'info'
  children: ReactNode
  footer?: ReactNode
  busy?: boolean
  error?: string | null
  initialFocusRef?: RefObject<HTMLElement | null>
}

export function Modal({
  appearance = 'default',
  open,
  onClose,
  title,
  variant = 'info',
  children,
  footer,
  busy,
  error,
  initialFocusRef,
}: ModalProps) {
  const bodyId = useId()
  return (
    <Overlay
      appearance={appearance}
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      placement="center"
      size={variant === 'form' ? 'md' : 'sm'}
      role={variant === 'confirm' ? 'alertdialog' : 'dialog'}
      closeLabel="Close"
      scrimCloses={variant !== 'form'}
      initialFocus={variant === 'form' ? 'first-field' : variant === 'confirm' ? 'marked' : 'close'}
      initialFocusRef={initialFocusRef}
      busy={busy}
      error={error}
      describedBy={variant === 'confirm' ? bodyId : undefined}
    >
      {variant === 'confirm' ? <div id={bodyId}>{children}</div> : children}
    </Overlay>
  )
}

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** `trailing`: the cart. `leading`: the mobile menu. */
  side: 'trailing' | 'leading'
  closeLabel: string
  children: ReactNode
  footer?: ReactNode
  flushBody?: boolean
}

/** A panel that slides in from one edge, built on the same primitive as the modal. */
export function Drawer({ open, onClose, title, side, closeLabel, children, footer, flushBody }: DrawerProps) {
  return (
    <Overlay
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      placement={side}
      size="sm"
      role="dialog"
      closeLabel={closeLabel}
      scrimCloses
      initialFocus="close"
      flushBody={flushBody}
    >
      {children}
    </Overlay>
  )
}
