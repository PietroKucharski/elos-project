// apps/web/src/app/(app)/[cnpj]/suppliers/page.tsx
import { CreateSupplierSheet } from '@/components/domain/create-supplier-sheet'
import { SuppliersListClient } from '@/components/domain/suppliers-list-client'
import { getMyCompaniesServer, getSuppliersServer } from '@/lib/api'

interface Props {
  params: Promise<{ cnpj: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function SuppliersPage({ params }: Props) {
  const { cnpj } = await params

  const [suppliers, myCompanies] = await Promise.all([
    getSuppliersServer(cnpj),
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
            Cadastro, aprovação e avaliação de fornecedores da empresa.
          </p>
        </div>
        {canMutate && <CreateSupplierSheet cnpj={cnpj} />}
      </div>

      <SuppliersListClient initialSuppliers={suppliers} cnpj={cnpj} canMutate={canMutate} />
    </div>
  )
}
