'use client'

import { NcSeverityBadge, NcStatusBadge } from '@/components/domain/nc-status-badge'
import type { NonConformityResponse } from '@elos/shared'
import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const TYPE_LABELS: Record<string, string> = {
  QUALITY: 'Qualidade',
  QUANTITY: 'Quantidade',
  DELIVERY: 'Entrega',
  DOCUMENTATION: 'Documentação',
  OTHER: 'Outro',
}

interface NonConformitiesListClientProps {
  cnpj: string
  nonConformities: NonConformityResponse[]
  canCreate: boolean
}

export function NonConformitiesListClient({
  cnpj,
  nonConformities,
}: NonConformitiesListClientProps) {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const filtered = nonConformities.filter((nc) => {
    const matchStatus = statusFilter === 'ALL' || nc.status === statusFilter
    const matchSearch =
      nc.description.toLowerCase().includes(search.toLowerCase()) ||
      nc.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (nc.purchaseOrderNumber ?? '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const statusOptions = ['ALL', 'OPEN', 'ANALYZING', 'RESOLVED', 'REJECTED']
  const statusLabels: Record<string, string> = {
    ALL: 'Todas',
    OPEN: 'Abertas',
    ANALYZING: 'Em Análise',
    RESOLVED: 'Resolvidas',
    REJECTED: 'Rejeitadas',
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border overflow-hidden">
          {statusOptions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted/50 text-muted-foreground'
              }`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Buscar por descrição, fornecedor ou PO…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-72"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <AlertTriangle className="h-10 w-10" strokeWidth={1.5} />
          <p className="text-sm">Nenhuma não-conformidade encontrada.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-left px-4 py-3 font-medium">Fornecedor</th>
                <th className="text-left px-4 py-3 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 font-medium">Severidade</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Aberta em</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((nc) => (
                <tr key={nc.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${cnpj}/non-conformities/${nc.id}`}
                      className="font-medium text-primary hover:underline line-clamp-2 max-w-xs"
                    >
                      {nc.description}
                    </Link>
                    {nc.purchaseOrderNumber && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        PO: {nc.purchaseOrderNumber}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{nc.supplierName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {TYPE_LABELS[nc.type] ?? nc.type}
                  </td>
                  <td className="px-4 py-3">
                    <NcSeverityBadge severity={nc.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <NcStatusBadge status={nc.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(nc.createdAt).toLocaleDateString('pt-BR')}
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
