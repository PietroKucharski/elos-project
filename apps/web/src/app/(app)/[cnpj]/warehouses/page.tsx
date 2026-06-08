import { WarehousesListClient } from '@/components/domain/warehouses-list-client'
import { Button } from '@/components/ui/button'
import { getMyCompaniesServer, getWarehousesServer } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'

const MUTATE_ROLES = ['ADMIN_EMPRESA', 'ALMOXARIFE', 'SUPER_ADMIN']

export default async function WarehousesPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = await params
  const [myCompanies, warehouses] = await Promise.all([
    getMyCompaniesServer(),
    getWarehousesServer(cnpj, { includeInactive: 'true' }),
  ])

  const membership = myCompanies.find((c) => c.cnpj === cnpj)
  const role = membership?.role ?? null
  const canMutate = role !== null && MUTATE_ROLES.includes(role)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Armazéns</h1>
        {canMutate && (
          <Button asChild>
            <Link href={`/${cnpj}/warehouses/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Armazém
            </Link>
          </Button>
        )}
      </div>

      <WarehousesListClient cnpj={cnpj} warehouses={warehouses} canMutate={canMutate} />
    </div>
  )
}
