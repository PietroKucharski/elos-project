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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Fornecedores</h1>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
            Gerencie os fornecedores de {company?.name ?? cnpj}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/suppliers/new`}>
            <Button>
              <Plus style={{ width: 15, height: 15, marginRight: 6 }} />
              Novo fornecedor
            </Button>
          </Link>
        )}
      </div>

      <SuppliersListClient initialSuppliers={suppliers} cnpj={cnpj} canMutate={canMutate} />
    </div>
  )
}
