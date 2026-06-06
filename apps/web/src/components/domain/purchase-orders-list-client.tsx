'use client'

// apps/web/src/components/domain/purchase-orders-list-client.tsx

import { PurchaseOrderStatusBadge } from '@/components/domain/purchase-order-status-badge'
import { cn } from '@/lib/utils'
import type { PurchaseOrderResponse, PurchaseOrderStatus } from '@elos/shared'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

type StatusFilter = PurchaseOrderStatus | 'ALL'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'Todos' },
  { key: 'DRAFT', label: 'Rascunho' },
  { key: 'APPROVED', label: 'Aprovado' },
  { key: 'SENT', label: 'Enviado' },
  { key: 'RECEIVED', label: 'Recebido' },
  { key: 'CANCELLED', label: 'Cancelado' },
]

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'

interface Props {
  cnpj: string
  purchaseOrders: PurchaseOrderResponse[]
}

export function PurchaseOrdersListClient({ cnpj, purchaseOrders }: Props) {
  const [activeTab, setActiveTab] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return purchaseOrders.filter((po) => {
      if (activeTab !== 'ALL' && po.status !== activeTab) return false
      if (
        term &&
        !po.number.toLowerCase().includes(term) &&
        !po.supplierName.toLowerCase().includes(term)
      )
        return false
      return true
    })
  }, [purchaseOrders, activeTab, search])

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
            placeholder="Buscar por número ou fornecedor..."
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
                <th className={TH}>Cotação</th>
                <th className={TH}>Status</th>
                <th className={cn(TH, 'text-right')}>Total</th>
                <th className={cn(TH, 'text-center')}>Itens</th>
                <th className={cn(TH, 'w-12 text-right')} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhum pedido de compra encontrado.
                  </td>
                </tr>
              )}
              {filtered.map((po, index) => {
                const detailHref = `/${cnpj}/purchase-orders/${po.id}`
                return (
                  <tr
                    key={po.id}
                    className="border-b border-border last:border-0 [animation:rowIn_.3s_ease_both]"
                    style={{ animationDelay: `${Math.min(index * 0.025, 0.3)}s` }}
                  >
                    <td className="px-4 py-3 font-mono text-[12.5px] font-semibold text-foreground">
                      <Link href={detailHref} className="no-underline">
                        {po.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{po.supplierName}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px] text-muted-foreground">
                      {po.quotationNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <PurchaseOrderStatusBadge status={po.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono-nums text-foreground">
                      {Number(po.totalAmount).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {po.itemCount ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={detailHref}
                        className="text-[13px] font-medium text-primary no-underline hover:underline"
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
