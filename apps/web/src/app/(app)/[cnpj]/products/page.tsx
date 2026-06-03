// apps/web/src/app/(app)/[cnpj]/products/page.tsx
import { ProductsListClient } from '@/components/domain/products-list-client'
import { Button } from '@/components/ui/button'
import { getCompanyServer, getMyCompaniesServer, getProductsServer } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ cnpj: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function ProductsPage({ params }: Props) {
  const { cnpj } = await params

  // A API filtra por isActive (default true). Buscamos ativos e inativos para
  // permitir alternar o filtro client-side sem novo round-trip.
  const [activeProducts, inactiveProducts, company, myCompanies] = await Promise.all([
    getProductsServer(cnpj, { isActive: 'true' }),
    getProductsServer(cnpj, { isActive: 'false' }),
    getCompanyServer(cnpj),
    getMyCompaniesServer(),
  ])

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)

  const products = [...activeProducts, ...inactiveProducts]

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
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>Produtos</h1>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 4 }}>
            Catálogo de produtos de {company?.name ?? cnpj}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/products/new`}>
            <Button>
              <Plus style={{ width: 15, height: 15, marginRight: 6 }} />
              Novo produto
            </Button>
          </Link>
        )}
      </div>

      <ProductsListClient initialProducts={products} cnpj={cnpj} canMutate={canMutate} />
    </div>
  )
}
