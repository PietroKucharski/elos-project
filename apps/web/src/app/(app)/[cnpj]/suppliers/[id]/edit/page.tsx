// apps/web/src/app/(app)/[cnpj]/suppliers/[id]/edit/page.tsx
import { SupplierForm } from '@/components/domain/supplier-form'
import { getSupplierServer } from '@/lib/api'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

export default async function EditSupplierPage({ params }: Props) {
  const { cnpj, id } = await params
  const supplier = await getSupplierServer(cnpj, id)
  if (!supplier) notFound()

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24, color: 'hsl(222 47% 11%)' }}>
        Editar fornecedor
      </h1>
      <div
        style={{
          background: 'white',
          borderRadius: '0.5rem',
          border: '1px solid hsl(214 32% 91%)',
          padding: 28,
        }}
      >
        <SupplierForm
          mode="edit"
          cnpj={cnpj}
          supplierId={id}
          defaultValues={{
            name: supplier.name,
            cnpj: supplier.cnpj ?? undefined,
            cpf: supplier.cpf ?? undefined,
            email: supplier.email ?? undefined,
            phone: supplier.phone ?? undefined,
            notes: supplier.notes ?? undefined,
            type: supplier.type,
            address: supplier.address
              ? {
                  street: supplier.address.street,
                  number: supplier.address.number,
                  complement: supplier.address.complement ?? undefined,
                  city: supplier.address.city,
                  state: supplier.address.state,
                  zipCode: supplier.address.zipCode,
                }
              : undefined,
          }}
        />
      </div>
    </div>
  )
}
