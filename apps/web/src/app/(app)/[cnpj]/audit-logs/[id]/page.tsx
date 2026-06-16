import { AuditLogDiffViewer } from '@/components/domain/audit-log-diff-viewer'
import { getAuditLogServer, getMyCompaniesServer } from '@/lib/api'
import { actionLabel, changeSummary, entityLabel } from '@/lib/audit-log-labels'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const ALLOWED_ROLES = ['ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function AuditLogDetailPage({
  params,
}: {
  params: Promise<{ cnpj: string; id: string }>
}) {
  const { cnpj, id } = await params

  const myCompanies = await getMyCompaniesServer()
  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  // Guard de acesso: papéis sem permissão veem 404 (o CASL na API já garante 403).
  if (role === null || !ALLOWED_ROLES.includes(role)) notFound()

  const log = await getAuditLogServer(cnpj, id)
  if (!log) notFound()

  return (
    <div className="max-w-[960px]">
      {/* Breadcrumb */}
      <Link
        href={`/${cnpj}/audit-logs`}
        className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground no-underline transition-colors hover:text-foreground"
      >
        <ChevronLeft size={15} strokeWidth={1.8} />
        Audit Log
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {changeSummary(log.entity, log.action)}
          </h1>
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[12px] font-medium text-foreground-2">
            {actionLabel(log.action)}
          </span>
        </div>
        <p className="text-[13.5px] text-muted-foreground">
          Por <strong className="text-foreground">{log.userName ?? 'Sistema'}</strong>
          {log.userEmail ? ` (${log.userEmail})` : ''}
          {' · '}
          {new Date(log.createdAt).toLocaleString('pt-BR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      </div>

      {/* Metadados */}
      <div className="mb-6 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-[13px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          Informações
        </h2>
        <dl className="grid gap-3 md:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-[13.5px] text-muted-foreground">Entidade</dt>
            <dd className="m-0 text-[13.5px] font-medium text-foreground">
              {entityLabel(log.entity)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[13.5px] text-muted-foreground">ID da entidade</dt>
            <dd className="m-0 font-mono text-[12.5px] text-foreground break-all">
              {log.entityId}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[13.5px] text-muted-foreground">Ação</dt>
            <dd className="m-0 text-[13.5px] font-medium text-foreground">
              {actionLabel(log.action)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[13.5px] text-muted-foreground">IP de origem</dt>
            <dd className="m-0 font-mono text-[12.5px] text-foreground">{log.ipAddress ?? '—'}</dd>
          </div>
        </dl>
      </div>

      {/* Diff */}
      <h2 className="mb-3 text-lg font-semibold">Alterações</h2>
      <AuditLogDiffViewer before={log.before} after={log.after} />
    </div>
  )
}
