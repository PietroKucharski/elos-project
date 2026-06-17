'use client'

// apps/web/src/components/domain/suppliers-list-client.tsx

import { ApproveSupplierDialog } from '@/components/domain/approve-supplier-dialog'
import { RejectSupplierDialog } from '@/components/domain/reject-supplier-dialog'
import { Stars } from '@/components/domain/stars'
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge'
import { cn } from '@/lib/utils'
import type { SupplierResponse } from '@elos/shared'
import {
  Building2,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Search,
  User,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'APPROVED', label: 'Aprovados' },
  { key: 'REJECTED', label: 'Reprovados' },
]

const PAGE_SIZE = 8

// Janela de até 5 números de página centrada na página atual.
function pageWindow(current: number, totalPages: number, span = 5): number[] {
  if (totalPages <= span) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  let start = Math.max(1, current - Math.floor(span / 2))
  const end = Math.min(totalPages, start + span - 1)
  start = Math.max(1, end - span + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

const TYPE_LABELS: Record<string, string> = { PJ: 'Pessoa Jurídica', PF: 'Pessoa Física' }

interface SuppliersListClientProps {
  initialSuppliers: SupplierResponse[]
  cnpj: string
  canMutate: boolean
}

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const MENU_ITEM =
  'flex w-full cursor-pointer items-center gap-[9px] rounded-md px-[9px] py-2 text-left text-[13.5px] no-underline transition-colors'

export function SuppliersListClient({
  initialSuppliers,
  cnpj,
  canMutate,
}: SuppliersListClientProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<SupplierResponse | null>(null)
  const [rejectTarget, setRejectTarget] = useState<SupplierResponse | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return initialSuppliers.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false
      if (term && !s.name.toLowerCase().includes(term)) return false
      return true
    })
  }, [initialSuppliers, statusFilter, search])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Volta para a primeira página sempre que os filtros mudam.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on filter change
  useEffect(() => setPage(1), [statusFilter, search])

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd = Math.min(page * PAGE_SIZE, total)
  const hasFilters = statusFilter !== 'ALL' || search.trim() !== ''

  function clearFilters() {
    setStatusFilter('ALL')
    setSearch('')
  }

  return (
    <>
      {/* Tabela com barra de filtros e paginação no mesmo card */}
      <div className="overflow-visible rounded-lg border border-border bg-card shadow-card">
        {/* Barra de filtros */}
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={15}
              strokeWidth={1.6}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="h-[38px] w-full rounded-md border border-input bg-card pr-3 pl-8 text-[13.5px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/[0.13]"
            />
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filtrar por status"
              className="h-[38px] w-[150px] cursor-pointer appearance-none rounded-md border border-input bg-card pr-8 pl-3 text-[13.5px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/[0.13]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              strokeWidth={1.6}
              className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
            />
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="inline-flex h-[38px] cursor-pointer items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-50 disabled:hover:text-muted-foreground"
          >
            <RotateCcw size={14} strokeWidth={1.7} />
            Limpar filtros
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>Razão social</th>
                <th className={TH}>CNPJ/CPF</th>
                <th className={TH}>Contato</th>
                <th className={TH}>Status</th>
                <th className={TH}>Avaliação</th>
                <th className={cn(TH, 'w-12 text-right')} />
              </tr>
            </thead>
            <tbody>
              {total === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              )}
              {paged.map((supplier, index) => {
                const isPending = supplier.status === 'PENDING'
                const detailHref = `/${cnpj}/suppliers/${supplier.id}`
                const editHref = `/${cnpj}/suppliers/${supplier.id}/edit`

                return (
                  <tr
                    key={supplier.id}
                    className="border-b border-border [animation:rowIn_.3s_ease_both]"
                    style={{ animationDelay: `${Math.min(index * 0.025, 0.3)}s` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-[11px]">
                        <div className="flex size-[34px] shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          {supplier.type === 'PF' ? (
                            <User size={16} strokeWidth={1.6} />
                          ) : (
                            <Building2 size={16} strokeWidth={1.6} />
                          )}
                        </div>
                        <div>
                          <Link
                            href={detailHref}
                            className="font-semibold text-foreground no-underline"
                          >
                            {supplier.name}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {TYPE_LABELS[supplier.type] ?? supplier.type}
                            {supplier.address?.city ? ` · ${supplier.address.city}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-muted-foreground">
                      {supplier.cnpj ?? supplier.cpf ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[13px] text-foreground">{supplier.email ?? '—'}</div>
                      {supplier.phone && (
                        <div className="font-mono text-xs text-muted-foreground">
                          {supplier.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SupplierStatusBadge status={supplier.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Stars value={supplier.rating != null ? Number(supplier.rating) : null} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setMenuOpen(menuOpen === supplier.id ? null : supplier.id)}
                          aria-label={`Ações para ${supplier.name}`}
                          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <MoreHorizontal size={16} strokeWidth={1.6} />
                        </button>

                        {menuOpen === supplier.id && (
                          <div className="absolute top-[calc(100%+4px)] right-0 z-50 w-[200px] rounded-lg border border-border bg-card p-[5px] shadow-pop [animation:popIn_0.14s_ease]">
                            <Link
                              href={detailHref}
                              className={cn(MENU_ITEM, 'text-foreground hover:bg-muted')}
                              onClick={() => setMenuOpen(null)}
                            >
                              <Eye size={15} strokeWidth={1.6} className="text-muted-foreground" />
                              Ver detalhes
                            </Link>

                            {canMutate && (
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

                            {canMutate && isPending && (
                              <>
                                <button
                                  type="button"
                                  className={cn(MENU_ITEM, 'text-foreground hover:bg-success-soft')}
                                  onClick={() => {
                                    setMenuOpen(null)
                                    setApproveTarget(supplier)
                                  }}
                                >
                                  <CheckCircle
                                    size={15}
                                    strokeWidth={1.6}
                                    className="text-success"
                                  />
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  className={cn(
                                    MENU_ITEM,
                                    'text-destructive hover:bg-destructive-soft',
                                  )}
                                  onClick={() => {
                                    setMenuOpen(null)
                                    setRejectTarget(supplier)
                                  }}
                                >
                                  <XCircle size={15} strokeWidth={1.6} />
                                  Rejeitar
                                </button>
                              </>
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

        {/* Paginação */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-[13px] text-muted-foreground">
              Mostrando{' '}
              <span className="font-semibold text-foreground">
                {rangeStart}–{rangeEnd}
              </span>{' '}
              de <span className="font-semibold text-foreground">{total}</span> resultados
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <ChevronLeft size={15} strokeWidth={1.8} />
                Anterior
              </button>

              {pageWindow(page, totalPages).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-2 text-[13px] transition-colors',
                    p === page
                      ? 'border border-primary bg-primary/10 font-semibold text-primary'
                      : 'font-medium text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-border px-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Próximo
                <ChevronRight size={15} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}
      </div>

      {approveTarget && (
        <ApproveSupplierDialog
          open={!!approveTarget}
          onOpenChange={(open) => !open && setApproveTarget(null)}
          cnpj={cnpj}
          supplierId={approveTarget.id}
          supplierName={approveTarget.name}
          onApproved={() => {
            setApproveTarget(null)
            router.refresh()
          }}
        />
      )}

      {rejectTarget && (
        <RejectSupplierDialog
          open={!!rejectTarget}
          onOpenChange={(open) => !open && setRejectTarget(null)}
          cnpj={cnpj}
          supplierId={rejectTarget.id}
          supplierName={rejectTarget.name}
          onRejected={() => {
            setRejectTarget(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
