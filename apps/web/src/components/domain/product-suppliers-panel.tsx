'use client'

// apps/web/src/components/domain/product-suppliers-panel.tsx

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
import { unlinkSupplierFromProduct, updateProductSupplierLink } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { SupplierResponse } from '@elos/shared'
import { Plus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { LinkSupplierSheet } from './link-supplier-sheet'

interface LinkedSupplier {
  id: string
  supplierId: string
  supplierName: string
  isPreferred: boolean
  notes: string | null
}

interface ProductSuppliersPanelProps {
  cnpj: string
  productId: string
  initialLinks: LinkedSupplier[]
  availableSuppliers: SupplierResponse[]
  canMutate: boolean
}

export function ProductSuppliersPanel({
  cnpj,
  productId,
  initialLinks,
  availableSuppliers,
  canMutate,
}: ProductSuppliersPanelProps) {
  const [links, setLinks] = useState(initialLinks)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleUnlink = async (link: LinkedSupplier) => {
    try {
      await unlinkSupplierFromProduct(cnpj, productId, link.supplierId)
      setLinks((prev) => prev.filter((l) => l.id !== link.id))
      toast.success(`${link.supplierName} desvinculado.`)
    } catch (error) {
      console.error('[ProductSuppliersPanel.handleUnlink]', error)
      toast.error('Erro ao desvincular fornecedor.')
    }
    setRemovingId(null)
  }

  const handleTogglePreferred = async (link: LinkedSupplier) => {
    try {
      const updated = await updateProductSupplierLink(cnpj, productId, link.supplierId, {
        isPreferred: !link.isPreferred,
      })
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, isPreferred: updated.isPreferred } : l)),
      )
      toast.success(updated.isPreferred ? 'Definido como preferido.' : 'Marcação removida.')
    } catch (error) {
      console.error('[ProductSuppliersPanel.handleTogglePreferred]', error)
      toast.error('Erro ao atualizar preferência.')
    }
  }

  // Fornecedores já vinculados (excluir do select do Sheet)
  const linkedSupplierIds = new Set(links.map((l) => l.supplierId))
  const unlinkedSuppliers = availableSuppliers.filter((s) => !linkedSupplierIds.has(s.id))

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Fornecedores vinculados
          <span className="ml-2 text-[13px] font-normal text-muted-foreground">
            ({links.length})
          </span>
        </h2>
        {canMutate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
            disabled={unlinkedSuppliers.length === 0}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Vincular fornecedor
          </Button>
        )}
      </div>

      {links.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum fornecedor vinculado a este produto.
          </p>
          {canMutate && (
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              Vincule um fornecedor aprovado para usá-lo em cotações.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {links.map((link, idx) => (
            <div
              key={link.id}
              className={cn('flex items-center px-5 py-3', idx > 0 && 'border-t border-border')}
            >
              {/* Ícone de preferido */}
              <button
                type="button"
                disabled={!canMutate}
                onClick={() => handleTogglePreferred(link)}
                className={cn(
                  'mr-3 p-0.5',
                  link.isPreferred ? 'text-warning' : 'text-border',
                  canMutate ? 'cursor-pointer' : 'cursor-default',
                )}
                title={link.isPreferred ? 'Remover preferência' : 'Definir como preferido'}
              >
                <Star className={cn('h-4 w-4', link.isPreferred && 'fill-current')} />
              </button>

              {/* Nome do fornecedor */}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {link.supplierName}
                  {link.isPreferred && (
                    <span className="ml-2 text-[11px] text-warning">Preferido</span>
                  )}
                </p>
                {link.notes && <p className="mt-0.5 text-xs text-muted-foreground">{link.notes}</p>}
              </div>

              {/* Ação de desvincular */}
              {canMutate && (
                <button
                  type="button"
                  onClick={() => setRemovingId(link.id)}
                  className="cursor-pointer p-1.5 text-muted-foreground"
                  title="Desvincular fornecedor"
                >
                  <Trash2 className="h-[15px] w-[15px]" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AlertDialog de confirmação de desvínculo */}
      <AlertDialog open={removingId !== null} onOpenChange={() => setRemovingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              O fornecedor será removido deste produto. Cotações existentes não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const link = links.find((l) => l.id === removingId)
                if (link) handleUnlink(link)
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sheet de vínculo */}
      <LinkSupplierSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        cnpj={cnpj}
        productId={productId}
        availableSuppliers={unlinkedSuppliers}
        onLinked={(newLink) => {
          setLinks((prev) => [...prev, newLink])
          setSheetOpen(false)
        }}
      />
    </div>
  )
}
