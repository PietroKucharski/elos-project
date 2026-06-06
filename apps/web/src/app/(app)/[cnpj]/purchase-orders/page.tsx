// apps/web/src/app/(app)/[cnpj]/purchase-orders/page.tsx
import { PurchaseOrdersListClient } from '@/components/domain/purchase-orders-list-client'
import { getPurchaseOrdersServer } from '@/lib/api'
import type { PurchaseOrderResponse } from '@elos/shared'

interface Props {
  params: Promise<{ cnpj: string }>
}

const PAGE_SIZE = 100

// Pagina por status até esgotar — a API limita o `limit` a 100, então um único
// request não traz todos os POs quando há >100 em um status.
async function fetchAllByStatus(cnpj: string, status: string): Promise<PurchaseOrderResponse[]> {
  const all: PurchaseOrderResponse[] = []
  for (let page = 1; ; page++) {
    const batch = await getPurchaseOrdersServer(cnpj, {
      status,
      page: String(page),
      limit: String(PAGE_SIZE),
    })
    all.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return all
}

export default async function PurchaseOrdersPage({ params }: Props) {
  const { cnpj } = await params

  // Carrega todos os status em paralelo (cada um paginado) e filtra client-side
  // (mesmo padrão de products 2.5).
  const [draft, approved, sent, received, cancelled] = await Promise.all([
    fetchAllByStatus(cnpj, 'DRAFT'),
    fetchAllByStatus(cnpj, 'APPROVED'),
    fetchAllByStatus(cnpj, 'SENT'),
    fetchAllByStatus(cnpj, 'RECEIVED'),
    fetchAllByStatus(cnpj, 'CANCELLED'),
  ])

  const allPOs = [...draft, ...approved, ...sent, ...received, ...cancelled]
  const plural = allPOs.length !== 1

  return (
    <div className="max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pedidos de Compra</h1>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {allPOs.length} pedido{plural ? 's' : ''} encontrado{plural ? 's' : ''}
          </p>
        </div>
        {/* Não há "Novo PO" — gerado a partir de lances vencedores de cotações */}
        <p className="max-w-[280px] text-right text-[12.5px] text-muted-foreground">
          Pedidos são gerados a partir de lances vencedores de cotações.
        </p>
      </div>

      <PurchaseOrdersListClient cnpj={cnpj} purchaseOrders={allPOs} />
    </div>
  )
}
