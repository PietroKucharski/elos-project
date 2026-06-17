import { type BadgeTone, StatusBadge } from '@/components/domain/status-badge'
import type { PaymentMethod } from '@elos/shared'

// Forma de pagamento é uma etiqueta, não um status — renderiza sem o ponto.
const METHOD_CONFIG: Record<PaymentMethod, { label: string; tone: BadgeTone }> = {
  BOLETO: { label: 'Boleto', tone: 'muted' },
  PIX: { label: 'PIX', tone: 'info' },
  TRANSFER: { label: 'Transferência', tone: 'muted' },
  CHECK: { label: 'Cheque', tone: 'muted' },
}

export function PaymentMethodBadge({
  method,
  size,
}: {
  method: PaymentMethod
  size?: 'md' | 'lg'
}) {
  const config = METHOD_CONFIG[method]
  return (
    <StatusBadge tone={config.tone} dot={false} size={size}>
      {config.label}
    </StatusBadge>
  )
}
