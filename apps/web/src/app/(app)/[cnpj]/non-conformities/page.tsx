import { NonConformitiesListClient } from '@/components/domain/non-conformities-list-client'
import { Button } from '@/components/ui/button'
import { getMyCompaniesServer, getNonConformitiesServer } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'

const CREATE_ROLES = ['ADMIN_EMPRESA', 'ALMOXARIFE', 'SUPER_ADMIN']

export default async function NonConformitiesPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = await params
  const [myCompanies, ncs] = await Promise.all([
    getMyCompaniesServer(),
    getNonConformitiesServer(cnpj),
  ])

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? null
  const canCreate = role !== null && CREATE_ROLES.includes(role)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Não-Conformidades</h1>
        {canCreate && (
          <Button asChild>
            <Link href={`/${cnpj}/non-conformities/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Abrir NC
            </Link>
          </Button>
        )}
      </div>
      <NonConformitiesListClient cnpj={cnpj} nonConformities={ncs} canCreate={canCreate} />
    </div>
  )
}
