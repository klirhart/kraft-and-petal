import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Icon, type IconName } from './Icon'
import styles from './Toast.module.css'

/*
 * Toasts (guidelines 4.9) confirm something that already happened.
 *
 * States: default, hover and focus-visible (both pause the timer), active
 * (the buttons inside), error (the error variant, which stays until
 * dismissed). Disabled and loading are not used: progress belongs in the
 * control that started the action.
 */

export type ToastVariant = 'success' | 'neutral' | 'error'

export interface ToastOptions {
  variant?: ToastVariant
  /** One action at most. A toast with an action stays until dismissed. */
  action?: { label: string; onAction: () => void }
}

export interface ToastApi {
  show: (message: string, options?: ToastOptions) => void
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => void
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => void
}

interface ToastEntry {
  id: number
  message: string
  variant: ToastVariant
  action?: ToastOptions['action']
}

const VISIBLE_LIMIT = 3
const STAY_MS = 6000

const ICONS: Record<ToastVariant, IconName> = {
  success: 'circle-check',
  neutral: 'info',
  error: 'circle-alert',
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}

function ToastItem({ toast, onDismiss }: { toast: ToastEntry; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false)
  const stays = toast.variant === 'error' || toast.action !== undefined

  useEffect(() => {
    if (stays || paused) return
    const timer = setTimeout(() => onDismiss(toast.id), STAY_MS)
    return () => clearTimeout(timer)
  }, [stays, paused, toast.id, onDismiss])

  return (
    <div
      className={`${styles.toast} ${styles[toast.variant]}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Icon name={ICONS[toast.variant]} className={styles.icon} />
      <p className={styles.message}>{toast.message}</p>
      {toast.action ? (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.action?.onAction()
            onDismiss(toast.id)
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      <button type="button" className={styles.dismiss} onClick={() => onDismiss(toast.id)}>
        <Icon name="close" size="sm" />
        <span className="visually-hidden">Dismiss</span>
      </button>
    </div>
  )
}

/**
 * Holds the toast queue and exposes `useToast`. Render `<ToastViewport />`
 * once, right after `<main>`, so its live regions exist from first render.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((message: string, options: ToastOptions = {}) => {
    const text = message.trim()
    if (!text) return
    const variant = options.variant ?? 'neutral'
    setToasts((current) => {
      // Identical messages are merged instead of stacking up.
      if (current.some((toast) => toast.message === text && toast.variant === variant)) return current
      return [...current, { id: nextId.current++, message: text, variant, action: options.action }]
    })
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show(message, { ...options, variant: 'success' }),
      error: (message, options) => show(message, { ...options, variant: 'error' }),
    }),
    [show],
  )

  return (
    <ToastContext value={api}>
      <ToastStateContext value={{ toasts, dismiss }}>{children}</ToastStateContext>
    </ToastContext>
  )
}

const ToastStateContext = createContext<{
  toasts: ToastEntry[]
  dismiss: (id: number) => void
} | null>(null)

/** The toast region: two live-region lists, polite and assertive. */
export function ToastViewport() {
  const state = useContext(ToastStateContext)
  if (!state) throw new Error('<ToastViewport> must be used inside <ToastProvider>')
  const { toasts, dismiss } = state
  // At most three show at once. The rest wait their turn.
  const visible = toasts.slice(0, VISIBLE_LIMIT)
  const polite = visible.filter((toast) => toast.variant !== 'error')
  const assertive = visible.filter((toast) => toast.variant === 'error')

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape') return
    const newest = visible.at(-1)
    if (!newest) return
    // Stops an open overlay from also closing on this key press.
    event.preventDefault()
    event.stopPropagation()
    dismiss(newest.id)
  }

  return (
    // Escape dismisses the newest toast while focus is inside the region.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div className={styles.viewport} data-toast-viewport="" onKeyDown={onKeyDown}>
      <div className={styles.list} role="status">
        {polite.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
      <div className={styles.list} role="alert">
        {assertive.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </div>
  )
}
