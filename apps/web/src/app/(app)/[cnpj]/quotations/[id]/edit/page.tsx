// apps/web/src/app/(app)/[cnpj]/quotations/[id]/edit/page.tsx
import { QuotationForm } from '@/components/domain/quotation-form'
import { getQuotationServer } from '@/lib/api'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

export default async function EditQuotationPage({ params }: Props) {
  const { cnpj, id } = await params

  const quotation = await getQuotationServer(cnpj, id)
  // Apenas cotações em DRAFT são editáveis — o backend bloqueia o restante.
  if (!quotation || quotation.status !== 'DRAFT') notFound()

  return (
    <div className="max-w-[720px]">
      <h1 className="mb-6 text-[22px] font-semibold text-foreground">Editar cotação</h1>
      <div className="rounded-lg border border-border bg-card p-7">
        <QuotationForm cnpj={cnpj} mode="edit" quotation={quotation} />
      </div>
    </div>
  )
}
