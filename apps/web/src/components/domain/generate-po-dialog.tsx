'use client'

// apps/web/src/components/domain/generate-po-dialog.tsx
// Confirma a geração de um pedido de compra a partir do lance vencedor.
// Exibido no card "Lance Vencedor" do detalhe da cotação (CLOSED + lance SELECTED).

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
import { createPurchaseOrder } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface Props {
  cnpj: string
  bidId: string
  supplierName: string
  totalPrice: string
}

export function GeneratePODialog({ cnpj, bidId, supplierName, totalPrice }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleGenerate() {
    setIsLoading(true)
    try {
      const po = await createPurchaseOrder(cnpj, { bidId })
      toast.success(`Pedido ${po.number} gerado com sucesso.`)
      router.push(`/${cnpj}/purchase-orders/${po.id}`)
    } catch (error) {
      console.error('[GeneratePODialog.handleGenerate]', error)
      toast.error('Erro ao gerar pedido de compra. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm">Gerar Pedido de Compra</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Gerar Pedido de Compra?</AlertDialogTitle>
          <AlertDialogDescription>
            Um pedido de compra em rascunho será gerado para <strong>{supplierName}</strong> com o
            valor total de{' '}
            <strong>
              {Number(totalPrice).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </strong>
            . Você poderá revisar os itens e aprovar antes de enviar ao fornecedor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? 'Gerando...' : 'Gerar Pedido'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
