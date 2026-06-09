'use client'

import { useEffect } from 'react'

export default function NonConformitiesError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[NonConformitiesError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar não-conformidades. Tente recarregar a página.
    </div>
  )
}
