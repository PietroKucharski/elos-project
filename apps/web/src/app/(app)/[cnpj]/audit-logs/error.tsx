'use client'

import { useEffect } from 'react'

export default function AuditLogsError({ error }: { error: Error }) {
  useEffect(() => {
    console.error('[AuditLogsError]', error)
  }, [error])
  return (
    <div className="p-6 text-destructive text-sm">
      Erro ao carregar os registros de auditoria. Tente recarregar a página.
    </div>
  )
}
