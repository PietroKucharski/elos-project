import { InvoiceForm } from '@/components/domain/invoice-form'
import { Button } from '@/components/ui/button'
import { getPurchaseOrdersServer, getSuppliersServer } from '@/lib/api'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ cnpj: string }>
  searchParams: Promise<{ purchaseOrderId?: string }>
}) {
  const { cnpj } = await params
  const { purchaseOrderId } = await searchParams

  const [purchaseOrders, suppliers] = await Promise.all([
    getPurchaseOrdersServer(cnpj),
    getSuppliersServer(cnpj, { status: 'APPROVED' }),
  ])

  // Apenas pedidos enviados ou recebidos podem receber uma NF.
  const eligiblePurchaseOrders = purchaseOrders.filter(
    (po) => po.status === 'SENT' || po.status === 'RECEIVED',
  )

  return (
    <div className="max-w-[720px]">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${cnpj}/invoices`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Notas Fiscais
          </Link>
        </Button>
      </div>

      <h1 className="mb-6 text-2xl font-semibold">Registrar Nota Fiscal</h1>

      <InvoiceForm
        cnpj={cnpj}
        purchaseOrders={eligiblePurchaseOrders}
        suppliers={suppliers}
        purchaseOrderId={purchaseOrderId}
      />
    </div>
  )
}
