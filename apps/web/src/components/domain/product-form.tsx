'use client'

// apps/web/src/components/domain/product-form.tsx

import { Button } from '@/components/ui/button'
import { createProduct, updateProduct } from '@/lib/api'
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
  outline: 'none',
  width: '100%',
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }
const hintStyle: React.CSSProperties = { fontSize: 11, color: 'hsl(215 16% 47%)' }

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
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* Nome */}
      <div style={fieldStyle}>
        <label htmlFor="name" style={labelStyle}>
          Nome do produto *
        </label>
        <input
          id="name"
          {...register('name')}
          style={inputStyle}
          placeholder="Ex: Parafuso M6 × 20mm"
        />
        {errors.name && <span style={errorStyle}>{errors.name.message}</span>}
      </div>

      {/* Código interno */}
      <div style={fieldStyle}>
        <label htmlFor="code" style={labelStyle}>
          Código interno
        </label>
        <input id="code" {...register('code')} style={inputStyle} placeholder="Ex: PAR-M6-20" />
        {errors.code && <span style={errorStyle}>{errors.code.message}</span>}
        <p style={hintStyle}>
          Código único por empresa. Deixe em branco para geração automática futura.
        </p>
      </div>

      {/* Unidade de medida */}
      <div style={fieldStyle}>
        <label htmlFor="unit" style={labelStyle}>
          Unidade de medida *
        </label>
        <select id="unit" {...register('unit')} style={{ ...inputStyle, cursor: 'pointer' }}>
          {unitOfMeasureValues.map((u) => (
            <option key={u} value={u}>
              {UNIT_LABELS[u] ?? u}
            </option>
          ))}
        </select>
        {errors.unit && <span style={errorStyle}>{errors.unit.message}</span>}
      </div>

      {/* Estoque mínimo */}
      <div style={fieldStyle}>
        <label htmlFor="minStock" style={labelStyle}>
          Estoque mínimo
        </label>
        <input
          id="minStock"
          type="number"
          min={0}
          step="0.001"
          {...register('minStock', { valueAsNumber: true })}
          style={inputStyle}
          placeholder="0"
        />
        {errors.minStock && <span style={errorStyle}>{errors.minStock.message}</span>}
        <p style={hintStyle}>
          Alerta quando o estoque cair abaixo deste valor (funcionalidade na Fase 5).
        </p>
      </div>

      {/* Descrição */}
      <div style={fieldStyle}>
        <label htmlFor="description" style={labelStyle}>
          Descrição
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={3}
          style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
          placeholder="Especificações técnicas, observações..."
        />
        {errors.description && <span style={errorStyle}>{errors.description.message}</span>}
      </div>

      {/* Ativo — apenas em modo edit */}
      {mode === 'edit' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            id="isActive"
            type="checkbox"
            {...register('isActive')}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <label htmlFor="isActive" style={{ fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Produto ativo
          </label>
        </div>
      )}

      {/* Submit */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 8 }}>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
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
          {mode === 'create' ? 'Criar produto' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
