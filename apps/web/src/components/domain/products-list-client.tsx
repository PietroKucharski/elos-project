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
import { cn } from '@/lib/utils'
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

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const MENU_ITEM =
  'flex w-full cursor-pointer items-center gap-[9px] rounded-md px-[9px] py-2 text-left text-[13.5px] no-underline transition-colors'
const BADGE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'

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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
            {ACTIVE_TABS.map((tab) => {
              const active = activeFilter === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
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

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="h-[38px] cursor-pointer rounded-md border border-input bg-card pr-8 pl-3 text-[13.5px] text-foreground outline-none"
          >
            <option value="">Todas as unidades</option>
            {unitOfMeasureValues.map((u) => (
              <option key={u} value={u}>
                {UNIT_LABELS[u] ?? u}
              </option>
            ))}
          </select>
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
            placeholder="Buscar por nome ou código..."
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
                <th className={TH}>Código</th>
                <th className={TH}>Unidade</th>
                <th className={TH}>Estoque mínimo</th>
                <th className={TH}>Fornecedores</th>
                <th className={TH}>Ativo</th>
                <th className={cn(TH, 'w-12 text-right')} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
                    className={cn(
                      'border-b border-border [animation:rowIn_.3s_ease_both]',
                      !product.isActive && 'opacity-50',
                    )}
                    style={{ animationDelay: `${Math.min(index * 0.025, 0.3)}s` }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={detailHref}
                        className="font-semibold text-foreground no-underline"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-muted-foreground">
                      {product.code ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {UNIT_LABELS[product.unit] ?? product.unit}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.minStock ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {supplierCount != null ? supplierCount : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {product.isActive ? (
                        <span className={cn(BADGE, 'bg-success-soft text-success')}>Ativo</span>
                      ) : (
                        <span className={cn(BADGE, 'bg-border text-muted-foreground')}>
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setMenuOpen(menuOpen === product.id ? null : product.id)}
                          aria-label={`Ações para ${product.name}`}
                          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                        >
                          <MoreHorizontal size={16} strokeWidth={1.6} />
                        </button>

                        {menuOpen === product.id && (
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

                            {canMutate && product.isActive && (
                              <button
                                type="button"
                                className={cn(
                                  MENU_ITEM,
                                  'text-destructive hover:bg-destructive-soft',
                                )}
                                onClick={() => {
                                  setMenuOpen(null)
                                  setDeactivateTarget(product)
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
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
