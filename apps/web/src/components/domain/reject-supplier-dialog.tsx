// apps/web/src/components/domain/reject-supplier-dialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { rejectSupplier } from '@/lib/api'
import { useState } from 'react'
import { toast } from 'sonner'

interface RejectSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cnpj: string
  supplierId: string
  supplierName: string
  onRejected?: () => void
}

export function RejectSupplierDialog({
  open,
  onOpenChange,
  cnpj,
  supplierId,
  supplierName,
  onRejected,
}: RejectSupplierDialogProps) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleReject(event: React.MouseEvent<HTMLButtonElement>) {
    // Impede o auto-close padrão do Radix — sem isso o dialog fecharia mesmo
    // quando a validação abaixo barra o envio (motivo < 5 caracteres).
    event.preventDefault()
    if (notes.trim().length < 5) {
      toast.error('Informe o motivo da rejeição (mínimo 5 caracteres).')
      return
    }
    setLoading(true)
    try {
      await rejectSupplier(cnpj, supplierId, { notes: notes.trim() })
      toast.success(`${supplierName} rejeitado.`)
      onRejected?.()
      onOpenChange(false)
    } catch (error) {
      console.error('[RejectSupplierDialog.handleReject]', error)
      toast.error('Erro ao rejeitar fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rejeitar fornecedor</AlertDialogTitle>
          <AlertDialogDescription>
            Informe o motivo da rejeição de <strong>{supplierName}</strong>. Este campo será salvo
            para rastreabilidade.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="pb-2">
          <label htmlFor="reject-notes" className="mb-1.5 block text-[13px] font-medium">
            Motivo da rejeição *
          </label>
          <textarea
            id="reject-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo..."
            className="w-full resize-y rounded-md border border-input px-3 py-2 text-[13px]"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={loading}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {loading ? 'Rejeitando...' : 'Rejeitar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
