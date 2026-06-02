interface LogoProps {
  size?: number
  light?: boolean // true = versão branca para fundo escuro (painel de marca)
}

export function Logo({ size = 18, light = false }: LogoProps) {
  const color = light ? '#fff' : 'hsl(243 75% 59%)'
  const textColor = light ? '#fff' : 'hsl(222 47% 11%)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <svg width={size + 8} height={size + 8} viewBox="0 0 28 28" fill="none" aria-hidden="true">
        {/* Elo da esquerda */}
        <rect x="3.2" y="9.5" width="13" height="9" rx="4.5" stroke={color} strokeWidth="2.4" />
        {/* Elo da direita (sobreposição cria o "elo") */}
        <rect
          x="11.8"
          y="9.5"
          width="13"
          height="9"
          rx="4.5"
          stroke={light ? 'rgba(255,255,255,0.55)' : 'hsl(243 75% 59% / 0.45)'}
          strokeWidth="2.4"
        />
      </svg>
      <span
        style={{
          fontSize: size,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: textColor,
        }}
      >
        Elos
      </span>
    </div>
  )
}
