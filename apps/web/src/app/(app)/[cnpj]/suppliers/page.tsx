// apps/web/src/app/(app)/[cnpj]/suppliers/page.tsx
import { SuppliersListClient } from '@/components/domain/suppliers-list-client'
import { Button } from '@/components/ui/button'
import { getCompanyServer, getMyCompaniesServer, getSuppliersServer } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ cnpj: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function SuppliersPage({ params }: Props) {
  const { cnpj } = await params

  const [suppliers, company, myCompanies] = await Promise.all([
    getSuppliersServer(cnpj),
    getCompanyServer(cnpj),
    getMyCompaniesServer(),
  ])

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Fornecedores</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Gerencie os fornecedores de {company?.name ?? cnpj}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/suppliers/new`}>
            <Button>
              <Plus className="mr-1.5 h-[15px] w-[15px]" />
              Novo fornecedor
            </Button>
          </Link>
        )}
      </div>

      <SuppliersListClient initialSuppliers={suppliers} cnpj={cnpj} canMutate={canMutate} />
    </div>
  )
}
