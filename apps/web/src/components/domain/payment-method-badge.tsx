import type { PaymentMethod } from '@elos/shared'

const OUTLINE = 'border border-border bg-card text-foreground-2'
const INFO = 'bg-info/10 text-info'

const METHOD_CONFIG: Record<PaymentMethod, { label: string; className: string }> = {
  BOLETO: { label: 'Boleto', className: OUTLINE },
  PIX: { label: 'PIX', className: INFO },
  TRANSFER: { label: 'Transferência', className: OUTLINE },
  CHECK: { label: 'Cheque', className: OUTLINE },
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const config = METHOD_CONFIG[method]
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
