'use client'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cancelPayment } from '@/lib/api'
import type { PaymentStatus } from '@elos/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface PaymentActionsProps {
  cnpj: string
  id: string
  status: PaymentStatus
  canMutate: boolean // ANALISTA_FINANCEIRO / ADMIN_EMPRESA / SUPER_ADMIN
}

export function PaymentActions({ cnpj, id, status, canMutate }: PaymentActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    setLoading(true)
    try {
      await cancelPayment(cnpj, id)
      toast.success('Pagamento cancelado.')
      router.refresh()
    } catch (error) {
      console.error('[PaymentActions.handleCancel]', error)
      toast.error('Erro ao cancelar o pagamento. Tente novamente.')
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  if (!canMutate || status !== 'PENDING') return null

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-destructive border-destructive hover:bg-destructive/10"
      >
        Cancelar Pagamento
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento será marcado como cancelado. Esta ação não pode ser desfeita e só é
              permitida se nenhuma parcela tiver sido paga.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Voltar</AlertDialogCancel>
            <Button onClick={handleCancel} disabled={loading} variant="destructive">
              {loading ? 'Aguarde…' : 'Cancelar pagamento'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
