// apps/web/src/components/domain/approve-supplier-dialog.tsx
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
import { approveSupplier } from '@/lib/api'
import { useState } from 'react'
import { toast } from 'sonner'

interface ApproveSupplierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cnpj: string
  supplierId: string
  supplierName: string
  onApproved?: () => void
}

export function ApproveSupplierDialog({
  open,
  onOpenChange,
  cnpj,
  supplierId,
  supplierName,
  onApproved,
}: ApproveSupplierDialogProps) {
  const [rating, setRating] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    try {
      await approveSupplier(cnpj, supplierId, {
        rating: rating ? Number(rating) : undefined,
      })
      toast.success(`${supplierName} aprovado com sucesso.`)
      onApproved?.()
      onOpenChange(false)
    } catch (error) {
      console.error('[ApproveSupplierDialog.handleApprove]', error)
      toast.error('Erro ao aprovar fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Aprovar fornecedor</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja aprovar <strong>{supplierName}</strong>? O fornecedor poderá ser
            vinculado a produtos e convidado para cotações.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div style={{ padding: '0 0 8px' }}>
          <label
            htmlFor="approve-rating"
            style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
          >
            Avaliação inicial (1–5, opcional)
          </label>
          <input
            id="approve-rating"
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="Ex: 4"
            style={{
              width: 80,
              height: 36,
              padding: '0 10px',
              fontSize: 13,
              border: '1px solid hsl(214 32% 91%)',
              borderRadius: '0.375rem',
            }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            disabled={loading}
            style={{ background: 'hsl(142 71% 45%)', color: 'white' }}
          >
            {loading ? 'Aprovando...' : 'Aprovar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
