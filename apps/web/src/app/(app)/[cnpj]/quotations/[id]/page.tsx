// apps/web/src/app/(app)/[cnpj]/quotations/[id]/page.tsx
import { GeneratePODialog } from '@/components/domain/generate-po-dialog'
import { QuotationActions } from '@/components/domain/quotation-actions'
import { QuotationItemsPanel } from '@/components/domain/quotation-items-panel'
import { QuotationStatusBadge } from '@/components/domain/quotation-status-badge'
import { QuotationSuppliersPanel } from '@/components/domain/quotation-suppliers-panel'
import {
  getBidsServer,
  getMyCompaniesServer,
  getQuotationItemsServer,
  getQuotationServer,
  getQuotationSuppliersServer,
  getSuppliersServer,
} from '@/lib/api'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ cnpj: string; id: string }>
}

const MUTATE_ROLES = ['COMPRADOR', 'ADMIN_EMPRESA', 'SUPER_ADMIN']

export default async function QuotationDetailPage({ params }: Props) {
  const { cnpj, id } = await params

  const [quotation, items, invites, approvedSuppliers, myCompanies, bids] = await Promise.all([
    getQuotationServer(cnpj, id),
    getQuotationItemsServer(cnpj, id),
    getQuotationSuppliersServer(cnpj, id),
    getSuppliersServer(cnpj, { status: 'APPROVED' }),
    getMyCompaniesServer(),
    getBidsServer(cnpj, id),
  ])

  if (!quotation) notFound()

  const role = myCompanies.find((c) => c.cnpj === cnpj)?.role ?? ''
  const canMutate = MUTATE_ROLES.includes(role)
  const canEdit = canMutate && quotation.status === 'DRAFT'

  return (
    <div className="max-w-[960px]">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="font-mono text-[13px] text-muted-foreground">{quotation.number}</span>
            <QuotationStatusBadge status={quotation.status} />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{quotation.title}</h1>
          {quotation.description && (
            <p className="mt-2 text-[13.5px] text-muted-foreground">{quotation.description}</p>
          )}
        </div>

        {canMutate && <QuotationActions cnpj={cnpj} quotation={quotation} />}
      </div>

      {/* Info grid */}
      <div className="mb-8 grid grid-cols-2 gap-6 rounded-lg border border-border bg-card p-5">
        <div>
          <p className="mb-1 text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
            Prazo de recebimento
          </p>
          <p className="font-medium text-foreground">
            {new Date(quotation.deadline).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        {quotation.paymentTerms && (
          <div>
            <p className="mb-1 text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
              Condições de pagamento
            </p>
            <p className="font-medium text-foreground">{quotation.paymentTerms}</p>
          </div>
        )}
      </div>

      {/* Itens */}
      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold text-foreground">Itens da Cotação</h2>
        <QuotationItemsPanel cnpj={cnpj} quotationId={id} initialItems={items} canEdit={canEdit} />
      </section>

      {/* Fornecedores convidados */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Fornecedores Convidados</h2>
          {(quotation.status === 'OPEN' || quotation.status === 'CLOSED') && canMutate && (
            <Link
              href={`/${cnpj}/quotations/${id}/bids`}
              className="text-sm font-medium text-primary no-underline hover:underline"
            >
              {quotation.status === 'OPEN' ? 'Ver lances →' : 'Ver comparativo →'}
            </Link>
          )}
        </div>
        <QuotationSuppliersPanel
          cnpj={cnpj}
          quotationId={id}
          initialInvites={invites}
          approvedSuppliers={approvedSuppliers}
          canEdit={canEdit}
        />
      </section>

      {/* Lance vencedor → gerar Pedido de Compra (cotação CLOSED com lance SELECTED) */}
      {quotation.status === 'CLOSED' &&
        (() => {
          const winnerBid = bids.find((b) => b.status === 'SELECTED')
          if (!winnerBid) return null

          return (
            <section className="mb-8">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border-2 border-primary/30 bg-card p-5">
                <div>
                  <h2 className="mb-1 text-base font-semibold text-primary">🏆 Lance Vencedor</h2>
                  <p className="text-[13.5px] text-muted-foreground">
                    <strong className="text-foreground">{winnerBid.supplierName}</strong>
                    {winnerBid.totalPrice && (
                      <>
                        {' · '}
                        <strong className="text-foreground">
                          {Number(winnerBid.totalPrice).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </strong>
                      </>
                    )}
                  </p>
                </div>
                {canMutate && (
                  <GeneratePODialog
                    cnpj={cnpj}
                    bidId={winnerBid.id}
                    supplierName={winnerBid.supplierName}
                    totalPrice={winnerBid.totalPrice ?? '0'}
                  />
                )}
              </div>
            </section>
          )
        })()}
    </div>
  )
}
