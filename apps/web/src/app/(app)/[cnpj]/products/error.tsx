'use client'

// apps/web/src/app/(app)/[cnpj]/products/error.tsx
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function ProductsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ProductsError]', error)
  }, [error])

  return (
    <div style={{ padding: '28px 32px', textAlign: 'center' }}>
      <p style={{ fontSize: 15, color: 'hsl(0 84% 60%)', marginBottom: 16 }}>
        Erro ao carregar produtos.
      </p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
