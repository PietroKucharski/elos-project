// apps/web/src/app/(app)/[cnpj]/products/new/page.tsx
import { ProductForm } from '@/components/domain/product-form'

interface Props {
  params: Promise<{ cnpj: string }>
}

export default async function NewProductPage({ params }: Props) {
  const { cnpj } = await params
  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24, color: 'hsl(222 47% 11%)' }}>
        Novo produto
      </h1>
      <div
        style={{
          background: 'white',
          borderRadius: '0.5rem',
          border: '1px solid hsl(214 32% 91%)',
          padding: 28,
        }}
      >
        <ProductForm mode="create" cnpj={cnpj} />
      </div>
    </div>
  )
}
