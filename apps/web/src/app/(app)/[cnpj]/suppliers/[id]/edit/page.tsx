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
    <div className="max-w-[720px]">
      <h1 className="mb-6 text-[22px] font-semibold text-foreground">Editar fornecedor</h1>
      <div className="rounded-lg border border-border bg-card p-7">
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
