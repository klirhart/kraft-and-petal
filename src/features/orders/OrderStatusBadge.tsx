import { Badge, type BadgeVariant, type IconName } from '@/components/ui'
import { formatOrderStatus } from '@/lib/formatters'
import type { OrderStatus } from '@/types'

const LOOK: Record<OrderStatus, { variant: BadgeVariant; icon?: IconName }> = {
  pending: { variant: 'attention', icon: 'info' },
  confirmed: { variant: 'neutral' },
  preparing: { variant: 'neutral' },
  out_for_delivery: { variant: 'neutral' },
  delivered: { variant: 'positive', icon: 'circle-check' },
  cancelled: { variant: 'negative', icon: 'circle-alert' },
}

/** The status in words, with colour and an icon as support only. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const look = LOOK[status]
  return (
    <Badge variant={look.variant} icon={look.icon}>
      {formatOrderStatus(status)}
    </Badge>
  )
}
