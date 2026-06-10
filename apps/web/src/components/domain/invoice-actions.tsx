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
import { Label } from '@/components/ui/label'
import { rejectInvoice, validateInvoice } from '@/lib/api'
import type { InvoiceStatus } from '@elos/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface InvoiceActionsProps {
  cnpj: string
  id: string
  status: InvoiceStatus
  canMutate: boolean // ANALISTA_FINANCEIRO / ADMIN_EMPRESA / SUPER_ADMIN
}

export function InvoiceActions({ cnpj, id, status, canMutate }: InvoiceActionsProps) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [dialog, setDialog] = useState<'validate' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)

  // rejectInvoiceSchema exige rejectionReason com no mínimo 5 caracteres.
  const MIN_REASON = 5

  async function handleAction() {
    if (!dialog) return
    if (dialog === 'reject' && reason.trim().length < MIN_REASON) {
      toast.error(`Informe o motivo (mínimo ${MIN_REASON} caracteres).`)
      return
    }

    setLoading(true)
    try {
      if (dialog === 'validate') {
        await validateInvoice(cnpj, id, {})
        toast.success('Nota fiscal validada.')
      } else {
        await rejectInvoice(cnpj, id, { rejectionReason: reason.trim() })
        toast.success('Nota fiscal rejeitada.')
      }
      router.refresh()
    } catch (error) {
      console.error('[InvoiceActions.handleAction]', error)
      toast.error('Erro ao atualizar a nota fiscal. Tente novamente.')
    } finally {
      setLoading(false)
      setDialog(null)
      setReason('')
    }
  }

  if (!canMutate || status !== 'PENDING') return null

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={() => setDialog('validate')}>Validar</Button>
        <Button
          variant="outline"
          onClick={() => setDialog('reject')}
          className="text-destructive border-destructive hover:bg-destructive/10"
        >
          Rejeitar
        </Button>
      </div>

      <AlertDialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === 'validate' ? 'Validar nota fiscal?' : 'Rejeitar nota fiscal'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === 'validate'
                ? 'A NF será marcada como validada e liberada para pagamento.'
                : 'Informe o motivo da rejeição da nota fiscal.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {dialog === 'reject' && (
            <div className="space-y-2 my-2">
              <Label htmlFor="rejectionReason">Motivo da rejeição *</Label>
              <textarea
                id="rejectionReason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={`Mínimo ${MIN_REASON} caracteres…`}
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <Button
              onClick={handleAction}
              disabled={loading}
              variant={dialog === 'reject' ? 'destructive' : 'default'}
            >
              {loading ? 'Aguarde…' : 'Confirmar'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
