import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from 'react'
import { Link, type LinkProps } from 'react-router'
import styles from './Button.module.css'
import { Spinner } from './Spinner'

export interface ButtonStyleProps {
  /** Primary: one per view region. Danger: only inside a confirm modal. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** `sm` applies only in the dashboard on wide screens with a fine pointer. */
  size?: 'md' | 'sm'
  fullWidth?: boolean
  /** Square button that shows only an icon. It must have an accessible name. */
  iconOnly?: boolean
}

export function buttonClassName(
  { variant = 'primary', size = 'md', fullWidth = false, iconOnly = false }: ButtonStyleProps = {},
  extra?: string,
): string {
  return [
    styles.button,
    styles[variant],
    size === 'sm' && styles.sm,
    fullWidth && styles.fullWidth,
    iconOnly && styles.iconOnly,
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  /**
   * Loading state: the button keeps its size, shows a spinner, sets
   * `aria-busy` and `aria-disabled`, stays focusable and ignores presses.
   */
  loading?: boolean
  /** Said to screen readers while loading, e.g. "Placing order". */
  loadingLabel?: string
  iconStart?: ReactNode
  iconEnd?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

/*
 * States (guidelines 4.4): default, hover, focus-visible, active, disabled,
 * loading. Error: the button returns to default and the failure shows in an
 * inline alert that the button points to with `aria-describedby`.
 * Keyboard: Enter and Space. Pointer and touch: fires on release.
 */
export function Button({
  variant,
  size,
  fullWidth,
  iconOnly,
  loading = false,
  loadingLabel = 'Working',
  iconStart,
  iconEnd,
  className,
  children,
  onClick,
  type = 'button',
  ref,
  ...rest
}: ButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading || rest['aria-disabled'] === true || rest['aria-disabled'] === 'true') {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }

  return (
    <button
      {...rest}
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, fullWidth, iconOnly }, className)}
      aria-busy={loading || undefined}
      aria-disabled={loading || rest['aria-disabled'] || undefined}
      onClick={handleClick}
    >
      <span className={styles.content}>
        {iconStart}
        {iconOnly ? children : <span className={styles.label}>{children}</span>}
        {iconEnd}
      </span>
      {loading ? (
        <span className={styles.busy}>
          <Spinner size={size === 'sm' ? 'sm' : 'md'} />
          <span className="visually-hidden">{loadingLabel}</span>
        </span>
      ) : null}
    </button>
  )
}

export interface ButtonLinkProps extends LinkProps, ButtonStyleProps {
  iconStart?: ReactNode
  iconEnd?: ReactNode
}

/** A link with a button look. Only for navigation, e.g. "Checkout" in the cart. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  iconOnly,
  iconStart,
  iconEnd,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link {...rest} className={buttonClassName({ variant, size, fullWidth, iconOnly }, className)}>
      <span className={styles.content}>
        {iconStart}
        <span className={styles.label}>{children}</span>
        {iconEnd}
      </span>
    </Link>
  )
}
