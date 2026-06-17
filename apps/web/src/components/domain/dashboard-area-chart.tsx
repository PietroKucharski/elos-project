import type { DashboardChartPoint } from '@/lib/api'
import type { CSSProperties } from 'react'

interface Props {
  data: DashboardChartPoint[]
}

const W = 720
const H = 220
const PAD = { l: 36, r: 16, t: 16, b: 28 }

// Gráfico de área do dashboard — espelha o AreaChart do Claude Design (gradiente
// indigo, gridlines tracejadas, linha suave com animação de desenho e pontos com
// rótulo de mês/valor). Escala dinamicamente ao maior valor real da série.
export function DashboardAreaChart({ data }: Props) {
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const rawMax = Math.max(...data.map((d) => d.value), 0)
  // Teto "redondo" (múltiplo de 8, mínimo 8) para a escala não ficar colada no topo.
  const max = Math.max(8, Math.ceil(rawMax / 8) * 8)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))

  const x = (i: number) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * iw : iw / 2)
  const y = (v: number) => PAD.t + ih - (v / max) * ih
  const pts = data.map((d, i) => [x(i), y(d.value)] as const)

  // Caminho suave (bezier pelo ponto médio entre vértices).
  const line = pts.reduce((acc, [px, py], i) => {
    if (i === 0) return `M ${px} ${py}`
    const [x0, y0] = pts[i - 1]!
    const cx = (x0 + px) / 2
    return `${acc} C ${cx} ${y0}, ${cx} ${py}, ${px} ${py}`
  }, '')
  const area = `${line} L ${pts[pts.length - 1]![0]} ${PAD.t + ih} L ${pts[0]![0]} ${PAD.t + ih} Z`

  const lineStyle: CSSProperties = {
    strokeDasharray: 1600,
    ['--dash' as string]: 1600,
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block h-auto w-full"
      role="img"
      aria-label="Evolução de pedidos"
    >
      <defs>
        <linearGradient id="dash-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--chart-primary))" stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(var(--chart-primary))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={PAD.l}
            y1={y(v)}
            x2={W - PAD.r}
            y2={y(v)}
            stroke="hsl(var(--chart-border))"
            strokeWidth="1"
            strokeDasharray={v === 0 ? '0' : '3 4'}
          />
          <text
            x={PAD.l - 8}
            y={y(v) + 3.5}
            textAnchor="end"
            fontSize="10.5"
            fill="hsl(var(--chart-subtle))"
            className="mono"
          >
            {v}
          </text>
        </g>
      ))}

      <path d={area} fill="url(#dash-area-fill)" />
      <path
        d={line}
        fill="none"
        stroke="hsl(var(--chart-primary))"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="chart-line"
        style={lineStyle}
      />

      {pts.map(([px, py], i) => (
        <g key={data[i]!.month}>
          <circle
            cx={px}
            cy={py}
            r="4.5"
            fill="hsl(var(--chart-card))"
            stroke="hsl(var(--chart-primary))"
            strokeWidth="2.4"
          />
          <text x={px} y={H - 8} textAnchor="middle" fontSize="11" fill="hsl(var(--chart-muted))">
            {data[i]!.month}
          </text>
          <text
            x={px}
            y={py - 12}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="hsl(var(--chart-fg))"
            className="mono"
          >
            {data[i]!.value}
          </text>
        </g>
      ))}
    </svg>
  )
}
