import { InvoicesListClient } from '@/components/domain/invoices-list-client'
import { Button } from '@/components/ui/button'
import { getInvoicesServer, getMyCompaniesServer } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'

const MUTATE_ROLES = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ANALISTA_FINANCEIRO']

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = await params
  const [myCompanies, invoices] = await Promise.all([
    getMyCompaniesServer(),
    getInvoicesServer(cnpj),
  ])

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  const canMutate = role !== null && MUTATE_ROLES.includes(role)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Notas Fiscais</h1>
        {canMutate && (
          <Button asChild>
            <Link href={`/${cnpj}/invoices/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar NF
            </Link>
          </Button>
        )}
      </div>
      <InvoicesListClient cnpj={cnpj} invoices={invoices} canMutate={canMutate} />
    </div>
  )
}
