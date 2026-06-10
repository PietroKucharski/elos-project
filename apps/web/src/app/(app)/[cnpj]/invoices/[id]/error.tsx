'use client'

import { useEffect } from 'react'

export default function InvoiceDetailError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[InvoiceDetailError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar a nota fiscal. Tente recarregar a página.
    </div>
  )
}
