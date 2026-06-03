'use client'

// apps/web/src/components/domain/product-form.tsx

import { Button } from '@/components/ui/button'
import { createProduct, updateProduct } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  type CreateProductDto,
  type ProductResponse,
  type UpdateProductDto,
  createProductSchema,
  unitOfMeasureValues,
} from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const SELECT = cn(INPUT, 'cursor-pointer')
const TEXTAREA = cn(INPUT, 'h-auto resize-y py-2')
const ERROR = 'text-xs text-destructive'
const HINT = 'text-[11px] text-muted-foreground'

// Label amigável para cada unidade de medida
const UNIT_LABELS: Record<string, string> = {
  UN: 'Unidade (UN)',
  KG: 'Quilograma (KG)',
  G: 'Grama (G)',
  L: 'Litro (L)',
  ML: 'Mililitro (ML)',
  M: 'Metro (M)',
  M2: 'Metro quadrado (M²)',
  M3: 'Metro cúbico (M³)',
  CX: 'Caixa (CX)',
  PC: 'Peça (PC)',
}

interface ProductFormProps {
  mode: 'create' | 'edit'
  cnpj: string
  productId?: string
  defaultValues?: Partial<CreateProductDto>
  onSuccess?: (product: ProductResponse) => void
}

export function ProductForm({ mode, cnpj, productId, defaultValues, onSuccess }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateProductDto>({
    resolver: zodResolver(createProductSchema) as never,
    defaultValues: defaultValues
      ? Object.fromEntries(Object.entries(defaultValues).map(([k, v]) => [k, v ?? undefined]))
      : { unit: 'UN', isActive: true },
  })

  const onSubmit = async (data: CreateProductDto) => {
    setLoading(true)
    try {
      let result: ProductResponse
      if (mode === 'create') {
        result = await createProduct(cnpj, data)
        toast.success('Produto criado com sucesso.')
      } else {
        result = await updateProduct(cnpj, productId!, data as UpdateProductDto)
        toast.success('Produto atualizado com sucesso.')
      }
      onSuccess?.(result)
      router.push(`/${cnpj}/products`)
      router.refresh()
    } catch (error) {
      console.error('[ProductForm.onSubmit]', error)
      toast.error(mode === 'create' ? 'Erro ao criar produto.' : 'Erro ao atualizar produto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Nome */}
      <div className={FIELD}>
        <label htmlFor="name" className={LABEL}>
          Nome do produto *
        </label>
        <input
          id="name"
          {...register('name')}
          className={INPUT}
          placeholder="Ex: Parafuso M6 × 20mm"
        />
        {errors.name && <span className={ERROR}>{errors.name.message}</span>}
      </div>

      {/* Código interno */}
      <div className={FIELD}>
        <label htmlFor="code" className={LABEL}>
          Código interno
        </label>
        <input id="code" {...register('code')} className={INPUT} placeholder="Ex: PAR-M6-20" />
        {errors.code && <span className={ERROR}>{errors.code.message}</span>}
        <p className={HINT}>
          Código único por empresa. Deixe em branco para geração automática futura.
        </p>
      </div>

      {/* Unidade de medida */}
      <div className={FIELD}>
        <label htmlFor="unit" className={LABEL}>
          Unidade de medida *
        </label>
        <select id="unit" {...register('unit')} className={SELECT}>
          {unitOfMeasureValues.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u] ?? u}
            </option>
          ))}
        </select>
        {errors.unit && <span className={ERROR}>{errors.unit.message}</span>}
      </div>

      {/* Estoque mínimo */}
      <div className={FIELD}>
        <label htmlFor="minStock" className={LABEL}>
          Estoque mínimo
        </label>
        <input
          id="minStock"
          type="number"
          min={0}
          step="0.001"
          {...register('minStock', { valueAsNumber: true })}
          className={INPUT}
          placeholder="0"
        />
        {errors.minStock && <span className={ERROR}>{errors.minStock.message}</span>}
        <p className={HINT}>
          Alerta quando o estoque cair abaixo deste valor (funcionalidade na Fase 5).
        </p>
      </div>

      {/* Descrição */}
      <div className={FIELD}>
        <label htmlFor="description" className={LABEL}>
          Descrição
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          className={TEXTAREA}
          placeholder="Especificações técnicas, observações..."
        />
        {errors.description && <span className={ERROR}>{errors.description.message}</span>}
      </div>

      {/* Ativo — apenas em modo edit */}
      {mode === 'edit' && (
        <div className="flex items-center gap-2.5">
          <input
            id="isActive"
            type="checkbox"
            {...register('isActive')}
            className="h-4 w-4 cursor-pointer"
          />
          <label htmlFor="isActive" className="cursor-pointer text-[13px] font-medium">
            Produto ativo
          </label>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {mode === 'create' ? 'Criar produto' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
