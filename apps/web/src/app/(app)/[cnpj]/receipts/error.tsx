'use client'

import { useEffect } from 'react'

export default function ReceiptsError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[ReceiptsError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar recebimentos. Tente recarregar a página.
    </div>
  )
}
