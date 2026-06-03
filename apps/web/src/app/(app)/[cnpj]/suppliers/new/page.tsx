// apps/web/src/app/(app)/[cnpj]/suppliers/new/page.tsx
import { SupplierForm } from '@/components/domain/supplier-form'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function NewSupplierPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div className="max-w-[720px]">
      <h1 className="mb-6 text-[22px] font-semibold text-foreground">Novo fornecedor</h1>
      <div className="rounded-lg border border-border bg-card p-7">
        <SupplierForm mode="create" cnpj={cnpj} />
      </div>
    </div>
  )
}
