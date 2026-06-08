'use client'

import type { ReceiptResponse } from '@elos/shared'
import { Package } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface ReceiptsListClientProps {
  cnpj: string
  receipts: ReceiptResponse[]
}

const STATUS_LABEL: Record<string, string> = {
  PARTIAL: 'Parcial',
  COMPLETE: 'Completo',
}

export function ReceiptsListClient({ cnpj, receipts }: ReceiptsListClientProps) {
  const [search, setSearch] = useState('')

  const filtered = receipts.filter(
    (r) =>
      r.purchaseOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.warehouseName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Buscar por PO ou armazém…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-64"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Package className="h-10 w-10" strokeWidth={1.5} />
          <p className="text-sm">Nenhum recebimento encontrado.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Pedido</th>
                <th className="text-left px-4 py-3 font-medium">Armazém</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Recebido em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((receipt) => (
                <tr key={receipt.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${cnpj}/receipts/${receipt.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {receipt.purchaseOrderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{receipt.warehouseName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        receipt.status === 'COMPLETE'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {STATUS_LABEL[receipt.status] ?? receipt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(receipt.receivedAt).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
