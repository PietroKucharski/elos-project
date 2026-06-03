// apps/web/src/app/(app)/[cnpj]/quotations/new/page.tsx
import { QuotationForm } from '@/components/domain/quotation-form'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function NewQuotationPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div className="max-w-[720px]">
      <h1 className="mb-6 text-[22px] font-semibold text-foreground">Nova cotação</h1>
      <div className="rounded-lg border border-border bg-card p-7">
        <QuotationForm cnpj={cnpj} mode="create" />
      </div>
    </div>
  )
}
