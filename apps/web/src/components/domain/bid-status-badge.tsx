// apps/web/src/components/domain/bid-status-badge.tsx

import { cn } from '@/lib/utils'
import type { BidStatus } from '@elos/shared'

const STATUS_CONFIG: Record<BidStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'text-muted-foreground bg-muted' },
  SUBMITTED: { label: 'Enviado', className: 'text-info bg-info-soft' },
  SELECTED: { label: 'Vencedor', className: 'text-success bg-success-soft' },
  REJECTED: { label: 'Rejeitado', className: 'text-destructive bg-destructive-soft' },
}

interface BidStatusBadgeProps {
  status: BidStatus
}

export function BidStatusBadge({ status }: BidStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}
