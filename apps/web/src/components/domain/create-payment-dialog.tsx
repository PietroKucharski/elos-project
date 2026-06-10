'use client'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createPayment } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@elos/shared'
import { CreditCard, Loader2, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const SELECT = cn(INPUT, 'cursor-pointer')
const TEXTAREA = cn(INPUT, 'h-auto resize-y py-2')

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'PIX', label: 'PIX' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'CHECK', label: 'Cheque' },
]

interface InstallmentDraft {
  amount: string
  dueDate: string // YYYY-MM-DD
}

interface CreatePaymentDialogProps {
  cnpj: string
  invoiceId: string
  invoiceNumber: string
  invoiceTotal: string // totalAmount da NF (default do valor total)
}

function brl(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Vencimento padrão da parcela à vista: hoje + 30 dias, formato YYYY-MM-DD.
function defaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function CreatePaymentDialog({
  cnpj,
  invoiceId,
  invoiceNumber,
  invoiceTotal,
}: CreatePaymentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [totalAmount, setTotalAmount] = useState(invoiceTotal)
  const [method, setMethod] = useState<PaymentMethod>('BOLETO')
  const [notes, setNotes] = useState('')
  const [installments, setInstallments] = useState<InstallmentDraft[]>([
    { amount: invoiceTotal, dueDate: defaultDueDate() },
  ])
  const [loading, setLoading] = useState(false)

  const installmentsSum = installments.reduce(
    (sum, i) => sum + (Number.parseFloat(i.amount) || 0),
    0,
  )
  const total = Number.parseFloat(totalAmount) || 0
  const sumIsValid = installmentsSum + 0.005 >= total && total > 0

  function updateInstallment(index: number, patch: Partial<InstallmentDraft>) {
    setInstallments((prev) => prev.map((inst, i) => (i === index ? { ...inst, ...patch } : inst)))
  }

  function addInstallment() {
    setInstallments((prev) => [...prev, { amount: '', dueDate: defaultDueDate() }])
  }

  function removeInstallment(index: number) {
    setInstallments((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (total <= 0) {
      toast.error('Informe um valor total válido.')
      return
    }
    if (installments.length === 0) {
      toast.error('Adicione ao menos uma parcela.')
      return
    }
    for (const inst of installments) {
      const amount = Number.parseFloat(inst.amount)
      if (Number.isNaN(amount) || amount <= 0 || !inst.dueDate) {
        toast.error('Preencha valor e vencimento de todas as parcelas.')
        return
      }
    }
    if (!sumIsValid) {
      toast.error('A soma das parcelas deve ser maior ou igual ao valor total.')
      return
    }

    setLoading(true)
    try {
      const payment = await createPayment(cnpj, {
        invoiceId,
        totalAmount: total,
        method,
        notes: notes.trim() || undefined,
        installments: installments.map((inst, i) => ({
          installmentNumber: i + 1,
          amount: Number.parseFloat(inst.amount),
          dueDate: new Date(inst.dueDate).toISOString(),
        })),
      })
      toast.success('Pagamento registrado com sucesso.')
      router.push(`/${cnpj}/payments/${payment.id}`)
      router.refresh()
    } catch (error) {
      console.error('[CreatePaymentDialog.handleSubmit]', error)
      toast.error('Erro ao registrar pagamento. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <CreditCard className="mr-2 h-4 w-4" strokeWidth={1.8} />
        Registrar Pagamento
      </Button>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar pagamento</SheetTitle>
          <SheetDescription>Pagamento da nota fiscal {invoiceNumber}.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 px-4 pb-4">
          {/* Valor total */}
          <div className={FIELD}>
            <label htmlFor="payment-total" className={LABEL}>
              Valor Total (R$) *
            </label>
            <input
              id="payment-total"
              type="number"
              min="0.01"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className={INPUT}
              placeholder="0,00"
            />
          </div>

          {/* Método */}
          <div className={FIELD}>
            <label htmlFor="payment-method" className={LABEL}>
              Método de Pagamento *
            </label>
            <select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className={SELECT}
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Parcelas */}
          <div className={FIELD}>
            <div className="flex items-center justify-between">
              <span className={LABEL}>Parcelas *</span>
              <button
                type="button"
                onClick={addInstallment}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-primary transition-colors hover:bg-primary-soft"
              >
                <Plus size={14} strokeWidth={1.8} />
                Adicionar parcela
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {installments.map((inst, index) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: parcelas são posicionais e sem id estável até a criação
                  key={index}
                  className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2 rounded-md border border-border bg-card p-2.5"
                >
                  <div className="flex h-[38px] w-7 items-center justify-center rounded-md bg-muted text-[13px] font-semibold text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`inst-amount-${index}`}
                      className="text-[11.5px] text-muted-foreground"
                    >
                      Valor
                    </label>
                    <input
                      id={`inst-amount-${index}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={inst.amount}
                      onChange={(e) => updateInstallment(index, { amount: e.target.value })}
                      className={INPUT}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={`inst-due-${index}`}
                      className="text-[11.5px] text-muted-foreground"
                    >
                      Vencimento
                    </label>
                    <input
                      id={`inst-due-${index}`}
                      type="date"
                      value={inst.dueDate}
                      onChange={(e) => updateInstallment(index, { dueDate: e.target.value })}
                      className={INPUT}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInstallment(index)}
                    disabled={installments.length === 1}
                    aria-label={`Remover parcela ${index + 1}`}
                    className="inline-flex h-[38px] w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} strokeWidth={1.6} />
                  </button>
                </div>
              ))}
            </div>

            {/* Resumo da soma */}
            <div
              className={cn(
                'flex items-center justify-between rounded-md px-3 py-2 text-[13px]',
                sumIsValid ? 'bg-muted' : 'bg-destructive/10',
              )}
            >
              <span className="text-muted-foreground">Soma das parcelas</span>
              <span
                className={cn(
                  'font-mono-nums font-semibold',
                  sumIsValid ? 'text-foreground' : 'text-destructive',
                )}
              >
                {brl(installmentsSum)}
              </span>
            </div>
            {!sumIsValid && total > 0 && (
              <span className="text-xs text-destructive">
                A soma das parcelas deve ser maior ou igual a {brl(total)}.
              </span>
            )}
          </div>

          {/* Notas */}
          <div className={FIELD}>
            <label htmlFor="payment-notes" className={LABEL}>
              Notas
            </label>
            <textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={TEXTAREA}
              placeholder="Observações sobre o pagamento (opcional)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Registrar Pagamento
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
