import { InstallmentsPanel } from '@/components/domain/installments-panel'
import { PaymentActions } from '@/components/domain/payment-actions'
import { PaymentMethodBadge } from '@/components/domain/payment-method-badge'
import { PaymentStatusBadge } from '@/components/domain/payment-status-badge'
import { getMyCompaniesServer, getPaymentServer } from '@/lib/api'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const MUTATE_ROLES = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ANALISTA_FINANCEIRO']

function brl(value: string | number | null) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ cnpj: string; id: string }>
}) {
  const { cnpj, id } = await params

  const [myCompanies, payment] = await Promise.all([
    getMyCompaniesServer(),
    getPaymentServer(cnpj, id),
  ])

  if (!payment) notFound()

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  const canMutate = role !== null && MUTATE_ROLES.includes(role)

  return (
    <div className="max-w-[960px]">
      {/* Breadcrumb */}
      <Link
        href={`/${cnpj}/payments`}
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground no-underline transition-colors hover:text-foreground"
      >
        <ChevronLeft size={15} strokeWidth={1.8} />
        Pagamentos
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold text-foreground">
              Pagamento NF {payment.invoiceNumber}
            </h1>
            <PaymentStatusBadge status={payment.status} />
          </div>
          <p className="text-[13.5px] text-muted-foreground">
            Registrado por <strong className="text-foreground">{payment.createdByName}</strong>
            {' · '}
            <Link
              href={`/${cnpj}/invoices/${payment.invoiceId}`}
              className="text-primary no-underline hover:underline"
            >
              Ver nota fiscal
            </Link>
          </p>
        </div>
        <PaymentActions cnpj={cnpj} id={payment.id} status={payment.status} canMutate={canMutate} />
      </div>

      {/* Info grid */}
      <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            Informações
          </h2>
          <dl className="grid gap-3">
            <div className="flex items-center justify-between">
              <dt className="text-[13.5px] text-muted-foreground">Método</dt>
              <dd className="m-0">
                <PaymentMethodBadge method={payment.method} />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[13.5px] text-muted-foreground">Registrado em</dt>
              <dd className="m-0 text-[13.5px] font-medium text-foreground">
                {new Date(payment.createdAt).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[13.5px] text-muted-foreground">Concluído em</dt>
              <dd className="m-0 text-[13.5px] font-medium text-foreground">
                {payment.paidAt
                  ? new Date(payment.paidAt).toLocaleDateString('pt-BR', { dateStyle: 'medium' })
                  : '—'}
              </dd>
            </div>
            {payment.notes && (
              <div className="border-t border-border pt-3">
                <dt className="mb-1 text-[13.5px] text-muted-foreground">Notas</dt>
                <dd className="m-0 text-[13.5px] whitespace-pre-wrap text-foreground">
                  {payment.notes}
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
              <dt className="text-[13.5px] text-muted-foreground">Parcelas</dt>
              <dd className="m-0 font-mono-nums text-[13.5px] font-medium text-foreground">
                {payment.installments.length}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold text-foreground">Valor Total</span>
              <span className="font-mono-nums text-xl font-bold text-primary">
                {brl(payment.totalAmount)}
              </span>
            </div>
          </dl>
        </div>
      </div>

      {/* Parcelas */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Parcelas</h2>
        <InstallmentsPanel
          cnpj={cnpj}
          paymentId={payment.id}
          paymentStatus={payment.status}
          initialInstallments={payment.installments}
          canMutate={canMutate}
        />
      </div>
    </div>
  )
}
