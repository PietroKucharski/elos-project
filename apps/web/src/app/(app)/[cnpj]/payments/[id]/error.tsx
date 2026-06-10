'use client'

import { useEffect } from 'react'

export default function PaymentDetailError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[PaymentDetailError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar o pagamento. Tente recarregar a página.
    </div>
  )
}
