'use client'

// apps/web/src/components/domain/quotations-list-client.tsx

import { QuotationStatusBadge } from '@/components/domain/quotation-status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cancelQuotation } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { QuotationResponse, QuotationStatus } from '@elos/shared'
import { Ban, Eye, MoreHorizontal, Pencil, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type StatusFilter = QuotationStatus | 'ALL'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todas' },
  { key: 'DRAFT', label: 'Rascunho' },
  { key: 'OPEN', label: 'Abertas' },
  { key: 'CLOSED', label: 'Fechadas' },
  { key: 'CANCELLED', label: 'Canceladas' },
]

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const MENU_ITEM =
  'flex w-full cursor-pointer items-center gap-[9px] rounded-md px-[9px] py-2 text-left text-[13.5px] no-underline transition-colors'

interface QuotationsListClientProps {
  cnpj: string
  quotations: QuotationResponse[]
  canMutate: boolean
}

export function QuotationsListClient({ cnpj, quotations, canMutate }: QuotationsListClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<QuotationResponse | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return quotations.filter((q) => {
      if (activeTab !== 'ALL' && q.status !== activeTab) return false
      if (term && !q.title.toLowerCase().includes(term) && !q.number.toLowerCase().includes(term))
        return false
      return true
    })
  }, [quotations, activeTab, search])

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await cancelQuotation(cnpj, cancelTarget.id)
      toast.success('Cotação cancelada.')
      setCancelTarget(null)
      router.refresh()
    } catch (error) {
      console.error('[QuotationsListClient.handleCancel]', error)
      toast.error('Erro ao cancelar cotação.')
    } finally {
      setCancelling(false)
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
            placeholder="Buscar por título ou número..."
            className="h-[38px] w-full rounded-md border border-input bg-card pr-3 pl-8 text-[13.5px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/[0.13]"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-visible rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>Número</th>
                <th className={TH}>Título</th>
                <th className={TH}>Prazo</th>
                <th className={cn(TH, 'text-center')}>Itens</th>
                <th className={cn(TH, 'text-center')}>Lances</th>
                <th className={TH}>Status</th>
                <th className={cn(TH, 'w-12 text-right')} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhuma cotação encontrada.
                  </td>
                </tr>
              )}
              {filtered.map((q, index) => {
                const detailHref = `/${cnpj}/quotations/${q.id}`
                const editHref = `/${cnpj}/quotations/${q.id}/edit`
                const canCancel = canMutate && (q.status === 'DRAFT' || q.status === 'OPEN')

                return (
                  <tr
                    key={q.id}
                    className="border-b border-border last:border-0 [animation:rowIn_.3s_ease_both]"
                    style={{ animationDelay: `${Math.min(index * 0.025, 0.3)}s` }}
                  >
                    <td className="px-4 py-3 font-mono text-[12.5px] text-muted-foreground">
                      {q.number}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={detailHref}
                        className="font-semibold text-foreground no-underline"
                      >
                        {q.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(q.deadline).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-center text-foreground">{q.itemCount ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-foreground">{q.bidCount ?? '—'}</td>
                    <td className="px-4 py-3">
                      <QuotationStatusBadge status={q.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setMenuOpen(menuOpen === q.id ? null : q.id)}
                          aria-label={`Ações para ${q.title}`}
                          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <MoreHorizontal size={16} strokeWidth={1.6} />
                        </button>

                        {menuOpen === q.id && (
                          <div className="absolute top-[calc(100%+4px)] right-0 z-50 w-[200px] rounded-lg border border-border bg-card p-[5px] shadow-pop [animation:popIn_0.14s_ease]">
                            <Link
                              href={detailHref}
                              className={cn(MENU_ITEM, 'text-foreground hover:bg-muted')}
                              onClick={() => setMenuOpen(null)}
                            >
                              <Eye size={15} strokeWidth={1.6} className="text-muted-foreground" />
                              Ver detalhes
                            </Link>

                            {canMutate && q.status === 'DRAFT' && (
                              <Link
                                href={editHref}
                                className={cn(MENU_ITEM, 'text-foreground hover:bg-muted')}
                                onClick={() => setMenuOpen(null)}
                              >
                                <Pencil
                                  size={15}
                                  strokeWidth={1.6}
                                  className="text-muted-foreground"
                                />
                                Editar
                              </Link>
                            )}

                            {canCancel && (
                              <button
                                type="button"
                                className={cn(
                                  MENU_ITEM,
                                  'text-destructive hover:bg-destructive-soft',
                                )}
                                onClick={() => {
                                  setMenuOpen(null)
                                  setCancelTarget(q)
                                }}
                              >
                                <Ban size={15} strokeWidth={1.6} />
                                Cancelar
                              </button>
                            )}
                          </div>
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

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta cotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os lances associados serão marcados como
              rejeitados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelando...' : 'Cancelar Cotação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
