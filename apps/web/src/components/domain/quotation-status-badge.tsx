// apps/web/src/components/domain/quotation-status-badge.tsx

import { type BadgeTone, StatusBadge } from '@/components/domain/status-badge'
import type { QuotationStatus } from '@elos/shared'

const STATUS_CONFIG: Record<QuotationStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Rascunho', tone: 'muted' },
  OPEN: { label: 'Aberta', tone: 'success' },
  CLOSED: { label: 'Fechada', tone: 'info' },
  CANCELLED: { label: 'Cancelada', tone: 'destructive' },
}

interface QuotationStatusBadgeProps {
  status: QuotationStatus
  size?: 'md' | 'lg'
}

export function QuotationStatusBadge({ status, size }: QuotationStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <StatusBadge tone={config.tone} size={size}>
      {config.label}
    </StatusBadge>
  )
}
