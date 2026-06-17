import type { DashboardDeadline } from '@/lib/api'
import { Clock } from 'lucide-react'
import Link from 'next/link'

// Chip de contagem regressiva — vermelho quando faltam menos de 2 dias (ou já
// venceu), âmbar caso contrário. Espelha o CountdownChip do Claude Design.
function Countdown({ deadline }: { deadline: string }) {
  const diff = new Date(deadline).getTime() - Date.now()
  const urgent = diff < 86_400_000 * 2
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const label = diff <= 0 ? 'vencida' : days > 0 ? `${days}d ${hours}h` : `${hours}h`
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold tabular-nums ${
        urgent ? 'text-destructive' : 'text-warning'
      }`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  )
}

interface Props {
  deadlines: DashboardDeadline[]
  cnpj: string
}

export function DashboardDeadlines({ deadlines, cnpj }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
      <div className="px-5 pt-5 pb-2">
        <h2 className="flex items-center gap-2 text-[15.5px] font-semibold text-foreground">
          <Clock className="h-[17px] w-[17px] text-muted-foreground" />
          Cotações próximas do prazo
        </h2>
      </div>
      <div className="flex flex-col">
        {deadlines.length === 0 ? (
          <p className="border-t border-border px-5 py-6 text-center text-[13px] text-muted-foreground">
            Nenhuma cotação aberta no momento.
          </p>
        ) : (
          deadlines.map((q) => (
            <Link
              key={q.id}
              href={`/${cnpj}/quotations/${q.id}`}
              className="flex items-center justify-between gap-3 border-t border-border px-5 py-[11px] text-left transition-colors hover:bg-muted/60"
            >
              <div className="min-w-0">
                <div className="mono text-[11.5px] text-muted-foreground">{q.number}</div>
                <div className="truncate text-[13px] font-medium text-foreground">{q.title}</div>
              </div>
              <Countdown deadline={q.deadline} />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
