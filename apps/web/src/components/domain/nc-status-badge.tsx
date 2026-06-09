import type { NonConformityStatus } from '@elos/shared'

const STATUS_CONFIG: Record<NonConformityStatus, { label: string; className: string }> = {
  OPEN: { label: 'Aberta', className: 'bg-warning/10 text-warning' },
  ANALYZING: { label: 'Em Análise', className: 'bg-info/10 text-info' },
  RESOLVED: { label: 'Resolvida', className: 'bg-success/10 text-success' },
  REJECTED: { label: 'Rejeitada', className: 'bg-destructive/10 text-destructive' },
}

const SEVERITY_CONFIG: Record<string, { label: string; className: string }> = {
  LOW: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
  MEDIUM: { label: 'Média', className: 'bg-warning/10 text-warning' },
  HIGH: { label: 'Alta', className: 'bg-destructive/10 text-destructive' },
  CRITICAL: { label: 'Crítica', className: 'bg-destructive text-destructive-foreground' },
}

export function NcStatusBadge({ status }: { status: NonConformityStatus }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}

export function NcSeverityBadge({ severity }: { severity: string }) {
  const config = SEVERITY_CONFIG[severity] ?? {
    label: severity,
    className: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
