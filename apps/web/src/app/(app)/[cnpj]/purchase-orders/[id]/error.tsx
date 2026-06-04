'use client'

// apps/web/src/app/(app)/[cnpj]/purchase-orders/[id]/error.tsx
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function PurchaseOrderDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PurchaseOrderDetailError]', error)
  }, [error])

  return (
    <div className="px-8 py-7 text-center">
      <p className="mb-4 text-[15px] text-destructive">Erro ao carregar pedido de compra.</p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
