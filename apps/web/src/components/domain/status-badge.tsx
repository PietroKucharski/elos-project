// apps/web/src/components/domain/status-badge.tsx
//
// Badge de status compartilhado — replica fielmente o componente `Badge` do
// Claude Design: pílula com ponto colorido + borda sutil + peso 600. Todos os
// badges de domínio (fornecedor, cotação, pedido, nota, pagamento, NC, lance)
// delegam para cá para garantir styling idêntico em toda a aplicação.

import { cn } from '@/lib/utils'

export type BadgeTone =
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'primary'
  | 'muted'
  | 'critical'

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'text-success bg-success-soft border-success-border',
  warning: 'text-warning bg-warning-soft border-warning-border',
  destructive: 'text-destructive bg-destructive-soft border-destructive-border',
  info: 'text-info bg-info-soft border-info-border',
  primary: 'text-primary bg-primary-soft border-primary-soft-border',
  muted: 'text-muted-foreground bg-muted border-border',
  critical: 'text-critical bg-destructive-soft border-destructive-border',
}

interface StatusBadgeProps {
  tone: BadgeTone
  children: React.ReactNode
  /** Ponto colorido à esquerda do rótulo (padrão do design). */
  dot?: boolean
  size?: 'md' | 'lg'
  className?: string
}

export function StatusBadge({
  tone,
  children,
  dot = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[5px] rounded-full border font-semibold whitespace-nowrap tracking-[0.005em]',
        size === 'lg' ? 'h-[26px] px-[11px] text-[12.5px]' : 'h-[22px] px-2 text-[11.5px]',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  )
}
