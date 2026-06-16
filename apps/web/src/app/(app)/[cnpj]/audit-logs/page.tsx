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

// Converte uma data `YYYY-MM-DD` (input `date`) no instante ISO/UTC do início
// ou fim do dia no fuso local do runtime. Construir a Date pelos componentes
// (em vez de `${date}T00:00:00.000Z`) evita o deslocamento de dia que a
// interpretação fixa em UTC causaria em fusos != UTC.
function dayBoundaryIso(date: string, edge: 'start' | 'end'): string | null {
  const [y, mo, d] = date.split('-')
  const dt = new Date(Number(y), Number(mo) - 1, Number(d))
  // Entrada malformada (ex.: ?startDate=abc) produz Invalid Date — descarta o
  // filtro em vez de deixar toISOString() lançar RangeError.
  if (Number.isNaN(dt.getTime())) return null
  if (edge === 'end') dt.setHours(23, 59, 59, 999)
  return dt.toISOString()
}

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
  // inteiro no fuso local: início à meia-noite, fim ao último instante.
  const startIso = startDate ? dayBoundaryIso(startDate, 'start') : null
  const endIso = endDate ? dayBoundaryIso(endDate, 'end') : null

  const params_ = {
    page: String(page),
    limit: String(PAGE_LIMIT),
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(startIso ? { startDate: startIso } : {}),
    ...(endIso ? { endDate: endIso } : {}),
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
