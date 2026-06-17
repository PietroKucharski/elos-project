import type { DashboardActivity } from '@/lib/api'
import { ArrowRight, History } from 'lucide-react'
import Link from 'next/link'

// Paleta de cores para o avatar (mesma de user-menu / Claude Design Avatar).
const PALETTE = [
  '243 75% 59%',
  '199 89% 42%',
  '142 60% 40%',
  '262 60% 55%',
  '20 85% 52%',
  '330 65% 52%',
]

function avatarColor(name: string): string {
  return PALETTE[name.charCodeAt(0) % PALETTE.length] ?? PALETTE[0]!
}

function initials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  )
}

// Timestamp relativo PT-BR ("há 5 min", "há 2 h", "há 3 d"); acima de uma semana,
// mostra a data curta.
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return 'agora há pouco'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `há ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `há ${diffH} h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7) return `há ${diffD} d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

interface Props {
  activity: DashboardActivity[]
  cnpj: string
  // Apenas ADMIN_EMPRESA/SUPER_ADMIN têm acesso ao audit log (link "Ver tudo").
  canViewAuditLog: boolean
}

export function DashboardRecentActivity({ activity, cnpj, canViewAuditLog }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <div className="flex items-center justify-between px-5 pt-5 pb-3.5">
        <h2 className="flex items-center gap-2 text-[15.5px] font-semibold text-foreground">
          <History className="h-[17px] w-[17px] text-muted-foreground" />
          Atividade recente
        </h2>
        {canViewAuditLog && (
          <Link
            href={`/${cnpj}/audit-logs`}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Ver tudo
            <ArrowRight className="h-[15px] w-[15px]" />
          </Link>
        )}
      </div>

      {activity.length === 0 ? (
        <p className="border-t border-border px-5 py-8 text-center text-[13px] text-muted-foreground">
          Nenhuma atividade registrada ainda.
        </p>
      ) : (
        <div>
          {activity.map((item) => {
            const name = item.userName ?? 'Sistema'
            // O resumo do backend já é "{nome} {ação} {entidade}"; removemos o nome
            // do início para exibi-lo em negrito separado, como no design.
            const rest = item.summary.startsWith(`${name} `)
              ? item.summary.slice(name.length + 1)
              : item.summary
            const color = avatarColor(name)
            return (
              <div
                key={item.id}
                className="flex items-center gap-3.5 border-t border-border px-5 py-3"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold"
                  style={{
                    background: `hsl(${color} / 0.13)`,
                    color: `hsl(${color})`,
                    borderColor: `hsl(${color} / 0.2)`,
                  }}
                >
                  {initials(name)}
                </div>
                <div className="min-w-0 flex-1 text-[13.5px]">
                  <strong className="font-semibold text-foreground">{name}</strong>{' '}
                  <span className="text-muted-foreground">{rest}</span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-subtle-foreground">
                  {relativeTime(item.createdAt)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
