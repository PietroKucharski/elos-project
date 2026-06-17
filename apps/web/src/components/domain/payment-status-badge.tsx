import { type BadgeTone, StatusBadge } from '@/components/domain/status-badge'
import type { PaymentStatus } from '@elos/shared'

const STATUS_CONFIG: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pendente', tone: 'muted' },
  PAID: { label: 'Pago', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'destructive' },
}

export function PaymentStatusBadge({
  status,
  size,
}: {
  status: PaymentStatus
  size?: 'md' | 'lg'
}) {
  const config = STATUS_CONFIG[status]
  return (
    <StatusBadge tone={config.tone} size={size}>
      {config.label}
    </StatusBadge>
  )
}
