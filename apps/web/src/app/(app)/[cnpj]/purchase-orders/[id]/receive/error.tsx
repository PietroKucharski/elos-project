'use client'

import { useEffect } from 'react'

export default function RegisterReceiptError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[RegisterReceiptError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar o formulário de recebimento. Tente recarregar a página.
    </div>
  )
}
