import { auth } from '@/lib/server-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/sign-in')
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Topbar — implementado na Fase 1 */}
      <header className="h-16 border-b bg-card flex items-center px-6">
        <span className="font-semibold text-primary">Elos</span>
        <span className="ml-auto text-sm text-muted-foreground">{session.user.name}</span>
      </header>

      {/* Shell principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — implementado na Fase 1 */}
        <aside className="w-60 border-r bg-background hidden lg:block" />

        {/* Área de conteúdo */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">{children}</main>
      </div>
    </div>
  )
}
