'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createReceipt } from '@/lib/api'
import type {
  PurchaseOrderItemResponse,
  PurchaseOrderResponse,
  WarehouseResponse,
} from '@elos/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface ReceiptFormProps {
  cnpj: string
  po: PurchaseOrderResponse & { items: PurchaseOrderItemResponse[] }
  warehouses: WarehouseResponse[]
}

interface ItemState {
  purchaseOrderItemId: string
  receivedQuantity: string
  notes: string
}

export function ReceiptForm({ cnpj, po, warehouses }: ReceiptFormProps) {
  const router = useRouter()
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '')
  const [receivedAt, setReceivedAt] = useState(() => {
    // default: agora, no formato datetime-local (hora local de parede, não UTC)
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [globalNotes, setGlobalNotes] = useState('')
  const [items, setItems] = useState<ItemState[]>(
    po.items.map((item) => ({
      purchaseOrderItemId: item.id,
      receivedQuantity: '',
      notes: '',
    })),
  )
  const [submitting, setSubmitting] = useState(false)

  function updateItem(index: number, field: keyof ItemState, value: string) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index]!, [field]: value }
      return next
    })
  }

  // Calcula quantidade pendente (quantity - receivedQuantity até agora)
  function getPending(item: PurchaseOrderItemResponse) {
    return Math.max(0, Number(item.quantity) - Number(item.receivedQuantity ?? '0'))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!warehouseId) {
      toast.error('Selecione o armazém de destino.')
      return
    }

    // Filtrar apenas itens com quantidade informada
    const filledItems = items.filter((i) => {
      const qty = Number.parseFloat(i.receivedQuantity)
      return !Number.isNaN(qty) && qty > 0
    })

    if (filledItems.length === 0) {
      toast.error('Informe a quantidade recebida de pelo menos um item.')
      return
    }

    setSubmitting(true)
    try {
      const receipt = await createReceipt(cnpj, {
        purchaseOrderId: po.id,
        warehouseId,
        receivedAt: new Date(receivedAt).toISOString(),
        notes: globalNotes || undefined,
        items: filledItems.map((i) => ({
          purchaseOrderItemId: i.purchaseOrderItemId,
          receivedQuantity: Number.parseFloat(i.receivedQuantity),
          notes: i.notes || undefined,
        })),
      })
      toast.success(
        receipt.status === 'COMPLETE'
          ? 'Recebimento completo registrado. PO marcado como recebido.'
          : 'Recebimento parcial registrado.',
      )
      router.push(`/${cnpj}/receipts/${receipt.id}`)
      router.refresh()
    } catch (error) {
      console.error('[ReceiptForm.handleSubmit]', error)
      toast.error('Erro ao registrar recebimento. Verifique as quantidades.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {/* Armazém */}
      <div className="space-y-1">
        <Label htmlFor="warehouseId">Armazém de Destino *</Label>
        <select
          id="warehouseId"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          <option value="">Selecione o armazém…</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      {/* Data/hora */}
      <div className="space-y-1">
        <Label htmlFor="receivedAt">Data e Hora do Recebimento *</Label>
        <Input
          id="receivedAt"
          type="datetime-local"
          value={receivedAt}
          onChange={(e) => setReceivedAt(e.target.value)}
          required
        />
      </div>

      {/* Itens */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Itens</h3>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-right px-4 py-3 font-medium">Pedido</th>
                <th className="text-right px-4 py-3 font-medium">Já recebido</th>
                <th className="text-right px-4 py-3 font-medium">Pendente</th>
                <th className="text-right px-4 py-3 font-medium">Receber agora *</th>
                <th className="px-4 py-3 font-medium">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {po.items.map((poItem, index) => {
                const pending = getPending(poItem)
                const state = items[index]
                if (!state) return null
                return (
                  <tr key={poItem.id} className={pending === 0 ? 'opacity-40' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{poItem.productName}</div>
                      {poItem.productCode && (
                        <div className="text-xs text-muted-foreground">{poItem.productCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(poItem.quantity).toFixed(3)} {poItem.unit}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {Number(poItem.receivedQuantity ?? '0').toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {pending.toFixed(3)}
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max={pending}
                        value={state.receivedQuantity}
                        onChange={(e) => updateItem(index, 'receivedQuantity', e.target.value)}
                        disabled={pending === 0}
                        className="w-28 text-right"
                        placeholder="0.000"
                        aria-label={`Quantidade recebida de ${poItem.productName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        type="text"
                        value={state.notes}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        disabled={pending === 0}
                        className="w-40"
                        placeholder="Opcional"
                        aria-label={`Observação de ${poItem.productName}`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notas gerais */}
      <div className="space-y-1">
        <Label htmlFor="globalNotes">Notas gerais</Label>
        <Input
          id="globalNotes"
          value={globalNotes}
          onChange={(e) => setGlobalNotes(e.target.value)}
          placeholder="Observações sobre o recebimento"
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Registrando…' : 'Registrar Recebimento'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/${cnpj}/purchase-orders/${po.id}`)}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
