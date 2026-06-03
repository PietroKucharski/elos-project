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
import { cn } from '@/lib/utils'
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

const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const SELECT = cn(INPUT, 'cursor-pointer')
const TEXTAREA = cn(INPUT, 'h-auto resize-y py-2')

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
      <SheetContent className="w-[440px]">
        <SheetHeader>
          <SheetTitle>Vincular fornecedor</SheetTitle>
          <SheetDescription>
            Selecione um fornecedor aprovado para associar a este produto.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-5">
          {/* Seleção do fornecedor */}
          <div className={FIELD}>
            <label htmlFor="supplierId" className={LABEL}>
              Fornecedor *
            </label>
            {availableSuppliers.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">
                Todos os fornecedores aprovados já estão vinculados.
              </p>
            ) : (
              <select id="supplierId" {...register('supplierId')} className={SELECT}>
                <option value="">Selecione...</option>
                {availableSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            {errors.supplierId && (
              <span className="text-xs text-destructive">{errors.supplierId.message}</span>
            )}
          </div>

          {/* Preferido */}
          <div className="flex items-center gap-2.5">
            <input
              id="isPreferred"
              type="checkbox"
              {...register('isPreferred')}
              className="h-4 w-4 cursor-pointer"
            />
            <label htmlFor="isPreferred" className="cursor-pointer text-[13px]">
              Fornecedor preferido para este produto
            </label>
          </div>

          {/* Observações */}
          <div className={FIELD}>
            <label htmlFor="notes" className={LABEL}>
              Observações
            </label>
            <textarea
              id="notes"
              {...register('notes')}
              rows={2}
              className={TEXTAREA}
              placeholder="Condições especiais, prazo típico de entrega..."
            />
          </div>

          {/* Preview do fornecedor selecionado */}
          {selectedSupplier && (
            <div className="rounded-md bg-muted px-3.5 py-2.5 text-[13px]">
              <p className="font-medium">{selectedSupplier.name}</p>
              <p className="mt-0.5 text-muted-foreground">
                {selectedSupplier.type === 'PJ'
                  ? `CNPJ: ${selectedSupplier.cnpj}`
                  : `CPF: ${selectedSupplier.cpf}`}
                {selectedSupplier.email && ` · ${selectedSupplier.email}`}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || availableSuppliers.length === 0}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Vincular
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
