'use client'

import { useEffect } from 'react'

export default function AuditLogDetailError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[AuditLogDetailError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar o registro de auditoria. Tente recarregar a página.
    </div>
  )
}
