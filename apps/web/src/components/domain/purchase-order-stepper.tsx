// apps/web/src/components/domain/purchase-order-stepper.tsx
// Stepper horizontal do fluxo do PO. CANCELLED e RECEIVED são terminais; o
// stepper reflete o caminho percorrido (DRAFT → APPROVED → SENT → RECEIVED).

import { cn } from '@/lib/utils'
import type { PurchaseOrderStatus } from '@elos/shared'
import { Check } from 'lucide-react'

const STEPS: { status: PurchaseOrderStatus; label: string }[] = [
  { status: 'DRAFT', label: 'Rascunho' },
  { status: 'APPROVED', label: 'Aprovado' },
  { status: 'SENT', label: 'Enviado' },
  { status: 'RECEIVED', label: 'Recebido' },
]

const STATUS_ORDER: Record<PurchaseOrderStatus, number> = {
  DRAFT: 0,
  APPROVED: 1,
  SENT: 2,
  RECEIVED: 3,
  CANCELLED: -1,
}

export function PurchaseOrderStepper({ status }: { status: PurchaseOrderStatus }) {
  const currentOrder = STATUS_ORDER[status]
  const isCancelled = status === 'CANCELLED'

  return (
    <div className="flex items-center gap-0 overflow-x-auto py-2">
      {STEPS.map((step, index) => {
        const stepOrder = STATUS_ORDER[step.status]
        const isCompleted = !isCancelled && currentOrder > stepOrder
        const isActive = !isCancelled && currentOrder === stepOrder
        const isFuture = isCancelled || currentOrder < stepOrder

        return (
          <div key={step.status} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              {/* Círculo do step */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isCompleted
                    ? 'bg-success text-white'
                    : isActive
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? <Check size={16} /> : index + 1}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-[0.7rem] whitespace-nowrap',
                  isActive
                    ? 'font-semibold text-primary'
                    : isFuture
                      ? 'text-muted-foreground'
                      : 'text-success',
                )}
              >
                {step.label}
              </span>
            </div>
            {/* Linha entre steps (alinhada ao centro dos círculos) */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'mx-1 mb-[22px] h-0.5 flex-1',
                  isCompleted ? 'bg-success' : 'bg-border',
                )}
              />
            )}
          </div>
        )
      })}
      {/* Badge sobreposto se cancelado */}
      {isCancelled && (
        <div className="ml-4 shrink-0 rounded-md bg-destructive-soft px-3 py-1 text-xs font-semibold text-destructive">
          Cancelado
        </div>
      )}
    </div>
  )
}
