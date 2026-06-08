'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { deactivateWarehouse } from '@/lib/api'
import type { WarehouseResponse } from '@elos/shared'
import { MoreHorizontal, Warehouse } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

interface WarehousesListClientProps {
  cnpj: string
  warehouses: WarehouseResponse[]
  canMutate: boolean
}

export function WarehousesListClient({ cnpj, warehouses, canMutate }: WarehousesListClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [toDeactivate, setToDeactivate] = useState<WarehouseResponse | null>(null)

  const filtered = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      (w.code ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  async function handleDeactivate() {
    if (!toDeactivate) return
    try {
      await deactivateWarehouse(cnpj, toDeactivate.id)
      toast.success('Armazém desativado.')
      router.refresh()
    } catch (error) {
      console.error('[WarehousesListClient.handleDeactivate]', error)
      toast.error('Erro ao desativar armazém. Verifique se há estoque.')
    } finally {
      setToDeactivate(null)
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-4">
        <input
          type="search"
          placeholder="Buscar por nome ou código…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-64"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Warehouse className="h-10 w-10" strokeWidth={1.5} />
          <p className="text-sm">Nenhum armazém encontrado.</p>
          {canMutate && (
            <Button asChild size="sm">
              <Link href={`/${cnpj}/warehouses/new`}>Criar armazém</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Código</th>
                <th className="text-left px-4 py-3 font-medium">Localização</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((warehouse) => (
                <tr
                  key={warehouse.id}
                  className={`hover:bg-muted/30 ${!warehouse.isActive ? 'opacity-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${cnpj}/warehouses/${warehouse.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {warehouse.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{warehouse.code ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{warehouse.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                        warehouse.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {warehouse.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canMutate && warehouse.isActive && (
                      <div className="relative group">
                        <button
                          type="button"
                          className="p-1 rounded-md hover:bg-muted"
                          aria-label="Ações"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-36 bg-card border rounded-lg shadow-md hidden group-focus-within:block z-10">
                          <Link
                            href={`/${cnpj}/warehouses/${warehouse.id}`}
                            className="block px-3 py-2 text-sm hover:bg-muted rounded-t-lg"
                          >
                            Ver detalhe
                          </Link>
                          <Link
                            href={`/${cnpj}/warehouses/${warehouse.id}/edit`}
                            className="block px-3 py-2 text-sm hover:bg-muted"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => setToDeactivate(warehouse)}
                            className="block w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted rounded-b-lg"
                          >
                            Desativar
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!toDeactivate} onOpenChange={(open) => !open && setToDeactivate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar armazém?</AlertDialogTitle>
            <AlertDialogDescription>
              O armazém <strong>{toDeactivate?.name}</strong> será desativado. Esta ação não pode
              ser desfeita se houver estoque no armazém.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
