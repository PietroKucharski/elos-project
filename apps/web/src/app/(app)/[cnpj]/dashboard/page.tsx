import { DashboardAreaChart } from '@/components/domain/dashboard-area-chart'
import { DashboardDeadlines } from '@/components/domain/dashboard-deadlines'
import { DashboardKpiCard } from '@/components/domain/dashboard-kpi-card'
import { DashboardRecentActivity } from '@/components/domain/dashboard-recent-activity'
import { getDashboardServer, getMyCompaniesServer } from '@/lib/api'
import { auth } from '@/lib/server-auth'
import type { Role } from '@elos/shared'
import { ClipboardCheck, CreditCard, FileText, ShoppingCart } from 'lucide-react'
import { notFound } from 'next/navigation'

const AUDIT_LOG_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN_EMPRESA']

function formatBRL(value: string): string {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { cnpj } = await params

  const [myCompanies, session, dashboard] = await Promise.all([
    getMyCompaniesServer(),
    auth.api.getSession(),
    getDashboardServer(cnpj),
  ])

  const company = myCompanies.find((c) => c.cnpj === cnpj)
  // Sem membership na empresa → 404 (o layout já guarda, mas garantimos o papel).
  if (!company) notFound()
  if (dashboard === null) notFound()

  const role = company.role
  const canViewAuditLog = AUDIT_LOG_ROLES.includes(role)
  const firstName = session?.user.name.split(' ')[0] ?? ''
  const k = dashboard.kpis

  // KPIs de destaque (derivados dos KPIs agregados que o backend já retorna).
  const openOrders = k.purchaseOrdersDraft + k.purchaseOrdersApproved + k.purchaseOrdersSent
  const closingThisWeek = dashboard.deadlines.filter(
    (d) => new Date(d.deadline).getTime() - Date.now() < 86_400_000 * 7,
  ).length

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-semibold leading-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {greeting()}
          {firstName ? `, ${firstName}` : ''} — aqui está o panorama da {company.companyName} hoje.
        </p>
      </div>

      {/* KPIs de destaque */}
      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <DashboardKpiCard
          icon={ShoppingCart}
          label="Pedidos em aberto"
          value={openOrders}
          href={`/${cnpj}/purchase-orders`}
          sub={`${k.purchaseOrdersDraft} aguardando aprovação`}
        />
        <DashboardKpiCard
          icon={FileText}
          label="Cotações ativas"
          value={k.quotationsOpen}
          href={`/${cnpj}/quotations?status=OPEN`}
          {...(closingThisWeek > 0 ? { sub: `${closingThisWeek} encerram esta semana` } : {})}
        />
        <DashboardKpiCard
          icon={ClipboardCheck}
          label="Recebimentos pendentes"
          value={k.purchaseOrdersSent}
          href={`/${cnpj}/receipts`}
          {...(k.nonConformitiesOpen > 0
            ? { sub: `${k.nonConformitiesOpen} com divergência` }
            : {})}
        />
        <DashboardKpiCard
          icon={CreditCard}
          label="Pagamentos a vencer"
          value={formatBRL(k.totalPayable)}
          href={`/${cnpj}/payments?status=PENDING`}
          {...(k.paymentsPending > 0 ? { sub: `${k.paymentsPending} pendente(s)` } : {})}
        />
      </div>

      {/* Gráfico + cotações próximas do prazo */}
      <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-card">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-[15.5px] font-semibold text-foreground">Evolução de pedidos</h2>
            <div className="inline-flex gap-0.5 rounded-md bg-muted p-[3px]">
              {['3M', '6M', '12M'].map((opt) => (
                <span
                  key={opt}
                  className={`flex h-[30px] items-center rounded-[calc(var(--radius-md)-2px)] px-3.5 text-[13px] font-medium ${
                    opt === '6M' ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground'
                  }`}
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>
          <p className="-mt-1.5 mb-2 text-[13px] text-muted-foreground">
            Pedidos de compra emitidos nos últimos 6 meses
          </p>
          <DashboardAreaChart data={dashboard.chart} />
        </div>

        <DashboardDeadlines deadlines={dashboard.deadlines} cnpj={cnpj} />
      </div>

      <DashboardRecentActivity
        activity={dashboard.recentActivity}
        cnpj={cnpj}
        canViewAuditLog={canViewAuditLog}
      />
    </div>
  )
}
