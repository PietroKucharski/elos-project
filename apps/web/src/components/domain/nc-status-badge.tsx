import { type BadgeTone, StatusBadge } from '@/components/domain/status-badge'
import type { NonConformityStatus } from '@elos/shared'

const STATUS_CONFIG: Record<NonConformityStatus, { label: string; tone: BadgeTone }> = {
  OPEN: { label: 'Aberta', tone: 'warning' },
  ANALYZING: { label: 'Em Análise', tone: 'info' },
  RESOLVED: { label: 'Resolvida', tone: 'success' },
  REJECTED: { label: 'Rejeitada', tone: 'destructive' },
}

const SEVERITY_CONFIG: Record<string, { label: string; tone: BadgeTone }> = {
  LOW: { label: 'Baixa', tone: 'muted' },
  MEDIUM: { label: 'Média', tone: 'warning' },
  HIGH: { label: 'Alta', tone: 'destructive' },
  CRITICAL: { label: 'Crítica', tone: 'critical' },
}

export function NcStatusBadge({
  status,
  size,
}: {
  status: NonConformityStatus
  size?: 'md' | 'lg'
}) {
  const config = STATUS_CONFIG[status] ?? { label: status, tone: 'muted' as const }
  return (
    <StatusBadge tone={config.tone} size={size}>
      {config.label}
    </StatusBadge>
  )
}

export function NcSeverityBadge({ severity, size }: { severity: string; size?: 'md' | 'lg' }) {
  const config = SEVERITY_CONFIG[severity] ?? { label: severity, tone: 'muted' as const }
  return (
    <StatusBadge tone={config.tone} size={size}>
      {config.label}
    </StatusBadge>
  )
}
