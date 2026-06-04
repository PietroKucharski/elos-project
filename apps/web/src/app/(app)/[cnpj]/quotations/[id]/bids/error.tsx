'use client'

// apps/web/src/app/(app)/[cnpj]/quotations/[id]/bids/error.tsx
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function BidsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[BidsError]', error)
  }, [error])

  return (
    <div className="px-8 py-7 text-center">
      <p className="mb-4 text-[15px] text-destructive">Erro ao carregar os lances.</p>
      <Button variant="outline" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  )
}
