'use client'

// apps/web/src/components/domain/link-supplier-sheet.tsx

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { linkSupplierToProduct } from '@/lib/api'
import {
  type LinkProductSupplierDto,
  type SupplierResponse,
  linkProductSupplierSchema,
} from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'

interface LinkedSupplier {
  id: string
  supplierId: string
  supplierName: string
  isPreferred: boolean
  notes: string | null
}

interface LinkSupplierSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cnpj: string
  productId: string
  availableSuppliers: SupplierResponse[]
  onLinked: (link: LinkedSupplier) => void
}

const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
const inputStyle: React.CSSProperties = {
  height: 38,
  padding: '0 12px',
  fontSize: 13.5,
  borderRadius: '0.375rem',
  border: '1px solid hsl(214 32% 91%)',
  background: 'hsl(0 0% 100%)',
  color: 'hsl(222 47% 11%)',
  width: '100%',
}

export function LinkSupplierSheet({
  open,
  onOpenChange,
  cnpj,
  productId,
  availableSuppliers,
  onLinked,
}: LinkSupplierSheetProps) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<LinkProductSupplierDto>({
    resolver: zodResolver(linkProductSupplierSchema) as Resolver<LinkProductSupplierDto>,
    defaultValues: { isPreferred: false },
  })

  const selectedSupplierId = watch('supplierId')
  const selectedSupplier = availableSuppliers.find((s) => s.id === selectedSupplierId)

  const onSubmit = async (data: LinkProductSupplierDto) => {
    setLoading(true)
    try {
      const result = await linkSupplierToProduct(cnpj, productId, data)
      onLinked({
        id: result.id,
        supplierId: result.supplierId,
        supplierName: selectedSupplier?.name ?? '',
        isPreferred: result.isPreferred,
        notes: result.notes,
      })
      toast.success('Fornecedor vinculado com sucesso.')
      reset()
    } catch (error) {
      console.error('[LinkSupplierSheet.onSubmit]', error)
      toast.error('Erro ao vincular fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent style={{ width: 440 }}>
        <SheetHeader>
          <SheetTitle>Vincular fornecedor</SheetTitle>
          <SheetDescription>
            Selecione um fornecedor aprovado para associar a este produto.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}
        >
          {/* Seleção do fornecedor */}
          <div style={fieldStyle}>
            <label htmlFor="supplierId" style={labelStyle}>
              Fornecedor *
            </label>
            {availableSuppliers.length === 0 ? (
              <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)' }}>
                Todos os fornecedores aprovados já estão vinculados.
              </p>
            ) : (
              <select
                id="supplierId"
                {...register('supplierId')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Selecione...</option>
                {availableSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            {errors.supplierId && (
              <span style={{ fontSize: 12, color: 'hsl(0 72% 51%)' }}>
                {errors.supplierId.message}
              </span>
            )}
          </div>

          {/* Preferido */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              id="isPreferred"
              type="checkbox"
              {...register('isPreferred')}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="isPreferred" style={{ fontSize: 13, cursor: 'pointer' }}>
              Fornecedor preferido para este produto
            </label>
          </div>

          {/* Observações */}
          <div style={fieldStyle}>
            <label htmlFor="notes" style={labelStyle}>
              Observações
            </label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={2}
              style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
              placeholder="Condições especiais, prazo típico de entrega..."
            />
          </div>

          {/* Preview do fornecedor selecionado */}
          {selectedSupplier && (
            <div
              style={{
                background: 'hsl(210 40% 96%)',
                borderRadius: '0.375rem',
                padding: '10px 14px',
                fontSize: 13,
              }}
            >
              <p style={{ fontWeight: 500 }}>{selectedSupplier.name}</p>
              <p style={{ color: 'hsl(215 16% 47%)', marginTop: 2 }}>
                {selectedSupplier.type === 'PJ'
                  ? `CNPJ: ${selectedSupplier.cnpj}`
                  : `CPF: ${selectedSupplier.cpf}`}
                {selectedSupplier.email && ` · ${selectedSupplier.email}`}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || availableSuppliers.length === 0}>
              {loading && (
                <Loader2
                  style={{
                    width: 14,
                    height: 14,
                    marginRight: 6,
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              Vincular
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
