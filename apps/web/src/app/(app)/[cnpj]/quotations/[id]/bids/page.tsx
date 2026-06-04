// apps/web/src/app/(app)/[cnpj]/quotations/[id]/bids/page.tsx
import { BidComparison } from '@/components/domain/bid-comparison'
import { BidsManager } from '@/components/domain/bids-manager'
import { QuotationStatusBadge } from '@/components/domain/quotation-status-badge'
import {
  getBidComparisonServer,
  getBidItemsServer,
  getBidsServer,
  getMyCompaniesServer,
  getQuotationItemsServer,
  getQuotationServer,
  getQuotationSuppliersServer,
} from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

// Conteúdo do estado OPEN: gestão de lances (criar, cotar itens, submeter)
async function OpenBids({ cnpj, id, canEdit }: { cnpj: string; id: string; canEdit: boolean }) {
  const [items, invites, bids] = await Promise.all([
    getQuotationItemsServer(cnpj, id),
    getQuotationSuppliersServer(cnpj, id),
    getBidsServer(cnpj, id),
  ])

  const bidsWithItems = await Promise.all(
    bids.map(async (bid) => ({ ...bid, items: await getBidItemsServer(cnpj, id, bid.id) })),
  )

  return (
    <BidsManager
      cnpj={cnpj}
      quotationId={id}
      initialBids={bidsWithItems}
      quotationItems={items}
      invitedSuppliers={invites}
      canEdit={canEdit}
    />
  )
}

// Conteúdo do estado CLOSED: comparativo (matrix) + seleção de vencedor
async function ClosedBids({
  cnpj,
  id,
  canMutate,
}: {
  cnpj: string
  id: string
  canMutate: boolean
}) {
  const comparison = await getBidComparisonServer(cnpj, id)

  return (
    <BidComparison
      cnpj={cnpj}
      quotationId={id}
      comparison={comparison ?? { quotationId: id, bids: [], rows: [] }}
      canMutate={canMutate}
    />
  )
}

export default async function BidsPage({ params }: Props) {
  const { cnpj, id } = await params

  const [quotation, myCompanies] = await Promise.all([
    getQuotationServer(cnpj, id),
    getMyCompaniesServer(),
  ])

  if (!quotation) notFound()

  // Lances só fazem sentido para cotações OPEN (recebimento) ou CLOSED (comparativo)
  if (quotation.status !== 'OPEN' && quotation.status !== 'CLOSED') {
    redirect(`/${cnpj}/quotations/${id}`)
  }

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)
  const isOpen = quotation.status === 'OPEN'

  return (
    <div className="max-w-[1100px]">
      <Link
        href={`/${cnpj}/quotations/${id}`}
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground no-underline transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para a cotação
      </Link>

      <div className="mb-8">
        <div className="mb-1.5 flex items-center gap-3">
          <span className="font-mono text-[13px] text-muted-foreground">{quotation.number}</span>
          <QuotationStatusBadge status={quotation.status} />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          {isOpen ? 'Lances' : 'Comparativo de Lances'}
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground">{quotation.title}</p>
      </div>

      {isOpen ? (
        <OpenBids cnpj={cnpj} id={id} canEdit={canMutate} />
      ) : (
        <ClosedBids cnpj={cnpj} id={id} canMutate={canMutate} />
      )}
    </div>
  )
}
