import { NcActions } from '@/components/domain/nc-actions'
import { NcCommentsPanel } from '@/components/domain/nc-comments-panel'
import { NcSeverityBadge, NcStatusBadge } from '@/components/domain/nc-status-badge'
import { Button } from '@/components/ui/button'
import { getMyCompaniesServer, getNonConformityServer } from '@/lib/api'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const ACT_ROLES = ['ADMIN_EMPRESA', 'COMPRADOR', 'SUPER_ADMIN']

export default async function NcDetailPage({
  params,
}: {
  params: Promise<{ cnpj: string; id: string }>
}) {
  const { cnpj, id } = await params
  const [myCompanies, nc] = await Promise.all([
    getMyCompaniesServer(),
    getNonConformityServer(cnpj, id),
  ])

  if (!nc) notFound()

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  const canAct = role !== null && ACT_ROLES.includes(role)

  const comments = nc.comments ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${cnpj}/non-conformities`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Não-Conformidades
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <NcStatusBadge status={nc.status} />
            <NcSeverityBadge severity={nc.severity} />
          </div>
          <p className="text-sm text-muted-foreground">
            {nc.supplierName}
            {nc.purchaseOrderNumber ? ` · PO ${nc.purchaseOrderNumber}` : ''}
          </p>
        </div>
        <NcActions cnpj={cnpj} id={nc.id} status={nc.status} canAct={canAct} />
      </div>

      {/* Descrição */}
      <div className="mb-6 max-w-2xl">
        <h2 className="text-base font-medium mb-2">Descrição</h2>
        <p className="text-sm whitespace-pre-wrap">{nc.description}</p>
        {nc.notes && <p className="text-sm text-muted-foreground mt-2 italic">{nc.notes}</p>}
      </div>

      {/* Resolução (se finalizada) */}
      {nc.resolution && (
        <div className="mb-6 max-w-2xl p-4 rounded-lg bg-muted/50 border">
          <h2 className="text-base font-medium mb-2">
            {nc.status === 'RESOLVED' ? 'Resolução' : 'Motivo da rejeição'}
          </h2>
          <p className="text-sm whitespace-pre-wrap">{nc.resolution}</p>
          {nc.resolvedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              em {new Date(nc.resolvedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-8 max-w-lg">
        <div>
          <p className="font-medium">Aberta por</p>
          <p className="text-muted-foreground">{nc.createdByName}</p>
        </div>
        <div>
          <p className="font-medium">Aberta em</p>
          <p className="text-muted-foreground">{new Date(nc.createdAt).toLocaleString('pt-BR')}</p>
        </div>
        {nc.productName && (
          <div>
            <p className="font-medium">Produto</p>
            <p className="text-muted-foreground">{nc.productName}</p>
          </div>
        )}
        {nc.purchaseOrderId && (
          <div>
            <p className="font-medium">Pedido de Compra</p>
            <Link
              href={`/${cnpj}/purchase-orders/${nc.purchaseOrderId}`}
              className="text-primary hover:underline"
            >
              {nc.purchaseOrderNumber}
            </Link>
          </div>
        )}
      </div>

      {/* Comentários */}
      <div className="max-w-2xl border-t pt-6">
        <NcCommentsPanel cnpj={cnpj} ncId={nc.id} comments={comments} />
      </div>
    </div>
  )
}
