import { ReceiptForm } from '@/components/domain/receipt-form'
import { getMyCompaniesServer, getPurchaseOrderServer, getWarehousesServer } from '@/lib/api'
import { notFound, redirect } from 'next/navigation'

const MUTATE_ROLES = ['ADMIN_EMPRESA', 'ALMOXARIFE', 'SUPER_ADMIN']

export default async function RegisterReceiptPage({
  params,
}: {
  params: Promise<{ cnpj: string; id: string }>
}) {
  const { cnpj, id } = await params
  const [myCompanies, po, warehouses] = await Promise.all([
    getMyCompaniesServer(),
    getPurchaseOrderServer(cnpj, id),
    getWarehousesServer(cnpj),
  ])

  if (!po) notFound()
  if (po.status !== 'SENT') redirect(`/${cnpj}/purchase-orders/${id}`)

  const membership = myCompanies.find((c) => c.cnpj === cnpj)
  const role = membership?.role ?? null
  if (!role || !MUTATE_ROLES.includes(role)) redirect(`/${cnpj}/purchase-orders/${id}`)

  const activeWarehouses = warehouses.filter((w) => w.isActive)
  if (activeWarehouses.length === 0) {
    // Sem armazéns ativos — redirecionar com mensagem
    redirect(`/${cnpj}/warehouses`)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Registrar Recebimento</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Pedido: <strong>{po.number}</strong>
      </p>
      <ReceiptForm cnpj={cnpj} po={po} warehouses={activeWarehouses} />
    </div>
  )
}
