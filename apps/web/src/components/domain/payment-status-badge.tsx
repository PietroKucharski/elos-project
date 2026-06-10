import type { PaymentStatus } from '@elos/shared'

const STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  PAID: { label: 'Pago', className: 'bg-success/10 text-success' },
  CANCELLED: { label: 'Cancelado', className: 'bg-destructive/10 text-destructive' },
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
