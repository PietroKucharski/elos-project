'use client'

import type { InventoryResponse } from '@elos/shared'
import { AlertTriangle, Package } from 'lucide-react'
import { useState } from 'react'

interface InventoryTableProps {
  inventory: InventoryResponse[]
  showWarehouse?: boolean // esconder coluna "Armazém" quando já estamos no contexto do armazém
}

export function InventoryTable({ inventory, showWarehouse = true }: InventoryTableProps) {
  const [search, setSearch] = useState('')

  const filtered = inventory.filter(
    (item) =>
      item.productName.toLowerCase().includes(search.toLowerCase()) ||
      (item.productCode ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Buscar produto…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-64"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Package className="h-10 w-10" strokeWidth={1.5} />
          <p className="text-sm">Nenhum produto em estoque.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {showWarehouse && <th className="text-left px-4 py-3 font-medium">Armazém</th>}
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Unidade</th>
                <th className="text-right px-4 py-3 font-medium">Saldo</th>
                <th className="text-right px-4 py-3 font-medium">Mínimo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((item) => {
                const qty = Number(item.quantity)
                const minStock = item.minStock ? Number(item.minStock) : null
                const belowMin = minStock !== null && qty < minStock
                return (
                  <tr key={item.id} className="hover:bg-muted/30">
                    {showWarehouse && (
                      <td className="px-4 py-3 text-muted-foreground">{item.warehouseName}</td>
                    )}
                    <td className="px-4 py-3 font-medium">{item.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.productCode ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={belowMin ? 'text-destructive font-semibold' : ''}>
                        {qty.toFixed(3)}
                        {belowMin && (
                          <AlertTriangle className="inline h-3 w-3 ml-1" strokeWidth={2} />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {minStock !== null ? minStock.toFixed(3) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
