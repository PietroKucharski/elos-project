'use client'

import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { useEffect } from 'react'

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[CompanyError]', error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-4 flex gap-3 rounded-lg border border-destructive-border bg-destructive-soft px-4 py-3.5">
          <AlertCircle size={18} strokeWidth={1.6} className="mt-px shrink-0 text-destructive" />
          <div>
            <div className="mb-1 text-sm font-semibold text-foreground">
              Erro ao carregar a página
            </div>
            <div className="text-[13px] text-muted-foreground">
              Ocorreu um problema inesperado. Tente novamente ou entre em contato com o suporte.
            </div>
          </div>
        </div>
        <Button onClick={reset} variant="outline" className="w-full">
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
