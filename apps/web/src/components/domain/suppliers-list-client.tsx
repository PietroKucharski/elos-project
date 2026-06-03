'use client'

// apps/web/src/components/domain/suppliers-list-client.tsx

import { ApproveSupplierDialog } from '@/components/domain/approve-supplier-dialog'
import { RejectSupplierDialog } from '@/components/domain/reject-supplier-dialog'
import { SupplierStatusBadge } from '@/components/domain/supplier-status-badge'
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

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0 16px 10px',
  fontSize: 11.5,
  fontWeight: 600,
  color: 'hsl(215 16% 47%)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid hsl(214 32% 91%)',
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  width: '100%',
  padding: '8px 9px',
  borderRadius: '0.375rem',
  border: 'none',
  background: 'transparent',
  fontSize: 13.5,
  color: 'hsl(222 47% 11%)',
  cursor: 'pointer',
  textDecoration: 'none',
}

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            gap: 4,
            background: 'hsl(210 40% 96.1%)',
            padding: 4,
            borderRadius: '0.5rem',
          }}
        >
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: active ? 'hsl(0 0% 100%)' : 'transparent',
                  color: active ? 'hsl(222 47% 11%)' : 'hsl(215 16% 47%)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 2px 0 hsl(222 47% 11% / 0.08)' : 'none',
                  transition: 'background .12s, color .12s',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div style={{ position: 'relative', minWidth: 240 }}>
          <Search
            size={15}
            strokeWidth={1.6}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'hsl(215 16% 47%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome..."
            style={{
              height: 38,
              width: '100%',
              padding: '0 12px 0 32px',
              fontSize: 13.5,
              borderRadius: '0.375rem',
              border: '1px solid hsl(214 32% 91%)',
              background: 'hsl(0 0% 100%)',
              color: 'hsl(222 47% 11%)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Tabela */}
      <div
        style={{
          background: 'hsl(0 0% 100%)',
          border: '1px solid hsl(214 32% 91%)',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px 0 hsl(222 47% 11% / 0.05)',
          overflow: 'visible',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
            <thead>
              <tr>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>CNPJ/CPF</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>E-mail</th>
                <th style={{ ...thStyle, textAlign: 'right', width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: 'center',
                      padding: '48px 16px',
                      color: 'hsl(215 16% 47%)',
                      fontSize: 14,
                    }}
                  >
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
                    style={{
                      borderBottom: '1px solid hsl(214 32% 91%)',
                      animation: `rowIn .3s ease ${Math.min(index * 0.025, 0.3)}s both`,
                    }}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <Link
                        href={detailHref}
                        style={{
                          fontWeight: 600,
                          color: 'hsl(222 47% 11%)',
                          textDecoration: 'none',
                        }}
                      >
                        {supplier.name}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'hsl(215 16% 47%)' }}>
                      {TYPE_LABELS[supplier.type] ?? supplier.type}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>
                      {supplier.cnpj ?? supplier.cpf ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <SupplierStatusBadge status={supplier.status} />
                    </td>
                    <td style={{ padding: '12px 16px', color: 'hsl(215 16% 47%)' }}>
                      {supplier.email ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={() => setMenuOpen(menuOpen === supplier.id ? null : supplier.id)}
                          aria-label={`Ações para ${supplier.name}`}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '0.375rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'hsl(215 16% 47%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background .12s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <MoreHorizontal size={16} strokeWidth={1.6} />
                        </button>

                        {menuOpen === supplier.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              right: 0,
                              zIndex: 50,
                              width: 200,
                              background: 'hsl(0 0% 100%)',
                              border: '1px solid hsl(214 32% 91%)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 16px -2px hsl(222 47% 11% / 0.12)',
                              padding: 5,
                              animation: 'popIn .14s ease',
                            }}
                          >
                            <Link
                              href={detailHref}
                              style={menuItemStyle}
                              onClick={() => setMenuOpen(null)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                            >
                              <Eye
                                size={15}
                                strokeWidth={1.6}
                                style={{ color: 'hsl(215 16% 47%)' }}
                              />
                              Ver detalhes
                            </Link>

                            {canMutate && (
                              <Link
                                href={editHref}
                                style={menuItemStyle}
                                onClick={() => setMenuOpen(null)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                <Pencil
                                  size={15}
                                  strokeWidth={1.6}
                                  style={{ color: 'hsl(215 16% 47%)' }}
                                />
                                Editar
                              </Link>
                            )}

                            {canMutate && isPending && (
                              <>
                                <button
                                  type="button"
                                  style={menuItemStyle}
                                  onClick={() => {
                                    setMenuOpen(null)
                                    setApproveTarget(supplier)
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'hsl(142 71% 96%)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
                                  }}
                                >
                                  <CheckCircle
                                    size={15}
                                    strokeWidth={1.6}
                                    style={{ color: 'hsl(142 71% 35%)' }}
                                  />
                                  Aprovar
                                </button>
                                <button
                                  type="button"
                                  style={{ ...menuItemStyle, color: 'hsl(0 72% 51%)' }}
                                  onClick={() => {
                                    setMenuOpen(null)
                                    setRejectTarget(supplier)
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'hsl(0 86% 97%)'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent'
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
