import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  Eye,
  EyeOff,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Minus,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import styles from './Icon.module.css'

/* One icon set for the whole app: Lucide, drawn in `currentColor`. */
const ICONS = {
  'arrow-right': ArrowRight,
  boxes: Boxes,
  'badge-check': BadgeCheck,
  cart: ShoppingBag,
  check: Check,
  'chevron-down': ChevronDown,
  'circle-alert': CircleAlert,
  'circle-check': CircleCheck,
  clipboard: ClipboardList,
  close: X,
  dashboard: LayoutDashboard,
  edit: Pencil,
  eye: Eye,
  'eye-off': EyeOff,
  info: Info,
  menu: Menu,
  minus: Minus,
  package: Package,
  plus: Plus,
  'sign-out': LogOut,
  store: Store,
  trash: Trash2,
  upload: Upload,
  user: User,
  warning: TriangleAlert,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export interface IconProps {
  name: IconName
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Decorative icon, hidden from assistive tech. It must sit next to a text
 * label, or inside a control that has an accessible name.
 */
export function Icon({ name, size = 'md', className }: IconProps) {
  const Glyph = ICONS[name]
  return (
    <Glyph
      className={[styles.icon, styles[size], className].filter(Boolean).join(' ')}
      aria-hidden="true"
      focusable="false"
    />
  )
}
