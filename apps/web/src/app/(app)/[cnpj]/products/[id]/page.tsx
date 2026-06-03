// apps/web/src/app/(app)/[cnpj]/products/[id]/page.tsx
import { ProductSuppliersPanel } from '@/components/domain/product-suppliers-panel'
import { Button } from '@/components/ui/button'
import { getMyCompaniesServer, getProductServer, getSuppliersServer } from '@/lib/api'
import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

const UNIT_LABELS: Record<string, string> = {
  UN: 'UN',
  KG: 'KG',
  G: 'G',
  L: 'L',
  ML: 'ML',
  M: 'M',
  M2: 'M²',
  M3: 'M³',
  CX: 'CX',
  PC: 'PC',
}

export default async function ProductDetailPage({ params }: Props) {
  const { cnpj, id } = await params

  const [product, approvedSuppliers, myCompanies] = await Promise.all([
    getProductServer(cnpj, id),
    // Fornecedores aprovados disponíveis para vínculo
    getSuppliersServer(cnpj, { status: 'APPROVED' }),
    getMyCompaniesServer(),
  ])

  if (!product) notFound()

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)

  return (
    <div className="max-w-[960px]">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-foreground">{product.name}</h1>
            {!product.isActive && (
              <span className="rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Inativo
              </span>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground">
            {product.code && `Código: ${product.code} · `}
            Unidade: {UNIT_LABELS[product.unit] ?? product.unit}
            {product.minStock && ` · Estoque mínimo: ${product.minStock}`}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/products/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
          </Link>
        )}
      </div>

      {/* Descrição */}
      {product.description && (
        <div className="mb-6 rounded-lg border border-border bg-card p-5">
          <p className="mb-1.5 text-xs text-muted-foreground">Descrição</p>
          <p className="text-sm whitespace-pre-wrap text-foreground">{product.description}</p>
        </div>
      )}

      {/* Painel de fornecedores */}
      <ProductSuppliersPanel
        cnpj={cnpj}
        productId={id}
        initialLinks={product.suppliers ?? []}
        availableSuppliers={approvedSuppliers}
        canMutate={canMutate}
      />
    </div>
  )
}
