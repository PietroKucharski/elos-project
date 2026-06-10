'use client'

import { InvoiceStatusBadge } from '@/components/domain/invoice-status-badge'
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
import { Label } from '@/components/ui/label'
import { rejectInvoice, validateInvoice } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { InvoiceResponse, InvoiceStatus } from '@elos/shared'
import { Eye, FileText, MoreVertical, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type StatusFilter = InvoiceStatus | 'ALL'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'VALIDATED', label: 'Validadas' },
  { key: 'REJECTED', label: 'Rejeitadas' },
]

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'

const MIN_REASON = 5

function brl(value: string | number | null) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  cnpj: string
  invoices: InvoiceResponse[]
  canMutate: boolean
}

export function InvoicesListClient({ cnpj, invoices, canMutate }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ type: 'validate' | 'reject'; id: string } | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return invoices.filter((inv) => {
      if (activeTab !== 'ALL' && inv.status !== activeTab) return false
      if (term && !inv.number.toLowerCase().includes(term)) return false
      return true
    })
  }, [invoices, activeTab, search])

  async function handleAction() {
    if (!dialog) return
    if (dialog.type === 'reject' && reason.trim().length < MIN_REASON) {
      toast.error(`Informe o motivo (mínimo ${MIN_REASON} caracteres).`)
      return
    }

    setLoading(true)
    try {
      if (dialog.type === 'validate') {
        await validateInvoice(cnpj, dialog.id, {})
        toast.success('Nota fiscal validada.')
      } else {
        await rejectInvoice(cnpj, dialog.id, { rejectionReason: reason.trim() })
        toast.success('Nota fiscal rejeitada.')
      }
      router.refresh()
    } catch (error) {
      console.error('[InvoicesListClient.handleAction]', error)
      toast.error('Erro ao atualizar a nota fiscal. Tente novamente.')
    } finally {
      setLoading(false)
      setDialog(null)
      setReason('')
    }
  }

  return (
    <>
      {/* Filtros: tabs de status + busca */}
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

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>Número</th>
                <th className={TH}>Fornecedor</th>
                <th className={TH}>Pedido</th>
                <th className={cn(TH, 'text-right')}>Valor</th>
                <th className={TH}>Status</th>
                <th className={TH}>Emissão</th>
                <th className={cn(TH, 'w-12 text-right')} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    <FileText className="mx-auto mb-3 h-10 w-10" strokeWidth={1.5} />
                    Nenhuma nota fiscal encontrada.
                  </td>
                </tr>
              )}
              {filtered.map((inv) => {
                const detailHref = `/${cnpj}/invoices/${inv.id}`
                const showActions = canMutate && inv.status === 'PENDING'
                return (
                  <tr
                    key={inv.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-[12.5px] font-semibold text-foreground">
                      <Link href={detailHref} className="no-underline hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{inv.supplierName}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-muted-foreground">
                      {inv.purchaseOrderNumber}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-nums text-foreground">
                      {brl(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(inv.issueDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((cur) => (cur === inv.id ? null : inv.id))}
                          aria-label={`Ações da NF ${inv.number}`}
                          aria-haspopup="menu"
                          aria-expanded={openMenuId === inv.id}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <MoreVertical size={16} strokeWidth={1.6} />
                        </button>
                        {openMenuId === inv.id && (
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
                              {showActions && (
                                <>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      setDialog({ type: 'validate', id: inv.id })
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-foreground transition-colors hover:bg-muted"
                                  >
                                    Validar
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setOpenMenuId(null)
                                      setDialog({ type: 'reject', id: inv.id })
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-destructive transition-colors hover:bg-destructive/10"
                                  >
                                    Rejeitar
                                  </button>
                                </>
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

      {/* Dialog de validação/rejeição */}
      <AlertDialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null)
            setReason('')
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog?.type === 'validate' ? 'Validar nota fiscal?' : 'Rejeitar nota fiscal'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog?.type === 'validate'
                ? 'A NF será marcada como validada e liberada para pagamento.'
                : 'Informe o motivo da rejeição da nota fiscal.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {dialog?.type === 'reject' && (
            <div className="space-y-2 my-2">
              <Label htmlFor="listRejectionReason">Motivo da rejeição *</Label>
              <textarea
                id="listRejectionReason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Mínimo ${MIN_REASON} caracteres…`}
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleAction}
              disabled={loading}
              variant={dialog?.type === 'reject' ? 'destructive' : 'default'}
            >
              {loading ? 'Aguarde…' : 'Confirmar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
