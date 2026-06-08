'use client'

import { useEffect } from 'react'

export default function ReceiptDetailError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[ReceiptDetailError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar recebimento. Tente recarregar a página.
    </div>
  )
}
