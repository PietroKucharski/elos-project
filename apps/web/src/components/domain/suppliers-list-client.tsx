'use client'

// apps/web/src/components/domain/suppliers-list-client.tsx

import { ApproveSupplierDialog } from '@/components/domain/approve-supplier-dialog'
import { RejectSupplierDialog } from '@/components/domain/reject-supplier-dialog'
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge'
import { cn } from '@/lib/utils'
import type { SupplierResponse } from '@elos/shared'
import { CheckCircle, Eye, MoreHorizontal, Pencil, Search, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'APPROVED', label: 'Aprovados' },
  { key: 'REJECTED', label: 'Reprovados' },
]

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

  return (
    <>
      {/* Filtros: tabs de status + busca */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
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
            placeholder="Buscar por nome..."
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
                <th className={TH}>Nome</th>
                <th className={TH}>Tipo</th>
                <th className={TH}>CNPJ/CPF</th>
                <th className={TH}>Status</th>
                <th className={TH}>E-mail</th>
                <th className={cn(TH, 'w-12 text-right')} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((supplier, index) => {
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
                      <Link
                        href={detailHref}
                        className="font-semibold text-foreground no-underline"
                      >
                        {supplier.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TYPE_LABELS[supplier.type] ?? supplier.type}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px]">
                      {supplier.cnpj ?? supplier.cpf ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <SupplierStatusBadge status={supplier.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{supplier.email ?? '—'}</td>
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
