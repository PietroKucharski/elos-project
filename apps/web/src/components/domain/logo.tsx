import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  light?: boolean // true = versão branca para fundo escuro (painel de marca)
}

export function Logo({ size = 18, light = false }: LogoProps) {
  return (
    <div className="flex items-center gap-[9px]">
      <svg width={size + 8} height={size + 8} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        {/* Elo da esquerda */}
        <rect
          x="3.2"
          y="9.5"
          width="13"
          height="9"
          rx="4.5"
          strokeWidth="2.4"
          className={light ? 'stroke-white' : 'stroke-primary'}
        />
        {/* Elo da direita (sobreposição cria o "elo") */}
        <rect
          x="11.8"
          y="9.5"
          width="13"
          height="9"
          rx="4.5"
          strokeWidth="2.4"
          className={light ? 'stroke-white/55' : 'stroke-primary/45'}
        />
      </svg>
      <span
        className={cn('font-bold tracking-[-0.02em]', light ? 'text-white' : 'text-foreground')}
        style={{ fontSize: size }}
      >
        Elos
      </span>
    </div>
  )
}
