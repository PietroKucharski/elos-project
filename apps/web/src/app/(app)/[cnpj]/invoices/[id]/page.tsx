import { CreatePaymentDialog } from '@/components/domain/create-payment-dialog'
import { InvoiceActions } from '@/components/domain/invoice-actions'
import { InvoiceItemsPanel } from '@/components/domain/invoice-items-panel'
import { InvoiceStatusBadge } from '@/components/domain/invoice-status-badge'
import { PaymentStatusBadge } from '@/components/domain/payment-status-badge'
import {
  getInvoiceServer,
  getMyCompaniesServer,
  getPaymentsServer,
  getPurchaseOrderServer,
} from '@/lib/api'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const MUTATE_ROLES = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ANALISTA_FINANCEIRO']

function brl(value: string | number | null) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ cnpj: string; id: string }>
}) {
  const { cnpj, id } = await params

  const [myCompanies, invoice] = await Promise.all([
    getMyCompaniesServer(),
    getInvoiceServer(cnpj, id),
  ])

  if (!invoice) notFound()

  // Total do PO vinculado para a comparação de valores NF × PO, e pagamento
  // existente para esta NF (1:1) para a seção de pagamento.
  const [po, invoicePayments] = await Promise.all([
    getPurchaseOrderServer(cnpj, invoice.purchaseOrderId),
    getPaymentsServer(cnpj, { invoiceId: invoice.id }),
  ])
  const poTotal = po?.totalAmount ?? '0'
  const payment = invoicePayments[0] ?? null

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  const canMutate = role !== null && MUTATE_ROLES.includes(role)
  const canEdit = canMutate && invoice.status === 'PENDING'

  return (
    <div className="max-w-[960px]">
      {/* Breadcrumb */}
      <Link
        href={`/${cnpj}/invoices`}
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground no-underline transition-colors hover:text-foreground"
      >
        <ChevronLeft size={15} strokeWidth={1.8} />
        Notas Fiscais
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold text-foreground">
              NF {invoice.number}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-[13.5px] text-muted-foreground">
            Fornecedor: <strong className="text-foreground">{invoice.supplierName}</strong>
            {' · '}
            <Link
              href={`/${cnpj}/purchase-orders/${invoice.purchaseOrderId}`}
              className="text-primary no-underline hover:underline"
            >
              Pedido {invoice.purchaseOrderNumber}
            </Link>
          </p>
        </div>
        <InvoiceActions cnpj={cnpj} id={invoice.id} status={invoice.status} canMutate={canMutate} />
      </div>

      {/* Motivo de rejeição */}
      {invoice.status === 'REJECTED' && invoice.rejectionReason && (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="mb-1 text-[13px] font-semibold text-destructive">Motivo da rejeição</h2>
          <p className="text-sm whitespace-pre-wrap text-foreground">{invoice.rejectionReason}</p>
        </div>
      )}

      {/* Info grid */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            Informações
          </h2>
          <dl className="grid gap-3">
            {[
              {
                label: 'Emissão',
                value: new Date(invoice.issueDate).toLocaleDateString('pt-BR', {
                  dateStyle: 'medium',
                }),
              },
              {
                label: 'Registrada em',
                value: new Date(invoice.createdAt).toLocaleDateString('pt-BR', {
                  dateStyle: 'medium',
                }),
              },
              {
                label: 'Validada por',
                value: invoice.validatedByName ?? '—',
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-[13.5px] text-muted-foreground">{label}</dt>
                <dd className="m-0 text-[13.5px] font-medium text-foreground">{value}</dd>
              </div>
            ))}
            {invoice.fileUrl && (
              <div className="flex justify-between">
                <dt className="text-[13.5px] text-muted-foreground">Arquivo</dt>
                <dd className="m-0">
                  <a
                    href={invoice.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[13.5px] font-medium text-primary no-underline hover:underline"
                  >
                    Abrir
                    <ExternalLink size={13} strokeWidth={1.8} />
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            Financeiro
          </h2>
          <dl className="grid gap-3">
            <div className="flex justify-between">
              <dt className="text-[13.5px] text-muted-foreground">Impostos</dt>
              <dd className="m-0 font-mono-nums text-[13.5px] font-medium text-foreground">
                {invoice.taxAmount ? brl(invoice.taxAmount) : '—'}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold text-foreground">Valor Total</span>
              <span className="font-mono-nums text-xl font-bold text-primary">
                {brl(invoice.totalAmount)}
              </span>
            </div>
          </dl>
        </div>
      </div>

      {/* Pagamento */}
      <div className="mb-5">
        {payment ? (
          <Link
            href={`/${cnpj}/payments/${payment.id}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 no-underline transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                Pagamento
              </span>
              <PaymentStatusBadge status={payment.status} />
            </div>
            <span className="flex items-center gap-3 text-[13.5px]">
              <span className="font-mono-nums font-semibold text-foreground">
                {brl(payment.totalAmount)}
              </span>
              <span className="text-primary hover:underline">Ver detalhe</span>
            </span>
          </Link>
        ) : (
          invoice.status === 'VALIDATED' &&
          canMutate && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
              <div>
                <h2 className="text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                  Pagamento
                </h2>
                <p className="mt-0.5 text-[13.5px] text-muted-foreground">
                  Nenhum pagamento registrado para esta nota fiscal.
                </p>
              </div>
              <CreatePaymentDialog
                cnpj={cnpj}
                invoiceId={invoice.id}
                invoiceNumber={invoice.number}
                invoiceTotal={invoice.totalAmount}
              />
            </div>
          )
        )}
      </div>

      {/* Itens + comparação NF × PO */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Itens da Nota</h2>
        <InvoiceItemsPanel
          cnpj={cnpj}
          invoiceId={invoice.id}
          initialItems={invoice.items ?? []}
          canEdit={canEdit}
          invoiceTotal={invoice.totalAmount}
          poTotal={poTotal}
        />
      </div>
    </div>
  )
}
