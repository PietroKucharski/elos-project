// apps/web/src/components/domain/purchase-order-status-badge.tsx

import { type BadgeTone, StatusBadge } from '@/components/domain/status-badge'
import type { PurchaseOrderStatus } from '@elos/shared'

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Rascunho', tone: 'muted' },
  APPROVED: { label: 'Aprovado', tone: 'info' },
  SENT: { label: 'Enviado', tone: 'warning' },
  RECEIVED: { label: 'Recebido', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'destructive' },
}

export function PurchaseOrderStatusBadge({
  status,
  size,
}: {
  status: PurchaseOrderStatus
  size?: 'md' | 'lg'
}) {
  const config = STATUS_CONFIG[status]
  return (
    <StatusBadge tone={config.tone} size={size}>
      {config.label}
    </StatusBadge>
  )
}
