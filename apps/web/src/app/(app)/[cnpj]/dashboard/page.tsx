interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function DashboardPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-[22px] font-semibold leading-[1.2] text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Empresa <span className="font-mono text-[13px]">{cnpj}</span>
        </p>
      </div>
      <div className="rounded-lg border-2 border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
        KPIs e gráficos chegam na Fase 7 — Audit Log e Administração.
      </div>
    </div>
  )
}
