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
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24, color: 'hsl(222 47% 11%)' }}>
        Editar produto
      </h1>
      <div
        style={{
          background: 'white',
          borderRadius: '0.5rem',
          border: '1px solid hsl(214 32% 91%)',
          padding: 28,
        }}
      >
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
