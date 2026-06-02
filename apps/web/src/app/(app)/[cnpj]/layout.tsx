import { Sidebar } from '@/components/domain/sidebar'
import { Topbar } from '@/components/domain/topbar'
import { getCompanyServer, getMyCompaniesServer } from '@/lib/api'
import { auth } from '@/lib/server-auth'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

interface Props {
  children: React.ReactNode
  params: Promise<{ cnpj: string }>
}

export default async function CompanyLayout({ children, params }: Props) {
  const { cnpj } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const [company, myCompanies] = await Promise.all([getCompanyServer(cnpj), getMyCompaniesServer()])

  if (!company) notFound()

  const membership = myCompanies.find((c) => c.cnpj === cnpj)
  if (!membership) notFound() // AuthGuard da API já garantiu acesso; isso é proteção extra no SSR

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar
        companyName={company.name}
        companyCnpj={cnpj}
        myCompanies={myCompanies}
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar cnpj={cnpj} role={membership.role} />
        <main style={{ flex: 1, overflowY: 'auto', background: 'hsl(210 40% 98%)' }}>
          <div style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }} className="page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
