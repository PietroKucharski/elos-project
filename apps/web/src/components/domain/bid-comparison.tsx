'use client'

// apps/web/src/components/domain/bid-comparison.tsx
// Comparativo de lances de uma cotação CLOSED: matrix item × fornecedor com
// destaque do menor preço por item e seleção do lance vencedor.

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
import { selectWinner } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { BidComparisonResponse } from '@elos/shared'
import { Trophy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { BidStatusBadge } from './bid-status-badge'

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'

function formatBRL(value: string | number | null): string {
  if (value === null) return '—'
  const n = typeof value === 'string' ? Number.parseFloat(value) : value
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface BidComparisonProps {
  cnpj: string
  quotationId: string
  comparison: BidComparisonResponse
  canMutate: boolean
}

export function BidComparison({ cnpj, quotationId, comparison, canMutate }: BidComparisonProps) {
  const router = useRouter()
  const [selecting, setSelecting] = useState<string | null>(null)

  const winner = comparison.bids.find((b) => b.status === 'SELECTED')
  const hasWinner = Boolean(winner)
  const submittedBids = comparison.bids.filter((b) => b.status === 'SUBMITTED')

  async function handleSelect(bidId: string) {
    setSelecting(bidId)
    try {
      await selectWinner(cnpj, quotationId, { bidId })
      toast.success('Lance vencedor selecionado.')
      router.refresh()
    } catch (error) {
      console.error('[BidComparison.handleSelect]', error)
      toast.error('Erro ao selecionar vencedor.')
    } finally {
      setSelecting(null)
    }
  }

  if (comparison.bids.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
        Nenhum lance foi registrado para esta cotação.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {winner && (
        <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
          <Trophy className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>
            <strong className="font-semibold">{winner.supplierName}</strong> foi selecionado como
            vencedor desta cotação ({formatBRL(winner.totalPrice)}).
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-card">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className={cn(TH, 'min-w-[220px]')}>Item</th>
              {comparison.bids.map((bid) => (
                <th key={bid.bidId} className={cn(TH, 'min-w-[160px]')}>
                  <div className="flex flex-col gap-1">
                    <span className="text-foreground normal-case">{bid.supplierName}</span>
                    <BidStatusBadge status={bid.status} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => {
              const prices = comparison.bids
                .map((b) => row.bids[b.bidId]?.unitPrice)
                .filter((p): p is string => p != null)
                .map((p) => Number.parseFloat(p))
              const minPrice = prices.length > 0 ? Math.min(...prices) : null

              return (
                <tr key={row.quotationItemId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="text-foreground">{row.description}</div>
                    <div className="font-mono-nums text-[12px] text-muted-foreground">
                      {Number.parseFloat(row.quantity).toLocaleString('pt-BR')} {row.unit}
                    </div>
                  </td>
                  {comparison.bids.map((bid) => {
                    const cell = row.bids[bid.bidId]
                    const isLowest =
                      cell?.unitPrice != null &&
                      minPrice != null &&
                      Number.parseFloat(cell.unitPrice) === minPrice
                    return (
                      <td
                        key={bid.bidId}
                        className={cn(
                          'px-4 py-3 align-top',
                          bid.status === 'SELECTED' && 'bg-success-soft/50',
                        )}
                      >
                        {cell?.unitPrice == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                'font-mono-nums text-foreground',
                                isLowest && 'font-semibold text-success',
                              )}
                            >
                              {formatBRL(cell.unitPrice)}
                            </span>
                            <span className="font-mono-nums text-[12px] text-muted-foreground">
                              {formatBRL(cell.totalPrice)} · {cell.deliveryDays ?? '—'} dias
                            </span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border">
              <td className="px-4 py-3 text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                Total
              </td>
              {comparison.bids.map((bid) => (
                <td
                  key={bid.bidId}
                  className={cn(
                    'px-4 py-3 font-mono-nums font-semibold text-foreground',
                    bid.status === 'SELECTED' && 'bg-success-soft/50',
                  )}
                >
                  {formatBRL(bid.totalPrice)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {canMutate && !hasWinner && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[13px] font-medium text-foreground-2">Selecionar vencedor</p>
          {submittedBids.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nenhum lance enviado disponível para seleção. Apenas lances com status “Enviado” podem
              vencer.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {submittedBids.map((bid) => (
                <AlertDialog key={bid.bidId}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={selecting !== null}>
                      <Trophy className="mr-1.5 h-3.5 w-3.5" />
                      {bid.supplierName} · {formatBRL(bid.totalPrice)}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Selecionar {bid.supplierName} como vencedor?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Este lance será marcado como vencedor e os demais lances enviados serão
                        rejeitados. Esta ação não pode ser desfeita e habilita a geração do pedido
                        de compra.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleSelect(bid.bidId)}>
                        Confirmar vencedor
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
