// apps/web/src/app/(app)/[cnpj]/quotations/[id]/edit/page.tsx
import { QuotationForm } from '@/components/domain/quotation-form'
import { getMyCompaniesServer, getQuotationServer } from '@/lib/api'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function EditQuotationPage({ params }: Props) {
  const { cnpj, id } = await params

  const [quotation, myCompanies] = await Promise.all([
    getQuotationServer(cnpj, id),
    getMyCompaniesServer(),
  ])

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)

  // Editável apenas em DRAFT e somente por papéis com permissão de mutação
  // (mesma regra de `canMutate` da página de detalhe).
  if (!quotation || quotation.status !== 'DRAFT' || !canMutate) notFound()

  return (
    <div className="max-w-[720px]">
      <h1 className="mb-6 text-[22px] font-semibold text-foreground">Editar cotação</h1>
      <div className="rounded-lg border border-border bg-card p-7">
        <QuotationForm cnpj={cnpj} mode="edit" quotation={quotation} />
      </div>
    </div>
  )
}
