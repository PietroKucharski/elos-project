'use client'

// apps/web/src/components/domain/purchase-order-actions.tsx
// Botões de ação contextual por status. `receive` (SENT→RECEIVED) NÃO é exposto
// aqui — será acionado pelo módulo de Recebimentos (Fase 5).

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
import { approvePurchaseOrder, cancelPurchaseOrder, sendPurchaseOrder } from '@/lib/api'
import type { PurchaseOrderResponse } from '@elos/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  po: PurchaseOrderResponse
  cnpj: string
  canMutate: boolean
}

export function PurchaseOrderActions({ po, cnpj, canMutate }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    try {
      await approvePurchaseOrder(cnpj, po.id)
      toast.success('Pedido aprovado com sucesso.')
      router.refresh()
    } catch (error) {
      console.error('[PurchaseOrderActions.approve]', error)
      toast.error('Erro ao aprovar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    setLoading(true)
    try {
      await sendPurchaseOrder(cnpj, po.id)
      toast.success('Pedido enviado ao fornecedor.')
      router.refresh()
    } catch (error) {
      console.error('[PurchaseOrderActions.send]', error)
      toast.error('Erro ao enviar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    try {
      await cancelPurchaseOrder(cnpj, po.id)
      toast.success('Pedido cancelado.')
      router.refresh()
    } catch (error) {
      console.error('[PurchaseOrderActions.cancel]', error)
      toast.error('Erro ao cancelar pedido. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!canMutate) return null

  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {/* Aprovar (DRAFT → APPROVED) */}
      {po.status === 'DRAFT' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={loading}>
              Aprovar Pedido
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Aprovar pedido {po.number}?</AlertDialogTitle>
              <AlertDialogDescription>
                O pedido será aprovado e poderá ser enviado ao fornecedor na próxima etapa. Esta
                ação pode ser revertida via cancelamento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove}>Aprovar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Enviar (APPROVED → SENT) */}
      {po.status === 'APPROVED' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={loading}>
              Enviar ao Fornecedor
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Enviar pedido {po.number}?</AlertDialogTitle>
              <AlertDialogDescription>
                O pedido será marcado como enviado ao fornecedor <strong>{po.supplierName}</strong>.
                Após o envio, não é possível editar ou cancelar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSend}>Confirmar Envio</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Cancelar (DRAFT ou APPROVED) */}
      {(po.status === 'DRAFT' || po.status === 'APPROVED') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              className="border-destructive text-destructive hover:bg-destructive-soft"
            >
              Cancelar Pedido
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar pedido {po.number}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O pedido será cancelado e permanecerá no histórico
                com status Cancelado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Confirmar Cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
