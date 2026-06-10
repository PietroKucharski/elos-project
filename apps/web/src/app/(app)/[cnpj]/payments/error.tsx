'use client'

import { useEffect } from 'react'

export default function PaymentsError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[PaymentsError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar os pagamentos. Tente recarregar a página.
    </div>
  )
}
