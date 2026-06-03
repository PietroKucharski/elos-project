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

  async function handleReject() {
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
        <div style={{ padding: '0 0 8px' }}>
          <label
            htmlFor="reject-notes"
            style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
          >
            Motivo da rejeição *
          </label>
          <textarea
            id="reject-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Descreva o motivo..."
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 13,
              resize: 'vertical',
              border: '1px solid hsl(214 32% 91%)',
              borderRadius: '0.375rem',
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReject}
            disabled={loading}
            style={{ background: 'hsl(0 84% 60%)', color: 'white' }}
          >
            {loading ? 'Rejeitando...' : 'Rejeitar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
