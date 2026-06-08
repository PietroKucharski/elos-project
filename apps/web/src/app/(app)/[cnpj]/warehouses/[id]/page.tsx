import { InventoryTable } from '@/components/domain/inventory-table'
import { Button } from '@/components/ui/button'
import { getMyCompaniesServer, getWarehouseInventoryServer, getWarehouseServer } from '@/lib/api'
import { ChevronLeft, Pencil } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const MUTATE_ROLES = ['ADMIN_EMPRESA', 'ALMOXARIFE', 'SUPER_ADMIN']

export default async function WarehouseDetailPage({
  params,
}: {
  params: Promise<{ cnpj: string; id: string }>
}) {
  const { cnpj, id } = await params
  const [myCompanies, warehouse, inventoryItems] = await Promise.all([
    getMyCompaniesServer(),
    getWarehouseServer(cnpj, id),
    getWarehouseInventoryServer(cnpj, id),
  ])

  if (!warehouse) notFound()

  const membership = myCompanies.find((c) => c.cnpj === cnpj)
  const role = membership?.role ?? null
  const canMutate = role !== null && MUTATE_ROLES.includes(role)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${cnpj}/warehouses`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Armazéns
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{warehouse.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {warehouse.code ? `Código: ${warehouse.code} · ` : ''}
            {warehouse.location ?? 'Sem localização'}
          </p>
        </div>
        {canMutate && warehouse.isActive && (
          <Button variant="outline" asChild>
            <Link href={`/${cnpj}/warehouses/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Inventário</h2>
        <InventoryTable inventory={inventoryItems} showWarehouse={false} />
      </div>
    </div>
  )
}
