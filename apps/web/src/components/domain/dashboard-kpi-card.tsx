import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface Props {
  label: string
  value: string | number
  icon: LucideIcon
  href: string
  // Linha auxiliar curta sob o rótulo (ex.: "3 aguardando aprovação").
  sub?: string
}

// Card de KPI do dashboard — espelha o KpiCard do Claude Design: caixa de ícone
// indigo-soft no topo, número grande tabular, rótulo e subtítulo opcional. O card
// inteiro é um link para a página relevante, com elevação no hover.
export function DashboardKpiCard({ label, value, icon: Icon, href, sub }: Props) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-card p-[18px] shadow-card transition-all hover:border-border-strong hover:shadow-pop"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Icon className="h-[19px] w-[19px]" strokeWidth={1.6} />
        </div>
      </div>
      <div className="mt-4 text-[28px] font-bold leading-none tracking-[-0.02em] text-foreground tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[13px] text-muted-foreground">{label}</div>
      {sub && <div className="mt-1.5 text-xs text-subtle-foreground">{sub}</div>}
    </Link>
  )
}
