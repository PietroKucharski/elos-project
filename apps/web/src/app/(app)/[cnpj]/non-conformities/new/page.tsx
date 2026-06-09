import { NonConformityForm } from '@/components/domain/non-conformity-form'
import { getSuppliersServer } from '@/lib/api'

export default async function NewNcPage({
  params,
  searchParams,
}: {
  params: Promise<{ cnpj: string }>
  searchParams?: Promise<{ purchaseOrderId?: string }>
}) {
  const { cnpj } = await params
  const sp = await searchParams
  const poId = sp?.purchaseOrderId
  const [suppliers] = await Promise.all([getSuppliersServer(cnpj, { status: 'APPROVED' })])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Abrir Não-Conformidade</h1>
      <NonConformityForm cnpj={cnpj} suppliers={suppliers} purchaseOrderId={poId} />
    </div>
  )
}
