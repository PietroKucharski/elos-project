import { PaymentsListClient } from '@/components/domain/payments-list-client'
import { getMyCompaniesServer, getPaymentsServer } from '@/lib/api'

const MUTATE_ROLES = ['SUPER_ADMIN', 'ADMIN_EMPRESA', 'ANALISTA_FINANCEIRO']

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = await params
  const [myCompanies, payments] = await Promise.all([
    getMyCompaniesServer(),
    getPaymentsServer(cnpj),
  ])

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  const canMutate = role !== null && MUTATE_ROLES.includes(role)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Pagamentos</h1>
      </div>
      <PaymentsListClient cnpj={cnpj} payments={payments} canMutate={canMutate} />
    </div>
  )
}
