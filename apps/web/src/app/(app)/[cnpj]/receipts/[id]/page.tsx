import { Button } from '@/components/ui/button'
import { getReceiptServer } from '@/lib/api'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ cnpj: string; id: string }>
}) {
  const { cnpj, id } = await params
  const receipt = await getReceiptServer(cnpj, id)
  if (!receipt) notFound()

  const items = receipt.items ?? []

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${cnpj}/receipts`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Recebimentos
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Recebimento — {receipt.purchaseOrderNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {receipt.warehouseName} · {new Date(receipt.receivedAt).toLocaleString('pt-BR')}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            receipt.status === 'COMPLETE'
              ? 'bg-success/10 text-success'
              : 'bg-warning/10 text-warning'
          }`}
        >
          {receipt.status === 'COMPLETE' ? 'Completo' : 'Parcial'}
        </span>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Itens recebidos</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-right px-4 py-3 font-medium">Pedido</th>
                <th className="text-right px-4 py-3 font-medium">Recebido (este)</th>
                <th className="text-right px-4 py-3 font-medium">Total recebido</th>
                <th className="text-left px-4 py-3 font-medium">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.productName}</div>
                    {item.productCode && (
                      <div className="text-xs text-muted-foreground">{item.productCode}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(item.orderedQuantity).toFixed(3)} {item.unit}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-success">
                    +{Number(item.receivedQuantity).toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(item.totalReceived).toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {receipt.notes && (
        <div className="mb-6">
          <h2 className="text-base font-medium mb-1">Notas</h2>
          <p className="text-sm text-muted-foreground">{receipt.notes}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href={`/${cnpj}/purchase-orders/${receipt.purchaseOrderId}`}>
            Ver Pedido de Compra
          </Link>
        </Button>
      </div>
    </div>
  )
}
