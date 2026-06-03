'use client'

// apps/web/src/app/(app)/[cnpj]/quotations/error.tsx
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function QuotationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[QuotationsError]', error)
  }, [error])

  return (
    <div className="px-8 py-7 text-center">
      <p className="mb-4 text-[15px] text-destructive">Erro ao carregar cotações.</p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
