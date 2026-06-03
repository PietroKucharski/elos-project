// apps/web/src/components/domain/supplier-status-badge.tsx

import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', className: 'text-warning bg-warning-soft' },
  APPROVED: { label: 'Aprovado', className: 'text-success bg-success-soft' },
  REJECTED: { label: 'Reprovado', className: 'text-destructive bg-destructive-soft' },
} as const

type SupplierStatus = keyof typeof STATUS_CONFIG

interface SupplierStatusBadgeProps {
  status: SupplierStatus
}

export function SupplierStatusBadge({ status }: SupplierStatusBadgeProps) {
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
