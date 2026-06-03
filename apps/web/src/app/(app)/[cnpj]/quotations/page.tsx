// apps/web/src/app/(app)/[cnpj]/quotations/page.tsx
import { QuotationsListClient } from '@/components/domain/quotations-list-client'
import { Button } from '@/components/ui/button'
import { getMyCompaniesServer, getQuotationsServer } from '@/lib/api'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface Props {
  params: Promise<{ cnpj: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function QuotationsPage({ params }: Props) {
  const { cnpj } = await params

  const [quotations, myCompanies] = await Promise.all([
    getQuotationsServer(cnpj),
    getMyCompaniesServer(),
  ])

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-foreground">Cotações</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Gerencie cotações de compra e convide fornecedores para enviar lances.
          </p>
        </div>
        {canMutate && (
          <Link href={`/${cnpj}/quotations/new`}>
            <Button>
              <Plus className="mr-1.5 h-[15px] w-[15px]" />
              Nova cotação
            </Button>
          </Link>
        )}
      </div>

      <QuotationsListClient cnpj={cnpj} quotations={quotations} canMutate={canMutate} />
    </div>
  )
}
