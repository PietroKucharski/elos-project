'use client'

import { useEffect } from 'react'

export default function WarehouseDetailError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[WarehouseDetailError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar o armazém. Tente recarregar a página.
    </div>
  )
}
