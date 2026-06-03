// apps/web/src/app/(app)/[cnpj]/quotations/new/page.tsx
import { QuotationForm } from '@/components/domain/quotation-form'
import { getMyCompaniesServer } from '@/lib/api'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function NewQuotationPage({ params }: Props) {
  const { cnpj } = await params

  // Somente papéis com permissão de mutação criam cotações (mesma regra de `canMutate`).
  const myCompanies = await getMyCompaniesServer()
  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  if (!MUTATE_ROLES.includes(role)) notFound()

  return (
    <div className="max-w-[720px]">
      <h1 className="mb-6 text-[22px] font-semibold text-foreground">Nova cotação</h1>
      <div className="rounded-lg border border-border bg-card p-7">
        <QuotationForm cnpj={cnpj} mode="create" />
      </div>
    </div>
  )
}
