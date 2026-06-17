// apps/web/src/components/domain/stars.tsx
//
// Avaliação por estrelas — replica o componente `Stars` do Claude Design:
// 5 estrelas (preenchidas em âmbar até o valor arredondado) + valor numérico
// monoespaçado com uma casa decimal.

import { Star } from 'lucide-react'

interface StarsProps {
  /** Valor de 0 a 5. `null`/`undefined` mostra um traço. */
  value: number | null | undefined
  size?: number
}

export function Stars({ value, size = 14 }: StarsProps) {
  if (value == null) {
    return <span className="text-[12.5px] text-subtle-foreground">—</span>
  }
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex gap-px">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            strokeWidth={1.2}
            className={i <= rounded ? 'text-[hsl(38_92%_50%)]' : 'text-border-strong'}
            fill={i <= rounded ? 'hsl(38 92% 50%)' : 'transparent'}
          />
        ))}
      </span>
      <span className="font-mono text-[12.5px] font-semibold">{value.toFixed(1)}</span>
    </span>
  )
}
