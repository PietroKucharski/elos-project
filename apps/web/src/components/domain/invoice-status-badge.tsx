import { type BadgeTone, StatusBadge } from '@/components/domain/status-badge'
import type { InvoiceStatus } from '@elos/shared'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Pendente', tone: 'muted' },
  VALIDATED: { label: 'Validada', tone: 'success' },
  REJECTED: { label: 'Rejeitada', tone: 'destructive' },
}

export function InvoiceStatusBadge({
  status,
  size,
}: {
  status: InvoiceStatus
  size?: 'md' | 'lg'
}) {
  const config = STATUS_CONFIG[status]
  return (
    <StatusBadge tone={config.tone} size={size}>
      {config.label}
    </StatusBadge>
  )
}
