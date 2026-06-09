import { NonConformityForm } from '@/components/domain/non-conformity-form'
import { Button } from '@/components/ui/button'
import { getSuppliersServer } from '@/lib/api'
import Link from 'next/link'

export default async function NewNcPage({
  params,
  searchParams,
}: {
  params: Promise<{ cnpj: string }>
  searchParams?: Promise<{ purchaseOrderId?: string }>
}) {
  const { cnpj } = await params
  const sp = await searchParams
  const poId = sp?.purchaseOrderId
  const [suppliers] = await Promise.all([getSuppliersServer(cnpj, { status: 'APPROVED' })])

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Abrir Não-Conformidade</h1>
      {suppliers.length === 0 ? (
        <div className="max-w-xl space-y-4 rounded-lg border bg-muted/30 p-6">
          <p className="text-sm text-muted-foreground">
            Nenhum fornecedor aprovado disponível. Aprove um fornecedor antes de abrir uma
            não-conformidade.
          </p>
          <Button asChild variant="outline">
            <Link href={`/${cnpj}/suppliers`}>Ir para Fornecedores</Link>
          </Button>
        </div>
      ) : (
        <NonConformityForm cnpj={cnpj} suppliers={suppliers} purchaseOrderId={poId} />
      )}
    </div>
  )
}
