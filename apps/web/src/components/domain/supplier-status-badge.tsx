// apps/web/src/components/domain/supplier-status-badge.tsx

import { type BadgeTone, StatusBadge } from '@/components/domain/status-badge'

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', tone: 'warning' },
  APPROVED: { label: 'Aprovado', tone: 'success' },
  REJECTED: { label: 'Reprovado', tone: 'destructive' },
} as const satisfies Record<string, { label: string; tone: BadgeTone }>

type SupplierStatus = keyof typeof STATUS_CONFIG

interface SupplierStatusBadgeProps {
  status: SupplierStatus
  size?: 'md' | 'lg'
}

export function SupplierStatusBadge({ status, size }: SupplierStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <StatusBadge tone={config.tone} size={size}>
      {config.label}
    </StatusBadge>
  )
}
