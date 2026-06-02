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
    <div
      style={{
        display: 'flex',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div
          style={{
            background: 'hsl(0 86% 97%)',
            border: '1px solid hsl(0 80% 89%)',
            borderRadius: '0.5rem',
            padding: '14px 16px',
            display: 'flex',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <AlertCircle
            size={18}
            strokeWidth={1.6}
            style={{ color: 'hsl(0 72% 51%)', flexShrink: 0, marginTop: 1 }}
          />
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'hsl(222 47% 11%)',
                marginBottom: 4,
              }}
            >
              Erro ao carregar a página
            </div>
            <div style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
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
