'use client'

import { actionLabel, entityLabel } from '@/lib/audit-log-labels'
import { Search, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const SELECT_CLASS =
  'h-[38px] cursor-pointer rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'

const INPUT_CLASS =
  'h-[38px] rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'

interface Props {
  cnpj: string
  entities: string[]
  actions: string[]
}

export function AuditLogFilters({ entities, actions }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const entity = searchParams.get('entity') ?? ''
  const action = searchParams.get('action') ?? ''
  const startDate = searchParams.get('startDate') ?? ''
  const endDate = searchParams.get('endDate') ?? ''
  const user = searchParams.get('user') ?? ''

  // Atualiza um filtro na URL e reseta a paginação para a página 1.
  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearFilters() {
    router.push(pathname)
  }

  const hasFilters = !!(entity || action || startDate || endDate || user)

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] font-medium text-muted-foreground">Entidade</span>
        <select
          value={entity}
          onChange={(e) => setParam('entity', e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Todas as entidades</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {entityLabel(e)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] font-medium text-muted-foreground">Ação</span>
        <select
          value={action}
          onChange={(e) => setParam('action', e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">Todas as ações</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] font-medium text-muted-foreground">De</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setParam('startDate', e.target.value)}
          aria-label="Data início"
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] font-medium text-muted-foreground">Até</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setParam('endDate', e.target.value)}
          aria-label="Data fim"
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11.5px] font-medium text-muted-foreground">Usuário</span>
        <div className="relative">
          <Search
            size={15}
            strokeWidth={1.6}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={user}
            onChange={(e) => setParam('user', e.target.value)}
            placeholder="Buscar por nome..."
            aria-label="Buscar por nome de usuário"
            className={`${INPUT_CLASS} min-w-[200px] pr-3 pl-8`}
          />
        </div>
      </label>

      {hasFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-[38px] cursor-pointer items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X size={15} strokeWidth={1.8} />
          Limpar filtros
        </button>
      )}
    </div>
  )
}
