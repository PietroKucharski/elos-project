import { WarehouseForm } from '@/components/domain/warehouse-form'
import { getWarehouseServer } from '@/lib/api'
import { notFound } from 'next/navigation'

export default async function EditWarehousePage({
  params,
}: {
  params: Promise<{ cnpj: string; id: string }>
}) {
  const { cnpj, id } = await params
  const warehouse = await getWarehouseServer(cnpj, id)
  if (!warehouse || !warehouse.isActive) notFound()

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Editar Armazém</h1>
      <WarehouseForm cnpj={cnpj} warehouse={warehouse} />
    </div>
  )
}
