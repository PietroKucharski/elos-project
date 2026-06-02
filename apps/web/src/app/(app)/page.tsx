import { getMyCompaniesServer } from '@/lib/api'
import { auth } from '@/lib/server-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AppIndexPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/sign-in')

  const companies = await getMyCompaniesServer()
  if (companies.length === 0) redirect('/no-company')

  redirect(`/${companies[0]!.cnpj}/dashboard`)
}
