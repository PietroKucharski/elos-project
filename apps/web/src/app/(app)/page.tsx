import { auth } from '@/lib/server-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/sign-in')

  // Fase 1: redirecionar para a empresa ativa do usuário
  // Por ora, exibe uma mensagem de boas-vindas
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Bem-vindo, {session.user.name}!</h1>
      <p className="text-sm text-muted-foreground">Selecione uma empresa para começar. (Fase 1)</p>
    </div>
  )
}
