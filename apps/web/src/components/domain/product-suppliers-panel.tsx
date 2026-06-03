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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
          Fornecedores vinculados
          <span
            style={{
              fontSize: 13,
              fontWeight: 400,
              color: 'hsl(215 16% 47%)',
              marginLeft: 8,
            }}
          >
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
            <Plus style={{ width: 14, height: 14, marginRight: 6 }} />
            Vincular fornecedor
          </Button>
        )}
      </div>

      {links.length === 0 ? (
        <div
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            border: '1px solid hsl(214 32% 91%)',
            padding: '32px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: 'hsl(215 16% 47%)' }}>
            Nenhum fornecedor vinculado a este produto.
          </p>
          {canMutate && (
            <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 6 }}>
              Vincule um fornecedor aprovado para usá-lo em cotações.
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            background: 'white',
            borderRadius: '0.5rem',
            border: '1px solid hsl(214 32% 91%)',
            overflow: 'hidden',
          }}
        >
          {links.map((link, idx) => (
            <div
              key={link.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 20px',
                borderTop: idx > 0 ? '1px solid hsl(214 32% 91%)' : 'none',
              }}
            >
              {/* Ícone de preferido */}
              <button
                type="button"
                disabled={!canMutate}
                onClick={() => handleTogglePreferred(link)}
                style={{
                  marginRight: 12,
                  cursor: canMutate ? 'pointer' : 'default',
                  background: 'none',
                  border: 'none',
                  padding: 2,
                  color: link.isPreferred ? 'hsl(38 92% 50%)' : 'hsl(214 32% 91%)',
                }}
                title={link.isPreferred ? 'Remover preferência' : 'Definir como preferido'}
              >
                <Star
                  style={{
                    width: 16,
                    height: 16,
                    fill: link.isPreferred ? 'currentColor' : 'none',
                  }}
                />
              </button>

              {/* Nome do fornecedor */}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'hsl(222 47% 11%)' }}>
                  {link.supplierName}
                  {link.isPreferred && (
                    <span style={{ fontSize: 11, color: 'hsl(38 92% 50%)', marginLeft: 8 }}>
                      Preferido
                    </span>
                  )}
                </p>
                {link.notes && (
                  <p style={{ fontSize: 12, color: 'hsl(215 16% 47%)', marginTop: 2 }}>
                    {link.notes}
                  </p>
                )}
              </div>

              {/* Ação de desvincular */}
              {canMutate && (
                <button
                  type="button"
                  onClick={() => setRemovingId(link.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 6,
                    color: 'hsl(215 16% 47%)',
                  }}
                  title="Desvincular fornecedor"
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
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
              style={{ background: 'hsl(0 84% 60%)', color: 'white' }}
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
