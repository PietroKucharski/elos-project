// apps/web/src/app/(app)/[cnpj]/products/[id]/edit/page.tsx
import { ProductForm } from '@/components/domain/product-form'
import { getProductServer } from '@/lib/api'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

export default async function EditProductPage({ params }: Props) {
  const { cnpj, id } = await params
  const product = await getProductServer(cnpj, id)
  if (!product) notFound()

  return (
    <div className="max-w-[720px]">
      <h1 className="mb-6 text-[22px] font-semibold text-foreground">Editar produto</h1>
      <div className="rounded-lg border border-border bg-card p-7">
        <ProductForm
          mode="edit"
          cnpj={cnpj}
          productId={id}
          defaultValues={{
            name: product.name,
            code: product.code ?? undefined,
            description: product.description ?? undefined,
            unit: product.unit,
            minStock: product.minStock ? Number.parseFloat(product.minStock) : undefined,
            isActive: product.isActive,
          }}
        />
      </div>
    </div>
  )
}
