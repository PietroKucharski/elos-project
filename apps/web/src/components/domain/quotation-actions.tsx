'use client'

// apps/web/src/components/domain/quotation-actions.tsx

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
import { cancelQuotation, closeQuotation, publishQuotation } from '@/lib/api'
import type { QuotationResponse } from '@elos/shared'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface QuotationActionsProps {
  cnpj: string
  quotation: QuotationResponse
}

export function QuotationActions({ cnpj, quotation }: QuotationActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handlePublish() {
    setLoading(true)
    try {
      await publishQuotation(cnpj, quotation.id)
      toast.success('Cotação publicada. Fornecedores podem enviar lances.')
      router.refresh()
    } catch (error) {
      console.error('[QuotationActions.handlePublish]', error)
      toast.error('Erro ao publicar cotação. Verifique se há itens e fornecedores.')
    } finally {
      setLoading(false)
    }
  }

  async function handleClose() {
    setLoading(true)
    try {
      await closeQuotation(cnpj, quotation.id)
      toast.success('Cotação fechada. Selecione o lance vencedor.')
      router.push(`/${cnpj}/quotations/${quotation.id}/bids`)
      router.refresh()
    } catch (error) {
      console.error('[QuotationActions.handleClose]', error)
      toast.error('Erro ao fechar cotação.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    setLoading(true)
    try {
      await cancelQuotation(cnpj, quotation.id)
      toast.success('Cotação cancelada.')
      router.push(`/${cnpj}/quotations`)
      router.refresh()
    } catch (error) {
      console.error('[QuotationActions.handleCancel]', error)
      toast.error('Erro ao cancelar cotação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      {quotation.status === 'DRAFT' && (
        <>
          <Link href={`/${cnpj}/quotations/${quotation.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
          </Link>
          <Button size="sm" onClick={handlePublish} disabled={loading}>
            Publicar Cotação
          </Button>
        </>
      )}

      {quotation.status === 'OPEN' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={loading}>
              Fechar Recebimento
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Fechar recebimento de lances?</AlertDialogTitle>
              <AlertDialogDescription>
                Nenhum novo lance poderá ser enviado após este ponto. Você poderá comparar os lances
                e selecionar o vencedor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleClose}>Fechar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {(quotation.status === 'DRAFT' || quotation.status === 'OPEN') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              className="border-destructive text-destructive hover:bg-destructive-soft"
            >
              Cancelar Cotação
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar esta cotação?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Todos os lances associados serão marcados como
                rejeitados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Cancelar Cotação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
