import { WarehouseForm } from '@/components/domain/warehouse-form'

export default async function NewWarehousePage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = await params
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Novo Armazém</h1>
      <WarehouseForm cnpj={cnpj} />
    </div>
  )
}
