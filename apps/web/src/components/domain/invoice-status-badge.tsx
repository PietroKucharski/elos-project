import type { InvoiceStatus } from '@elos/shared'

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  VALIDATED: { label: 'Validada', className: 'bg-success/10 text-success' },
  REJECTED: { label: 'Rejeitada', className: 'bg-destructive/10 text-destructive' },
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
