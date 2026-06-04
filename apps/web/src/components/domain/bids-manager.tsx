'use client'

// apps/web/src/components/domain/bids-manager.tsx
// Gestão de lances de uma cotação OPEN: o COMPRADOR cria um lance em nome de
// cada fornecedor convidado, informa preço e prazo por item e submete o lance.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  type BidWithItems,
  addBidItem,
  createBid,
  removeBid,
  removeBidItem,
  submitBid,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import type {
  BidItemResponse,
  CreateBidItemDto,
  QuotationItemResponse,
  QuotationSupplierResponse,
} from '@elos/shared'
import { Send, Trash2 } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { toast } from 'sonner'
import { BidStatusBadge } from './bid-status-badge'

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const SELECT = `${INPUT} cursor-pointer`

function formatBRL(value: string | number | null): string {
  if (value === null) return '—'
  const n = typeof value === 'string' ? Number.parseFloat(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function bidTotal(items: BidItemResponse[]): number {
  return items.reduce((sum, it) => sum + (Number.parseFloat(it.totalPrice) || 0), 0)
}

interface BidsManagerProps {
  cnpj: string
  quotationId: string
  initialBids: BidWithItems[]
  quotationItems: QuotationItemResponse[]
  invitedSuppliers: QuotationSupplierResponse[]
  canEdit: boolean
}

// Formulário inline para cotar um item dentro de um lance
function AddBidItemForm({
  availableItems,
  onAdd,
}: {
  availableItems: QuotationItemResponse[]
  onAdd: (dto: CreateBidItemDto) => Promise<void>
}) {
  const [quotationItemId, setQuotationItemId] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [deliveryDays, setDeliveryDays] = useState('')
  const [loading, setLoading] = useState(false)

  // ids únicos por instância: múltiplos lances DRAFT renderizam este form ao
  // mesmo tempo, então ids estáticos colidiriam entre label e controle.
  const uid = useId()
  const itemFieldId = `${uid}-item`
  const priceFieldId = `${uid}-price`
  const daysFieldId = `${uid}-days`

  if (availableItems.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground">
        Todos os itens da cotação já foram cotados neste lance.
      </p>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!quotationItemId || !unitPrice || !deliveryDays) return
    setLoading(true)
    try {
      await onAdd({
        quotationItemId,
        unitPrice: Number(unitPrice),
        deliveryDays: Number(deliveryDays),
      })
      setQuotationItemId('')
      setUnitPrice('')
      setDeliveryDays('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2.5 rounded-lg border border-border bg-muted/40 p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor={itemFieldId} className={LABEL}>
          Item *
        </label>
        <select
          id={itemFieldId}
          value={quotationItemId}
          onChange={(e) => setQuotationItemId(e.target.value)}
          className={SELECT}
        >
          <option value="">Selecione um item...</option>
          {availableItems.map((it) => (
            <option key={it.id} value={it.id}>
              {it.description} ({Number.parseFloat(it.quantity).toLocaleString('pt-BR')} {it.unit})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={priceFieldId} className={LABEL}>
          Preço unit. (R$) *
        </label>
        <input
          id={priceFieldId}
          type="number"
          min="0"
          step="0.01"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className={INPUT}
          placeholder="0,00"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={daysFieldId} className={LABEL}>
          Prazo (dias) *
        </label>
        <input
          id={daysFieldId}
          type="number"
          min="1"
          step="1"
          value={deliveryDays}
          onChange={(e) => setDeliveryDays(e.target.value)}
          className={INPUT}
          placeholder="7"
        />
      </div>
      <Button type="submit" disabled={loading || !quotationItemId || !unitPrice || !deliveryDays}>
        {loading ? '...' : 'Adicionar'}
      </Button>
    </form>
  )
}

export function BidsManager({
  cnpj,
  quotationId,
  initialBids,
  quotationItems,
  invitedSuppliers,
  canEdit,
}: BidsManagerProps) {
  const [bids, setBids] = useState<BidWithItems[]>(initialBids)
  const [newSupplierId, setNewSupplierId] = useState('')
  const [creating, setCreating] = useState(false)

  const biddingSupplierIds = new Set(bids.map((b) => b.supplierId))
  const availableSuppliers = invitedSuppliers.filter((s) => !biddingSupplierIds.has(s.supplierId))

  async function handleCreateBid() {
    if (!newSupplierId) return
    setCreating(true)
    try {
      const bid = await createBid(cnpj, quotationId, { supplierId: newSupplierId })
      setBids((prev) => [...prev, { ...bid, items: [] }])
      setNewSupplierId('')
      toast.success('Lance criado. Adicione os itens cotados.')
    } catch (error) {
      console.error('[BidsManager.handleCreateBid]', error)
      toast.error('Erro ao criar lance.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRemoveBid(bidId: string) {
    try {
      await removeBid(cnpj, quotationId, bidId)
      setBids((prev) => prev.filter((b) => b.id !== bidId))
      toast.success('Lance removido.')
    } catch (error) {
      console.error('[BidsManager.handleRemoveBid]', error)
      toast.error('Erro ao remover lance.')
    }
  }

  async function handleSubmitBid(bidId: string) {
    try {
      const updated = await submitBid(cnpj, quotationId, bidId)
      setBids((prev) =>
        prev.map((b) =>
          b.id === bidId ? { ...b, status: updated.status, submittedAt: updated.submittedAt } : b,
        ),
      )
      toast.success('Lance enviado.')
    } catch (error) {
      console.error('[BidsManager.handleSubmitBid]', error)
      toast.error('Erro ao enviar lance. Verifique se há ao menos um item cotado.')
    }
  }

  async function handleAddItem(bidId: string, dto: CreateBidItemDto) {
    try {
      const item = await addBidItem(cnpj, quotationId, bidId, dto)
      setBids((prev) => prev.map((b) => (b.id === bidId ? { ...b, items: [...b.items, item] } : b)))
      toast.success('Item adicionado ao lance.')
    } catch (error) {
      console.error('[BidsManager.handleAddItem]', error)
      toast.error('Erro ao adicionar item.')
    }
  }

  async function handleRemoveItem(bidId: string, itemId: string) {
    try {
      await removeBidItem(cnpj, quotationId, bidId, itemId)
      setBids((prev) =>
        prev.map((b) =>
          b.id === bidId ? { ...b, items: b.items.filter((i) => i.id !== itemId) } : b,
        ),
      )
      toast.success('Item removido.')
    } catch (error) {
      console.error('[BidsManager.handleRemoveItem]', error)
      toast.error('Erro ao remover item.')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Criar lance para um fornecedor convidado */}
      {canEdit && availableSuppliers.length > 0 && (
        <div className="flex items-end gap-2.5 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="new-bid-supplier" className={LABEL}>
              Novo lance para fornecedor
            </label>
            <select
              id="new-bid-supplier"
              value={newSupplierId}
              onChange={(e) => setNewSupplierId(e.target.value)}
              className={SELECT}
            >
              <option value="">Selecione um fornecedor convidado...</option>
              {availableSuppliers.map((s) => (
                <option key={s.id} value={s.supplierId}>
                  {s.supplierName}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={handleCreateBid} disabled={!newSupplierId || creating}>
            {creating ? '...' : 'Criar lance'}
          </Button>
        </div>
      )}

      {bids.length === 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          Nenhum lance registrado para esta cotação.
        </div>
      )}

      {bids.map((bid) => {
        const addedItemIds = new Set(bid.items.map((i) => i.quotationItemId))
        const availableItems = quotationItems.filter((qi) => !addedItemIds.has(qi.id))
        const isDraft = bid.status === 'DRAFT'
        const editable = canEdit && isDraft

        return (
          <div
            key={bid.id}
            className="overflow-hidden rounded-lg border border-border bg-card shadow-card"
          >
            <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="font-medium text-foreground">{bid.supplierName}</span>
                <BidStatusBadge status={bid.status} />
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono-nums text-sm font-medium text-foreground">
                  {formatBRL(bidTotal(bid.items))}
                </span>
                {editable && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitBid(bid.id)}
                      disabled={bid.items.length === 0}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" />
                      Enviar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Remover lance de ${bid.supplierName}`}
                          title="Remover lance"
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive-soft"
                        >
                          <Trash2 size={15} strokeWidth={1.6} />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover este lance?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O lance de {bid.supplierName} e todos os seus itens serão removidos.
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveBid(bid.id)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>

            <div className="p-5">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      <th className={TH}>Item</th>
                      <th className={cn(TH, 'text-right')}>Qtd</th>
                      <th className={cn(TH, 'text-right')}>Preço unit.</th>
                      <th className={cn(TH, 'text-right')}>Prazo</th>
                      <th className={cn(TH, 'text-right')}>Total</th>
                      {editable && <th className={cn(TH, 'w-12 text-right')} />}
                    </tr>
                  </thead>
                  <tbody>
                    {bid.items.length === 0 && (
                      <tr>
                        <td
                          colSpan={editable ? 6 : 5}
                          className="px-4 py-8 text-center text-sm text-muted-foreground"
                        >
                          Nenhum item cotado neste lance.
                        </td>
                      </tr>
                    )}
                    {bid.items.map((item) => (
                      <tr key={item.id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 text-foreground">{item.description}</td>
                        <td className="px-4 py-3 text-right font-mono-nums text-muted-foreground">
                          {Number.parseFloat(item.quantity).toLocaleString('pt-BR')} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-nums text-foreground">
                          {formatBRL(item.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono-nums text-muted-foreground">
                          {item.deliveryDays} dias
                        </td>
                        <td className="px-4 py-3 text-right font-mono-nums font-medium text-foreground">
                          {formatBRL(item.totalPrice)}
                        </td>
                        {editable && (
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(bid.id, item.id)}
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

              {editable && (
                <AddBidItemForm
                  availableItems={availableItems}
                  onAdd={(dto) => handleAddItem(bid.id, dto)}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
