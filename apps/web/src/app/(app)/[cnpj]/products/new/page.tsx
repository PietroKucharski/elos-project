// apps/web/src/app/(app)/[cnpj]/products/new/page.tsx
import { ProductForm } from '@/components/domain/product-form'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function NewProductPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div className="max-w-[720px]">
      <h1 className="mb-6 text-[22px] font-semibold text-foreground">Novo produto</h1>
      <div className="rounded-lg border border-border bg-card p-7">
        <ProductForm mode="create" cnpj={cnpj} />
      </div>
    </div>
  )
}
