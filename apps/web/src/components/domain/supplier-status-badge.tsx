// apps/web/src/components/domain/supplier-status-badge.tsx

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', color: 'hsl(38 92% 50%)', bg: 'hsl(38 92% 95%)' },
  APPROVED: { label: 'Aprovado', color: 'hsl(142 71% 30%)', bg: 'hsl(142 71% 94%)' },
  REJECTED: { label: 'Reprovado', color: 'hsl(0 84% 50%)', bg: 'hsl(0 84% 95%)' },
} as const

type SupplierStatus = keyof typeof STATUS_CONFIG

interface SupplierStatusBadgeProps {
  status: SupplierStatus
}

export function SupplierStatusBadge({ status }: SupplierStatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: 12,
        fontWeight: 500,
        color: config.color,
        background: config.bg,
      }}
    >
      {config.label}
    </span>
  )
}
