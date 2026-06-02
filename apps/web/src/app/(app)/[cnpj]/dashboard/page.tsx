interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: 'hsl(222 47% 11%)' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
          Empresa <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{cnpj}</span>
        </p>
      </div>
      <div
        style={{
          border: '2px dashed hsl(214 32% 91%)',
          borderRadius: '0.5rem',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'hsl(215 16% 47%)',
          fontSize: 14,
        }}
      >
        KPIs e gráficos chegam na Fase 7 — Audit Log e Administração.
      </div>
    </div>
  )
}
