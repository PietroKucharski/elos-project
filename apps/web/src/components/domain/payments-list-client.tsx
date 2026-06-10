'use client'

import { PaymentMethodBadge } from '@/components/domain/payment-method-badge'
import { PaymentStatusBadge } from '@/components/domain/payment-status-badge'
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
import { cancelPayment } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { PaymentMethod, PaymentResponse, PaymentStatus } from '@elos/shared'
import { CreditCard, Eye, MoreVertical, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type StatusFilter = PaymentStatus | 'ALL'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'PAID', label: 'Pagos' },
  { key: 'CANCELLED', label: 'Cancelados' },
]

const METHOD_OPTIONS: { value: PaymentMethod | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos os métodos' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'PIX', label: 'PIX' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'CHECK', label: 'Cheque' },
]

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'

function brl(value: string | number | null) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  cnpj: string
  payments: PaymentResponse[]
  canMutate: boolean
}

export function PaymentsListClient({ cnpj, payments, canMutate }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL')
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return payments.filter((p) => {
      if (activeTab !== 'ALL' && p.status !== activeTab) return false
      if (methodFilter !== 'ALL' && p.method !== methodFilter) return false
      if (term && !p.invoiceNumber.toLowerCase().includes(term)) return false
      return true
    })
  }, [payments, activeTab, methodFilter, search])

  async function handleCancel() {
    if (!cancelId) return
    setLoading(true)
    try {
      await cancelPayment(cnpj, cancelId)
      toast.success('Pagamento cancelado.')
      router.refresh()
    } catch (error) {
      console.error('[PaymentsListClient.handleCancel]', error)
      toast.error('Erro ao cancelar o pagamento. Tente novamente.')
    } finally {
      setLoading(false)
      setCancelId(null)
    }
  }

  return (
    <>
      {/* Filtros: tabs de status + método + busca */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {STATUS_TABS.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'cursor-pointer rounded-md px-3.5 py-1.5 text-[13px] transition-colors',
                  active
                    ? 'bg-card font-semibold text-foreground shadow-sm'
                    : 'font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'ALL')}
            aria-label="Filtrar por método de pagamento"
            className="h-[38px] cursor-pointer rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/[0.13]"
          >
            {METHOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="relative min-w-[240px]">
            <Search
              size={15}
              strokeWidth={1.6}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número da NF..."
              className="h-[38px] w-full rounded-md border border-input bg-card pr-3 pl-8 text-[13.5px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/[0.13]"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>NF</th>
                <th className={cn(TH, 'text-right')}>Valor</th>
                <th className={TH}>Método</th>
                <th className={TH}>Status</th>
                <th className={TH}>Criação</th>
                <th className={cn(TH, 'w-12 text-right')} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    <CreditCard className="mx-auto mb-3 h-10 w-10" strokeWidth={1.5} />
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const detailHref = `/${cnpj}/payments/${p.id}`
                const showCancel = canMutate && p.status === 'PENDING'
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-[12.5px] font-semibold text-foreground">
                      <Link href={detailHref} className="no-underline hover:underline">
                        {p.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-nums text-foreground">
                      {brl(p.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <PaymentMethodBadge method={p.method} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((cur) => (cur === p.id ? null : p.id))}
                          aria-label={`Ações do pagamento da NF ${p.invoiceNumber}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === p.id}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <MoreVertical size={16} strokeWidth={1.6} />
                        </button>
                        {openMenuId === p.id && (
                          <>
                            {/* Overlay para fechar ao clicar fora */}
                            <button
                              type="button"
                              tabIndex={-1}
                              aria-hidden="true"
                              onClick={() => setOpenMenuId(null)}
                              className="fixed inset-0 z-10 cursor-default"
                            />
                            <div
                              role="menu"
                              className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-border bg-card py-1 text-left shadow-md"
                            >
                              <Link
                                href={detailHref}
                                role="menuitem"
                                onClick={() => setOpenMenuId(null)}
                                className="flex items-center gap-2 px-3 py-2 text-[13px] text-foreground no-underline transition-colors hover:bg-muted"
                              >
                                <Eye size={15} strokeWidth={1.6} />
                                Ver
                              </Link>
                              {showCancel && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    setCancelId(p.id)
                                  }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-destructive transition-colors hover:bg-destructive/10"
                                >
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog de cancelamento */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento será marcado como cancelado. Esta ação não pode ser desfeita e só é
              permitida se nenhuma parcela tiver sido paga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
            <Button onClick={handleCancel} disabled={loading} variant="destructive">
              {loading ? 'Aguarde…' : 'Cancelar pagamento'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
