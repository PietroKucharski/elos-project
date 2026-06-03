'use client'

// apps/web/src/components/domain/supplier-form.tsx

import { Button } from '@/components/ui/button'
import { createSupplier, updateSupplier } from '@/lib/api'
import { createSupplierSchema, updateSupplierSchema } from '@elos/shared'
import type { CreateSupplierDto, SupplierResponse, UpdateSupplierDto } from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'

// Estilos reutilizáveis (mesmos de company-form.tsx)
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
const inputReadonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'hsl(210 40% 96.1%)',
  cursor: 'not-allowed',
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }

interface SupplierFormProps {
  mode: 'create' | 'edit'
  cnpj: string // cnpj da empresa (tenant) — para URL
  supplierId?: string // id do fornecedor (modo edit)
  defaultValues?: Partial<CreateSupplierDto>
  onSuccess?: (supplier: SupplierResponse) => void
}

export function SupplierForm({
  mode,
  cnpj,
  supplierId,
  defaultValues,
  onSuccess,
}: SupplierFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Em modo edit, o tipo foi fixado na criação — usamos CreateSupplierDto como
  // superset para o form (todos os campos presentes, só usamos o que é editável)
  const schema = mode === 'create' ? createSupplierSchema : updateSupplierSchema
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateSupplierDto>({
    resolver: zodResolver(schema) as Resolver<CreateSupplierDto>,
    defaultValues: defaultValues
      ? (Object.fromEntries(
          Object.entries(defaultValues).map(([k, v]) => [k, v ?? undefined]),
        ) as Partial<CreateSupplierDto>)
      : { type: 'PJ' },
  })

  const supplierType = watch('type')

  async function onSubmit(data: CreateSupplierDto) {
    setLoading(true)
    try {
      let result: SupplierResponse
      if (mode === 'create') {
        result = await createSupplier(cnpj, data)
        toast.success('Fornecedor criado com sucesso.')
      } else {
        result = await updateSupplier(cnpj, supplierId!, data as UpdateSupplierDto)
        toast.success('Fornecedor atualizado com sucesso.')
      }
      onSuccess?.(result)
      router.push(`/${cnpj}/suppliers`)
      router.refresh()
    } catch (error) {
      console.error('[SupplierForm.onSubmit]', error)
      toast.error(mode === 'create' ? 'Erro ao criar fornecedor.' : 'Erro ao atualizar fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
    >
      {/* Tipo de fornecedor — apenas no modo create */}
      {mode === 'create' && (
        <div style={fieldStyle}>
          <label htmlFor="type" style={labelStyle}>
            Tipo de pessoa *
          </label>
          <select id="type" {...register('type')} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="PJ">Pessoa Jurídica (PJ)</option>
            <option value="PF">Pessoa Física (PF)</option>
          </select>
          {errors.type && <span style={errorStyle}>{errors.type.message}</span>}
        </div>
      )}

      {/* Nome / Razão Social */}
      <div style={fieldStyle}>
        <label htmlFor="name" style={labelStyle}>
          {supplierType === 'PF' ? 'Nome completo' : 'Razão social'} *
        </label>
        <input
          id="name"
          {...register('name')}
          style={inputStyle}
          placeholder={supplierType === 'PF' ? 'João da Silva' : 'Empresa Ltda'}
        />
        {errors.name && <span style={errorStyle}>{errors.name.message}</span>}
      </div>

      {/* CNPJ / CPF */}
      {(mode === 'create' ? supplierType !== 'PF' : defaultValues?.type !== 'PF') ? (
        <div style={fieldStyle}>
          <label htmlFor="cnpj" style={labelStyle}>
            CNPJ *
          </label>
          <input
            id="cnpj"
            {...register('cnpj')}
            style={mode === 'edit' ? inputReadonlyStyle : inputStyle}
            readOnly={mode === 'edit'}
            placeholder="00000000000000"
            maxLength={14}
          />
          {errors.cnpj && <span style={errorStyle}>{errors.cnpj.message}</span>}
        </div>
      ) : (
        <div style={fieldStyle}>
          <label htmlFor="cpf" style={labelStyle}>
            CPF *
          </label>
          <input
            id="cpf"
            {...register('cpf')}
            style={mode === 'edit' ? inputReadonlyStyle : inputStyle}
            readOnly={mode === 'edit'}
            placeholder="00000000000"
            maxLength={11}
          />
          {errors.cpf && <span style={errorStyle}>{errors.cpf.message}</span>}
        </div>
      )}

      {/* E-mail */}
      <div style={fieldStyle}>
        <label htmlFor="email" style={labelStyle}>
          E-mail
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          style={inputStyle}
          placeholder="contato@fornecedor.com"
        />
        {errors.email && <span style={errorStyle}>{errors.email.message}</span>}
      </div>

      {/* Telefone */}
      <div style={fieldStyle}>
        <label htmlFor="phone" style={labelStyle}>
          Telefone
        </label>
        <input id="phone" {...register('phone')} style={inputStyle} placeholder="(11) 99999-9999" />
        {errors.phone && <span style={errorStyle}>{errors.phone.message}</span>}
      </div>

      {/* Observações */}
      <div style={fieldStyle}>
        <label htmlFor="notes" style={labelStyle}>
          Observações
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
          placeholder="Informações adicionais sobre o fornecedor..."
        />
        {errors.notes && <span style={errorStyle}>{errors.notes.message}</span>}
      </div>

      {/* ─── Endereço ──────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid hsl(214 32% 91%)', paddingTop: 20 }}>
        <p
          style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 16,
            color: 'hsl(222 47% 11%)',
          }}
        >
          Endereço (opcional)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <label htmlFor="address.street" style={labelStyle}>
              Logradouro
            </label>
            <input
              id="address.street"
              {...register('address.street')}
              style={inputStyle}
              placeholder="Rua, Avenida, Alameda..."
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.number" style={labelStyle}>
              Número
            </label>
            <input
              id="address.number"
              {...register('address.number')}
              style={inputStyle}
              placeholder="123"
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.complement" style={labelStyle}>
              Complemento
            </label>
            <input
              id="address.complement"
              {...register('address.complement')}
              style={inputStyle}
              placeholder="Sala 4, Apto 10..."
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.city" style={labelStyle}>
              Cidade
            </label>
            <input
              id="address.city"
              {...register('address.city')}
              style={inputStyle}
              placeholder="São Paulo"
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.state" style={labelStyle}>
              UF
            </label>
            <input
              id="address.state"
              {...register('address.state')}
              style={inputStyle}
              placeholder="SP"
              maxLength={2}
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="address.zipCode" style={labelStyle}>
              CEP
            </label>
            <input
              id="address.zipCode"
              {...register('address.zipCode')}
              style={inputStyle}
              placeholder="00000000"
              maxLength={8}
            />
          </div>
        </div>
      </div>

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
          {mode === 'create' ? 'Criar fornecedor' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
