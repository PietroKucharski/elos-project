import { AuditLogFilters } from '@/components/domain/audit-log-filters'
import { AuditLogsListClient } from '@/components/domain/audit-logs-list-client'
import {
  getAuditLogActionsServer,
  getAuditLogEntitiesServer,
  getAuditLogsServer,
  getMyCompaniesServer,
} from '@/lib/api'
import { notFound } from 'next/navigation'

const ALLOWED_ROLES = ['ADMIN_EMPRESA', 'SUPER_ADMIN']
const PAGE_LIMIT = 50

export default async function AuditLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ cnpj: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { cnpj } = await params
  const sp = await searchParams

  const myCompanies = await getMyCompaniesServer()
  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  // Guard de acesso: papéis sem permissão veem 404 (o CASL na API já garante 403).
  if (role === null || !ALLOWED_ROLES.includes(role)) notFound()

  const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

  const entity = str(sp.entity)
  const action = str(sp.action)
  const startDate = str(sp.startDate)
  const endDate = str(sp.endDate)
  const user = str(sp.user) ?? ''
  const page = Math.max(1, Number(str(sp.page)) || 1)

  // O input é `date` (YYYY-MM-DD); a API espera ISO datetime. Cobrimos o dia
  // inteiro: início à meia-noite, fim ao último instante.
  const params_ = {
    page: String(page),
    limit: String(PAGE_LIMIT),
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(startDate ? { startDate: `${startDate}T00:00:00.000Z` } : {}),
    ...(endDate ? { endDate: `${endDate}T23:59:59.999Z` } : {}),
  }

  const [logs, entities, actions] = await Promise.all([
    getAuditLogsServer(cnpj, params_),
    getAuditLogEntitiesServer(cnpj),
    getAuditLogActionsServer(cnpj),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Histórico de alterações realizadas na plataforma.
        </p>
      </div>

      <AuditLogFilters cnpj={cnpj} entities={entities} actions={actions} />
      <AuditLogsListClient
        cnpj={cnpj}
        logs={logs}
        page={page}
        limit={PAGE_LIMIT}
        userFilter={user}
      />
    </div>
  )
}
