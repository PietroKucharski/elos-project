import { Logo } from '@/components/domain/logo'
import { getMyCompaniesServer } from '@/lib/api'
import { auth } from '@/lib/server-auth'
// apps/web/src/app/(app)/admin/layout.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, companies] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getMyCompaniesServer(),
  ])

  if (!session) redirect('/sign-in')

  const isSuperAdmin = companies.some((c) => c.role === 'SUPER_ADMIN')
  if (!isSuperAdmin) redirect('/')

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Shell simplificada para área de plataforma — sem sidebar de empresa */}
      <header className="flex h-16 shrink-0 items-center gap-3.5 border-b border-border bg-card px-5">
        <Logo size={18} />
        <div className="h-[26px] w-px bg-border" />
        <span className="text-[13.5px] text-muted-foreground">Administração da Plataforma</span>
      </header>
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-[1320px] p-6">{children}</div>
      </main>
    </div>
  )
}
