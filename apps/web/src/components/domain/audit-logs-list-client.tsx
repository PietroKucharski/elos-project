'use client'

import { actionLabel, changeSummary, entityLabel } from '@/lib/audit-log-labels'
import { cn } from '@/lib/utils'
import type { AuditLogResponse } from '@elos/shared'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'

interface Props {
  cnpj: string
  logs: AuditLogResponse[]
  page: number
  limit: number
  // Filtro por nome de usuário aplicado client-side (o backend não filtra por
  // nome — apenas por userId). Vem da URL via o componente de filtros.
  userFilter: string
}

export function AuditLogsListClient({ cnpj, logs, page, limit, userFilter }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const filtered = useMemo(() => {
    const term = userFilter.trim().toLowerCase()
    if (!term) return logs
    return logs.filter((l) => (l.userName ?? '').toLowerCase().includes(term))
  }, [logs, userFilter])

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(next))
    router.push(`${pathname}?${params.toString()}`)
  }

  // Paginação server-side: há próxima página se a API devolveu uma página cheia.
  const hasPrev = page > 1
  const hasNext = logs.length === limit

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>Data/Hora</th>
                <th className={TH}>Usuário</th>
                <th className={TH}>Entidade</th>
                <th className={TH}>Ação</th>
                <th className={TH}>Resumo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    <History className="mx-auto mb-3 h-10 w-10" strokeWidth={1.5} />
                    Nenhum registro encontrado
                  </td>
                </tr>
              )}
              {filtered.map((log) => (
                <tr
                  key={log.id}
                  className="relative cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30 focus-within:bg-muted/40"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {/* Link "esticado" cobre a linha inteira (a11y: âncora real,
                        navegável por teclado) sem aninhar <a> dentro de <tr>. */}
                    <Link
                      href={`/${cnpj}/audit-logs/${log.id}`}
                      aria-label={`Ver registro: ${changeSummary(log.entity, log.action)}`}
                      className="absolute inset-0 z-10 focus:outline-none"
                    />
                    {new Date(log.createdAt).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{log.userName ?? '—'}</div>
                    {log.userEmail && (
                      <div className="text-[12px] text-muted-foreground">{log.userEmail}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">{entityLabel(log.entity)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[12px] font-medium text-foreground-2">
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground-2">
                    {changeSummary(log.entity, log.action)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {(hasPrev || hasNext) && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">Página {page}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={() => goToPage(page - 1)}
              className={cn(
                'inline-flex h-9 items-center gap-1 rounded-md border border-input bg-card px-3 text-[13px] font-medium transition-colors',
                hasPrev
                  ? 'cursor-pointer text-foreground hover:bg-muted'
                  : 'cursor-not-allowed text-muted-foreground opacity-50',
              )}
            >
              <ChevronLeft size={15} strokeWidth={1.8} />
              Anterior
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => goToPage(page + 1)}
              className={cn(
                'inline-flex h-9 items-center gap-1 rounded-md border border-input bg-card px-3 text-[13px] font-medium transition-colors',
                hasNext
                  ? 'cursor-pointer text-foreground hover:bg-muted'
                  : 'cursor-not-allowed text-muted-foreground opacity-50',
              )}
            >
              Próxima
              <ChevronRight size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
