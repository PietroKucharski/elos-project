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
    <div style={{ maxWidth: 960 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
              {product.name}
            </h1>
            {!product.isActive && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  background: 'hsl(214 32% 91%)',
                  color: 'hsl(215 16% 47%)',
                }}
              >
                Inativo
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
            {product.code && `Código: ${product.code} · `}
            Unidade: {UNIT_LABELS[product.unit] ?? product.unit}
            {product.minStock && ` · Estoque mínimo: ${product.minStock}`}
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/products/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil style={{ width: 14, height: 14, marginRight: 6 }} />
              Editar
            </Button>
          </Link>
        )}
      </div>

      {/* Descrição */}
      {product.description && (
        <div
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            border: '1px solid hsl(214 32% 91%)',
            padding: 20,
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 12, color: 'hsl(215 16% 47%)', marginBottom: 6 }}>Descrição</p>
          <p style={{ fontSize: 14, color: 'hsl(222 47% 11%)', whiteSpace: 'pre-wrap' }}>
            {product.description}
          </p>
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
