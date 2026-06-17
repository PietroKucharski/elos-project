// apps/web/src/components/domain/bid-status-badge.tsx

import { type BadgeTone, StatusBadge } from '@/components/domain/status-badge'
import type { BidStatus } from '@elos/shared'

const STATUS_CONFIG: Record<BidStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: 'Rascunho', tone: 'muted' },
  SUBMITTED: { label: 'Enviado', tone: 'info' },
  SELECTED: { label: 'Vencedor', tone: 'success' },
  REJECTED: { label: 'Rejeitado', tone: 'destructive' },
}

interface BidStatusBadgeProps {
  status: BidStatus
  size?: 'md' | 'lg'
}

export function BidStatusBadge({ status, size }: BidStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <StatusBadge tone={config.tone} size={size}>
      {config.label}
    </StatusBadge>
  )
}
