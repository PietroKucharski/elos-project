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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Shell simplificada para área de plataforma — sem sidebar de empresa */}
      <header
        style={{
          height: 64,
          flexShrink: 0,
          background: 'hsl(0 0% 100%)',
          borderBottom: '1px solid hsl(214 32% 91%)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 14,
        }}
      >
        <Logo size={18} />
        <div style={{ width: 1, height: 26, background: 'hsl(214 32% 91%)' }} />
        <span style={{ fontSize: 13.5, color: 'hsl(215 16% 47%)' }}>
          Administração da Plataforma
        </span>
      </header>
      <main style={{ flex: 1, overflowY: 'auto', background: 'hsl(210 40% 98%)' }}>
        <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }}>{children}</div>
      </main>
    </div>
  )
}
