'use client'

import { useEffect } from 'react'

export default function WarehousesError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[WarehousesError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar armazéns. Tente recarregar a página.
    </div>
  )
}
