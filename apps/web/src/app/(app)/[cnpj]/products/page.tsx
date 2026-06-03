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
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Produtos</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Catálogo de produtos de {company?.name ?? cnpj}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/products/new`}>
            <Button>
              <Plus className="mr-1.5 h-[15px] w-[15px]" />
              Novo produto
            </Button>
          </Link>
        )}
      </div>

      <ProductsListClient initialProducts={products} cnpj={cnpj} canMutate={canMutate} />
    </div>
  )
}
