'use client'

import { Button } from '@/components/ui/button'
import { addInvoiceItem, removeInvoiceItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CreateInvoiceItemDto, InvoiceItemResponse } from '@elos/shared'
import { Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'

function brl(value: string | number) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface InvoiceItemsPanelProps {
  cnpj: string
  invoiceId: string
  initialItems: InvoiceItemResponse[]
  canEdit: boolean // PENDING && canMutate
  invoiceTotal: string // totalAmount da NF
  poTotal: string | number // totalAmount do PO vinculado
}

// Formulário inline para adicionar item à NF
function AddItemForm({ onAdd }: { onAdd: (item: CreateInvoiceItemDto) => Promise<void> }) {
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const qty = Number.parseFloat(quantity)
    const price = Number.parseFloat(unitPrice)
    if (!description.trim() || Number.isNaN(qty) || qty <= 0 || Number.isNaN(price) || price < 0) {
      toast.error('Preencha descrição, quantidade e preço unitário válidos.')
      return
    }
    setLoading(true)
    try {
      await onAdd({
        description: description.trim(),
        quantity: qty,
        unitPrice: price,
        totalPrice: Number((qty * price).toFixed(2)),
      })
      setDescription('')
      setQuantity('')
      setUnitPrice('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2.5 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invitem-description" className={LABEL}>
          Descrição *
        </label>
        <input
          id="invitem-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={INPUT}
          placeholder="Ex: Parafuso M6 × 20mm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invitem-quantity" className={LABEL}>
          Qtd *
        </label>
        <input
          id="invitem-quantity"
          type="number"
          min="0.001"
          step="0.001"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={INPUT}
          placeholder="100"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invitem-unitprice" className={LABEL}>
          Preço Unit. *
        </label>
        <input
          id="invitem-unitprice"
          type="number"
          min="0"
          step="0.01"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className={INPUT}
          placeholder="0,00"
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? '...' : 'Adicionar'}
      </Button>
    </form>
  )
}

export function InvoiceItemsPanel({
  cnpj,
  invoiceId,
  initialItems,
  canEdit,
  invoiceTotal,
  poTotal,
}: InvoiceItemsPanelProps) {
  const [items, setItems] = useState<InvoiceItemResponse[]>(initialItems)

  const itemsTotal = useMemo(() => items.reduce((sum, i) => sum + Number(i.totalPrice), 0), [items])

  const nfValue = Number(invoiceTotal)
  const poValue = Number(poTotal)
  const diff = nfValue - poValue
  const diffIsZero = Math.abs(diff) < 0.005

  async function handleAdd(dto: CreateInvoiceItemDto) {
    try {
      const newItem = await addInvoiceItem(cnpj, invoiceId, dto)
      setItems((prev) => [...prev, newItem])
      toast.success('Item adicionado.')
    } catch (error) {
      console.error('[InvoiceItemsPanel.handleAdd]', error)
      toast.error('Erro ao adicionar item.')
    }
  }

  async function handleRemove(itemId: string) {
    try {
      await removeInvoiceItem(cnpj, invoiceId, itemId)
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success('Item removido.')
    } catch (error) {
      console.error('[InvoiceItemsPanel.handleRemove]', error)
      toast.error('Erro ao remover item.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13.5px]">
            <thead>
              <tr>
                <th className={TH}>Produto</th>
                <th className={TH}>Descrição</th>
                <th className={cn(TH, 'text-right')}>Qtd</th>
                <th className={cn(TH, 'text-right')}>Preço Unit.</th>
                <th className={cn(TH, 'text-right')}>Total</th>
                {canEdit && <th className={cn(TH, 'w-12 text-right')} />}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={canEdit ? 6 : 5}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum item adicionado.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">{item.productName ?? '—'}</td>
                  <td className="px-4 py-3 text-foreground">{item.description}</td>
                  <td className="px-4 py-3 text-right font-mono-nums text-foreground">
                    {Number.parseFloat(item.quantity).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-nums text-foreground">
                    {brl(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono-nums font-semibold text-foreground">
                    {brl(item.totalPrice)}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        aria-label={`Remover ${item.description}`}
                        title="Remover item"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 size={15} strokeWidth={1.6} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-muted/40">
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right text-[13px] font-medium text-muted-foreground"
                  >
                    Soma dos itens
                  </td>
                  <td className="px-4 py-3 text-right font-mono-nums font-semibold text-foreground">
                    {brl(itemsTotal)}
                  </td>
                  {canEdit && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Comparação NF × PO */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-card px-4 py-3 text-[13.5px]">
        <span className="text-muted-foreground">
          Valor NF: <strong className="font-mono-nums text-foreground">{brl(nfValue)}</strong>
        </span>
        <span className="text-muted-foreground">
          Valor PO: <strong className="font-mono-nums text-foreground">{brl(poValue)}</strong>
        </span>
        <span className="text-muted-foreground">
          Diferença:{' '}
          <strong className={cn('font-mono-nums', diffIsZero ? 'text-success' : 'text-warning')}>
            {brl(diff)}
          </strong>
        </span>
      </div>

      {canEdit && <AddItemForm onAdd={handleAdd} />}
    </div>
  )
}
