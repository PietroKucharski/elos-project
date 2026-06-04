'use client'

// apps/web/src/app/(app)/[cnpj]/purchase-orders/error.tsx
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function PurchaseOrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[PurchaseOrdersError]', error)
  }, [error])

  return (
    <div className="px-8 py-7 text-center">
      <p className="mb-4 text-[15px] text-destructive">Erro ao carregar pedidos de compra.</p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
