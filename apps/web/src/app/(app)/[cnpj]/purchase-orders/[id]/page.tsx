// apps/web/src/app/(app)/[cnpj]/purchase-orders/[id]/page.tsx
import { NcStatusBadge } from '@/components/domain/nc-status-badge'
import { PurchaseOrderActions } from '@/components/domain/purchase-order-actions'
import { PurchaseOrderStatusBadge } from '@/components/domain/purchase-order-status-badge'
import { PurchaseOrderStepper } from '@/components/domain/purchase-order-stepper'
import { Button } from '@/components/ui/button'
import {
  getMyCompaniesServer,
  getNonConformitiesServer,
  getPurchaseOrderServer,
  getReceiptsServer,
} from '@/lib/api'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

const TH =
  'border-b border-border px-3 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

function brl(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString('pt-BR', { dateStyle: 'medium' }) : '—'
}

export default async function PurchaseOrderDetailPage({ params }: Props) {
  const { cnpj, id } = await params

  const [po, myCompanies, receipts, ncs] = await Promise.all([
    getPurchaseOrderServer(cnpj, id),
    getMyCompaniesServer(),
    getReceiptsServer(cnpj, { purchaseOrderId: id }),
    getNonConformitiesServer(cnpj, { purchaseOrderId: id }),
  ])

  if (!po) notFound()

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)
  const items = po.items ?? []

  return (
    <div className="max-w-[960px]">
      {/* Breadcrumb */}
      <Link
        href={`/${cnpj}/purchase-orders`}
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground no-underline transition-colors hover:text-foreground"
      >
        <ChevronLeft size={15} strokeWidth={1.8} />
        Pedidos de Compra
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold text-foreground">{po.number}</h1>
            <PurchaseOrderStatusBadge status={po.status} />
          </div>
          <p className="text-[13.5px] text-muted-foreground">
            Fornecedor: <strong className="text-foreground">{po.supplierName}</strong>
            {po.quotationNumber && (
              <>
                {' · '}
                <Link
                  href={`/${cnpj}/quotations/${po.quotationId}`}
                  className="text-primary no-underline hover:underline"
                >
                  Cotação {po.quotationNumber}
                </Link>
              </>
            )}
          </p>
        </div>
        <PurchaseOrderActions po={po} cnpj={cnpj} canMutate={canMutate} />
      </div>

      {/* Stepper */}
      <div className="mb-5 rounded-lg border border-border bg-card px-6 py-4">
        <PurchaseOrderStepper status={po.status} />
      </div>

      {/* Info grid */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Datas */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            Informações
          </h2>
          <dl className="grid gap-3">
            {[
              { label: 'Criado em', value: date(po.createdAt) },
              { label: 'Aprovado em', value: date(po.approvedAt) },
              { label: 'Enviado em', value: date(po.sentAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-[13.5px] text-muted-foreground">{label}</dt>
                <dd className="m-0 text-[13.5px] font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Financeiro */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            Financeiro
          </h2>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-semibold text-foreground">Total do Pedido</span>
            <span className="font-mono-nums text-xl font-bold text-primary">
              {brl(po.totalAmount)}
            </span>
          </div>
          {po.notes && (
            <div className="mt-3 rounded-md bg-muted/50 px-3 py-2.5">
              <p className="text-[12.5px] text-muted-foreground italic">{po.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          Itens do Pedido ({items.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>Produto</th>
                <th className={TH}>Código</th>
                <th className={TH}>Unidade</th>
                <th className={`${TH} text-right`}>Quantidade</th>
                <th className={`${TH} text-right`}>Preço Unit.</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={`${TH} text-right`}>Recebido</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    Nenhum item neste pedido.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2.5 font-medium text-foreground">{item.productName}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-muted-foreground">
                    {item.productCode ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{item.unit}</td>
                  <td className="px-3 py-2.5 text-right font-mono-nums text-foreground">
                    {Number(item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono-nums text-foreground">
                    {brl(item.unitPrice)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono-nums font-semibold text-foreground">
                    {brl(item.totalPrice)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono-nums text-muted-foreground">
                    {Number(item.receivedQuantity).toLocaleString('pt-BR', {
                      minimumFractionDigits: 3,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recebimentos */}
      {(po.status === 'SENT' || po.status === 'RECEIVED') && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recebimentos</h2>
            {po.status === 'SENT' && canMutate && (
              <Button asChild variant="outline">
                <Link href={`/${cnpj}/purchase-orders/${po.id}/receive`}>
                  Registrar Recebimento
                </Link>
              </Button>
            )}
          </div>
          {receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum recebimento registrado ainda.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Data</th>
                    <th className="text-left px-4 py-3 font-medium">Armazém</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {receipts.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {new Date(r.receivedAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.warehouseName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium ${
                            r.status === 'COMPLETE' ? 'text-success' : 'text-warning'
                          }`}
                        >
                          {r.status === 'COMPLETE' ? 'Completo' : 'Parcial'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/${cnpj}/receipts/${r.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Não-Conformidades */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Não-Conformidades</h2>
          {canMutate && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/${cnpj}/non-conformities/new?purchaseOrderId=${po.id}`}>Abrir NC</Link>
            </Button>
          )}
        </div>
        {ncs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma não-conformidade registrada para este pedido.
          </p>
        ) : (
          <div className="space-y-2">
            {ncs.map((nc) => (
              <div
                key={nc.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <NcStatusBadge status={nc.status} />
                  <span className="text-sm">
                    {nc.description.slice(0, 80)}
                    {nc.description.length > 80 ? '…' : ''}
                  </span>
                </div>
                <Link
                  href={`/${cnpj}/non-conformities/${nc.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
