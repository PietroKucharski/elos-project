// apps/web/src/components/domain/quotation-status-badge.tsx

import { cn } from '@/lib/utils'
import type { QuotationStatus } from '@elos/shared'

const STATUS_CONFIG: Record<QuotationStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'text-muted-foreground bg-muted' },
  OPEN: { label: 'Aberta', className: 'text-success bg-success-soft' },
  CLOSED: { label: 'Fechada', className: 'text-info bg-info-soft' },
  CANCELLED: { label: 'Cancelada', className: 'text-destructive bg-destructive-soft' },
}

interface QuotationStatusBadgeProps {
  status: QuotationStatus
}

export function QuotationStatusBadge({ status }: QuotationStatusBadgeProps) {
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
