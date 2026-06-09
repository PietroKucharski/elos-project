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
import { analyzeNonConformity, rejectNonConformity, resolveNonConformity } from '@/lib/api'
import type { NonConformityStatus } from '@elos/shared'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface NcActionsProps {
  cnpj: string
  id: string
  status: NonConformityStatus
  canAct: boolean // COMPRADOR / ADMIN_EMPRESA / SUPER_ADMIN
}

export function NcActions({ cnpj, id, status, canAct }: NcActionsProps) {
  const router = useRouter()
  const [resolution, setResolution] = useState('')
  const [dialog, setDialog] = useState<'analyze' | 'resolve' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)

  // resolveNcSchema exige resolução com no mínimo 10 caracteres; rejectNcSchema, 5.
  const minResolution = dialog === 'resolve' ? 10 : 5

  async function handleAction() {
    if (!dialog) return
    if ((dialog === 'resolve' || dialog === 'reject') && resolution.trim().length < minResolution) {
      toast.error(`Informe o motivo (mínimo ${minResolution} caracteres).`)
      return
    }

    setLoading(true)
    try {
      if (dialog === 'analyze') {
        await analyzeNonConformity(cnpj, id)
        toast.success('NC enviada para análise.')
      } else if (dialog === 'resolve') {
        await resolveNonConformity(cnpj, id, { resolution: resolution.trim() })
        toast.success('NC resolvida.')
      } else {
        await rejectNonConformity(cnpj, id, { resolution: resolution.trim() })
        toast.success('NC rejeitada.')
      }
      router.refresh()
    } catch (error) {
      console.error('[NcActions.handleAction]', error)
      toast.error('Erro ao atualizar a NC. Tente novamente.')
    } finally {
      setLoading(false)
      setDialog(null)
      setResolution('')
    }
  }

  if (!canAct) return null

  return (
    <>
      <div className="flex gap-2">
        {status === 'OPEN' && (
          <Button variant="outline" onClick={() => setDialog('analyze')}>
            Iniciar Análise
          </Button>
        )}
        {status === 'ANALYZING' && (
          <>
            <Button onClick={() => setDialog('resolve')}>Resolver</Button>
            <Button
              variant="outline"
              onClick={() => setDialog('reject')}
              className="text-destructive border-destructive hover:bg-destructive/10"
            >
              Rejeitar
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === 'analyze' && 'Iniciar análise da NC?'}
              {dialog === 'resolve' && 'Resolver não-conformidade'}
              {dialog === 'reject' && 'Rejeitar não-conformidade'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialog === 'analyze' && 'A NC será movida para o status "Em Análise".'}
              {dialog === 'resolve' && 'Descreva como o problema foi resolvido.'}
              {dialog === 'reject' && 'Informe o motivo da rejeição da NC.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {(dialog === 'resolve' || dialog === 'reject') && (
            <div className="space-y-2 my-2">
              <Label htmlFor="resolution">
                {dialog === 'resolve' ? 'Resolução *' : 'Motivo da rejeição *'}
              </Label>
              <textarea
                id="resolution"
                rows={3}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder={`Mínimo ${minResolution} caracteres…`}
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
