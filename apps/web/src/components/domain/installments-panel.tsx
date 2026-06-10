'use client'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { payInstallment } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { InstallmentResponse, PaymentStatus } from '@elos/shared'
import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'

function brl(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Pendente', className: 'bg-muted text-muted-foreground' },
  PAID: { label: 'Paga', className: 'bg-success/10 text-success' },
  OVERDUE: { label: 'Vencida', className: 'bg-destructive/10 text-destructive' },
}

interface InstallmentsPanelProps {
  cnpj: string
  paymentId: string
  paymentStatus: PaymentStatus
  initialInstallments: InstallmentResponse[]
  canMutate: boolean
}

export function InstallmentsPanel({
  cnpj,
  paymentId,
  paymentStatus,
  initialInstallments,
  canMutate,
}: InstallmentsPanelProps) {
  const router = useRouter()
  const [installments, setInstallments] = useState<InstallmentResponse[]>(initialInstallments)
  const [payId, setPayId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { paidCount, total, allPaid } = useMemo(() => {
    const paid = installments.filter((i) => i.status === 'PAID').length
    return { paidCount: paid, total: installments.length, allPaid: paid === installments.length }
  }, [installments])

  const progress = total > 0 ? Math.round((paidCount / total) * 100) : 0
  const showCompletedBanner = paymentStatus === 'PAID' || allPaid

  // Uma parcela está vencida quando o vencimento já passou e ainda está PENDING.
  function isOverdue(inst: InstallmentResponse): boolean {
    return inst.status === 'PENDING' && new Date(inst.dueDate).getTime() < Date.now()
  }

  function displayStatus(inst: InstallmentResponse): string {
    if (inst.status === 'PAID') return 'PAID'
    return isOverdue(inst) ? 'OVERDUE' : 'PENDING'
  }

  async function handlePay() {
    if (!payId) return
    setLoading(true)
    try {
      const updated = await payInstallment(cnpj, paymentId, payId, {})
      setInstallments((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      toast.success('Parcela paga.')
      router.refresh()
    } catch (error) {
      console.error('[InstallmentsPanel.handlePay]', error)
      toast.error('Erro ao pagar a parcela. Tente novamente.')
    } finally {
      setLoading(false)
      setPayId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Banner de pagamento concluído */}
      {showCompletedBanner && (
        <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
          <CheckCircle2 size={18} strokeWidth={1.8} className="shrink-0 text-success" />
          <span className="text-[13.5px] font-medium text-success">
            Pagamento concluído — todas as parcelas foram pagas.
          </span>
        </div>
      )}

      {/* Barra de progresso */}
      <div className="rounded-lg border border-border bg-card px-4 py-3.5">
        <div className="mb-2 flex items-center justify-between text-[13px]">
          <span className="font-medium text-foreground-2">Progresso</span>
          <span className="font-mono-nums text-muted-foreground">
            {paidCount} de {total} parcelas pagas
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-300',
              allPaid ? 'bg-success' : 'bg-primary',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tabela de parcelas */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>#</th>
                <th className={cn(TH, 'text-right')}>Valor</th>
                <th className={TH}>Vencimento</th>
                <th className={TH}>Status</th>
                <th className={TH}>Pagamento</th>
                {canMutate && <th className={cn(TH, 'w-24 text-right')} />}
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => {
                const status = displayStatus(inst)
                const overdue = status === 'OVERDUE'
                const badge = STATUS_LABEL[status] ?? STATUS_LABEL.PENDING
                return (
                  <tr
                    key={inst.id}
                    className={cn(
                      'border-b border-border last:border-0',
                      overdue ? 'bg-destructive/5' : 'hover:bg-muted/30',
                    )}
                  >
                    <td className="px-4 py-3 font-mono-nums font-semibold text-foreground">
                      {Number.parseInt(inst.installmentNumber, 10)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-nums text-foreground">
                      {brl(inst.amount)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3',
                        overdue ? 'font-medium text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {new Date(inst.dueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                          badge?.className,
                        )}
                      >
                        {badge?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inst.paidAt ? new Date(inst.paidAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    {canMutate && (
                      <td className="px-4 py-3 text-right">
                        {inst.status === 'PENDING' && paymentStatus === 'PENDING' && (
                          <Button size="sm" variant="outline" onClick={() => setPayId(inst.id)}>
                            Pagar
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmação de pagamento de parcela */}
      <AlertDialog open={!!payId} onOpenChange={(open) => !open && setPayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar pagamento da parcela?</AlertDialogTitle>
            <AlertDialogDescription>
              A parcela será marcada como paga com a data de hoje. Quando todas as parcelas
              estiverem pagas, o pagamento será concluído automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <Button onClick={handlePay} disabled={loading}>
              {loading ? 'Aguarde…' : 'Confirmar pagamento'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
