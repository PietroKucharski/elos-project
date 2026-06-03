'use client'

// apps/web/src/components/domain/products-list-client.tsx

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
import { deactivateProduct } from '@/lib/api'
import { type ProductResponse, unitOfMeasureValues } from '@elos/shared'
import { Eye, MoreHorizontal, Pencil, PowerOff, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

type ActiveFilter = 'ACTIVE' | 'INACTIVE'

const ACTIVE_TABS: { key: ActiveFilter; label: string }[] = [
  { key: 'ACTIVE', label: 'Ativos' },
  { key: 'INACTIVE', label: 'Inativos' },
]

// Label curto da unidade para a tabela
const UNIT_LABELS: Record<string, string> = {
  UN: 'UN',
  KG: 'KG',
  G: 'G',
  L: 'L',
  ML: 'ML',
  M: 'M',
  M2: 'M²',
  M3: 'M³',
  CX: 'CX',
  PC: 'PC',
}

interface ProductsListClientProps {
  initialProducts: ProductResponse[]
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

export function ProductsListClient({ initialProducts, cnpj, canMutate }: ProductsListClientProps) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ACTIVE')
  const [unitFilter, setUnitFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<ProductResponse | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products.filter((p) => {
      if (activeFilter === 'ACTIVE' && !p.isActive) return false
      if (activeFilter === 'INACTIVE' && p.isActive) return false
      if (unitFilter && p.unit !== unitFilter) return false
      if (term) {
        const haystack = `${p.name} ${p.code ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [products, activeFilter, unitFilter, search])

  const handleDeactivate = async (product: ProductResponse) => {
    try {
      await deactivateProduct(cnpj, product.id)
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, isActive: false } : p)))
      toast.success(`${product.name} desativado.`)
    } catch (error) {
      console.error('[ProductsListClient.handleDeactivate]', error)
      toast.error('Erro ao desativar produto.')
    }
    setDeactivateTarget(null)
    router.refresh()
  }

  return (
    <>
      {/* Filtros: tabs de status + unidade + busca */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              gap: 4,
              background: 'hsl(210 40% 96.1%)',
              padding: 4,
              borderRadius: '0.5rem',
            }}
          >
            {ACTIVE_TABS.map((tab) => {
              const active = activeFilter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
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

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            style={{
              height: 38,
              padding: '0 32px 0 12px',
              fontSize: 13.5,
              borderRadius: '0.375rem',
              border: '1px solid hsl(214 32% 91%)',
              background: 'hsl(0 0% 100%)',
              color: 'hsl(222 47% 11%)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Todas as unidades</option>
            {unitOfMeasureValues.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u] ?? u}
              </option>
            ))}
          </select>
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
            placeholder="Buscar por nome ou código..."
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
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Unidade</th>
                <th style={thStyle}>Estoque mínimo</th>
                <th style={thStyle}>Fornecedores</th>
                <th style={thStyle}>Ativo</th>
                <th style={{ ...thStyle, textAlign: 'right', width: 48 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: '48px 16px',
                      color: 'hsl(215 16% 47%)',
                      fontSize: 14,
                    }}
                  >
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((product, index) => {
                const detailHref = `/${cnpj}/products/${product.id}`
                const editHref = `/${cnpj}/products/${product.id}/edit`
                const supplierCount = product.suppliers?.length

                return (
                  <tr
                    key={product.id}
                    style={{
                      borderBottom: '1px solid hsl(214 32% 91%)',
                      opacity: product.isActive ? 1 : 0.5,
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
                        {product.name}
                      </Link>
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        fontFamily: 'monospace',
                        fontSize: 12.5,
                        color: 'hsl(215 16% 47%)',
                      }}
                    >
                      {product.code ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'hsl(215 16% 47%)' }}>
                      {UNIT_LABELS[product.unit] ?? product.unit}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'hsl(215 16% 47%)' }}>
                      {product.minStock ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'hsl(215 16% 47%)' }}>
                      {supplierCount != null ? supplierCount : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {product.isActive ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 10px',
                            borderRadius: '9999px',
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'hsl(142 71% 30%)',
                            background: 'hsl(142 71% 94%)',
                          }}
                        >
                          Ativo
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 10px',
                            borderRadius: '9999px',
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'hsl(215 16% 47%)',
                            background: 'hsl(214 32% 91%)',
                          }}
                        >
                          Inativo
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={() => setMenuOpen(menuOpen === product.id ? null : product.id)}
                          aria-label={`Ações para ${product.name}`}
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

                        {menuOpen === product.id && (
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

                            {canMutate && product.isActive && (
                              <button
                                type="button"
                                style={{ ...menuItemStyle, color: 'hsl(0 72% 51%)' }}
                                onClick={() => {
                                  setMenuOpen(null)
                                  setDeactivateTarget(product)
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'hsl(0 86% 97%)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                <PowerOff size={15} strokeWidth={1.6} />
                                Desativar
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

      {/* AlertDialog de confirmação de desativação */}
      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar produto</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget?.name} deixará de aparecer no catálogo ativo. Os vínculos com
              fornecedores e o histórico são mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deactivateTarget) handleDeactivate(deactivateTarget)
              }}
              style={{ background: 'hsl(0 84% 60%)', color: 'white' }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
