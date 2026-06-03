'use client'

// apps/web/src/components/domain/quotation-items-panel.tsx

import { Button } from '@/components/ui/button'
import { addQuotationItem, removeQuotationItem } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CreateQuotationItemDto, QuotationItemResponse } from '@elos/shared'
import { Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'

interface QuotationItemsPanelProps {
  cnpj: string
  quotationId: string
  initialItems: QuotationItemResponse[]
  canEdit: boolean
}

// Formulário inline para adicionar item
function AddItemForm({ onAdd }: { onAdd: (item: CreateQuotationItemDto) => Promise<void> }) {
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('UN')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!description || !quantity) return
    setLoading(true)
    try {
      await onAdd({ description, quantity: Number(quantity), unit })
      setDescription('')
      setQuantity('')
      setUnit('UN')
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
        <label htmlFor="item-description" className={LABEL}>
          Descrição *
        </label>
        <input
          id="item-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={INPUT}
          placeholder="Ex: Parafuso M6 × 20mm"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="item-quantity" className={LABEL}>
          Qtd *
        </label>
        <input
          id="item-quantity"
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
        <label htmlFor="item-unit" className={LABEL}>
          Unidade
        </label>
        <input
          id="item-unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={INPUT}
          placeholder="UN"
        />
      </div>
      <Button type="submit" disabled={loading || !description || !quantity}>
        {loading ? '...' : 'Adicionar'}
      </Button>
    </form>
  )
}

export function QuotationItemsPanel({
  cnpj,
  quotationId,
  initialItems,
  canEdit,
}: QuotationItemsPanelProps) {
  const [items, setItems] = useState<QuotationItemResponse[]>(initialItems)

  async function handleAdd(dto: CreateQuotationItemDto) {
    try {
      const newItem = await addQuotationItem(cnpj, quotationId, dto)
      setItems((prev) => [...prev, newItem])
      toast.success('Item adicionado.')
    } catch (error) {
      console.error('[QuotationItemsPanel.handleAdd]', error)
      toast.error('Erro ao adicionar item.')
    }
  }

  async function handleRemove(itemId: string) {
    try {
      await removeQuotationItem(cnpj, quotationId, itemId)
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success('Item removido.')
    } catch (error) {
      console.error('[QuotationItemsPanel.handleRemove]', error)
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
                <th className={TH}>Descrição</th>
                <th className={cn(TH, 'text-right')}>Qtd</th>
                <th className={TH}>Unid.</th>
                {canEdit && <th className={cn(TH, 'w-12 text-right')} />}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={canEdit ? 4 : 3}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    Nenhum item adicionado.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{item.description}</td>
                  <td className="px-4 py-3 text-right font-mono-nums text-foreground">
                    {Number.parseFloat(item.quantity).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        aria-label={`Remover ${item.description}`}
                        title="Remover item"
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive-soft"
                      >
                        <Trash2 size={15} strokeWidth={1.6} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {canEdit && <AddItemForm onAdd={handleAdd} />}
    </div>
  )
}
