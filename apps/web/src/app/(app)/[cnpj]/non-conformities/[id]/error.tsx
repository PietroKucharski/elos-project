'use client'

import { useEffect } from 'react'

export default function NcDetailError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[NcDetailError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar a não-conformidade. Tente recarregar a página.
    </div>
  )
}
