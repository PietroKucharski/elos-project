import { ReceiptsListClient } from '@/components/domain/receipts-list-client'
import { getReceiptsServer } from '@/lib/api'

export default async function ReceiptsPage({
  params,
}: {
  params: Promise<{ cnpj: string }>
}) {
  const { cnpj } = await params
  const receipts = await getReceiptsServer(cnpj)

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Recebimentos</h1>
      <ReceiptsListClient cnpj={cnpj} receipts={receipts} />
    </div>
  )
}
