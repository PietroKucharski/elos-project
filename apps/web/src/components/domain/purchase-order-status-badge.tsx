// apps/web/src/components/domain/purchase-order-status-badge.tsx

import { cn } from '@/lib/utils'
import type { PurchaseOrderStatus } from '@elos/shared'

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'text-muted-foreground bg-muted' },
  APPROVED: { label: 'Aprovado', className: 'text-info bg-info-soft' },
  SENT: { label: 'Enviado', className: 'text-warning bg-warning-soft' },
  RECEIVED: { label: 'Recebido', className: 'text-success bg-success-soft' },
  CANCELLED: { label: 'Cancelado', className: 'text-destructive bg-destructive-soft' },
}

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}
