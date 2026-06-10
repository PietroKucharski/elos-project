'use client'

import { useEffect } from 'react'

export default function InvoicesError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[InvoicesError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar as notas fiscais. Tente recarregar a página.
    </div>
  )
}
