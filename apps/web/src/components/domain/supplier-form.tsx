'use client'

// apps/web/src/components/domain/supplier-form.tsx

import { Button } from '@/components/ui/button'
import { createSupplier, updateSupplier } from '@/lib/api'
import { cn } from '@/lib/utils'
import { createSupplierSchema, updateSupplierSchema } from '@elos/shared'
import type { CreateSupplierDto, SupplierResponse, UpdateSupplierDto } from '@elos/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'

// Classes reutilizáveis (mesmas de company-form.tsx)
const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const INPUT_READONLY = cn(INPUT, 'cursor-not-allowed bg-muted')
const SELECT = cn(INPUT, 'cursor-pointer')
const TEXTAREA = cn(INPUT, 'h-auto resize-y py-2')
const ERROR = 'text-xs text-destructive'

interface SupplierFormProps {
  mode: 'create' | 'edit'
  cnpj: string // cnpj da empresa (tenant) — para URL
  supplierId?: string // id do fornecedor (modo edit)
  defaultValues?: Partial<CreateSupplierDto>
  onSuccess?: (supplier: SupplierResponse) => void
  onCancel?: () => void // se ausente, "Cancelar" volta na navegação (router.back)
}

export function SupplierForm({
  mode,
  cnpj,
  supplierId,
  defaultValues,
  onSuccess,
  onCancel,
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
  // Pessoa Jurídica em ambos os modos (no edit o type é imutável e vem em defaultValues)
  const isPJ = mode === 'create' ? supplierType !== 'PF' : defaultValues?.type !== 'PF'

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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Tipo de fornecedor — apenas no modo create */}
      {mode === 'create' && (
        <div className={FIELD}>
          <label htmlFor="type" className={LABEL}>
            Tipo de pessoa *
          </label>
          <select id="type" {...register('type')} className={SELECT}>
            <option value="PJ">Pessoa Jurídica (PJ)</option>
            <option value="PF">Pessoa Física (PF)</option>
          </select>
          {errors.type && <span className={ERROR}>{errors.type.message}</span>}
        </div>
      )}

      {/* Nome / Razão Social */}
      <div className={FIELD}>
        <label htmlFor="name" className={LABEL}>
          {supplierType === 'PF' ? 'Nome completo' : 'Razão social'} *
        </label>
        <input
          id="name"
          {...register('name')}
          className={INPUT}
          placeholder={supplierType === 'PF' ? 'João da Silva' : 'Empresa Ltda'}
        />
        {errors.name && <span className={ERROR}>{errors.name.message}</span>}
      </div>

      {/* Nome fantasia — apenas PJ */}
      {isPJ && (
        <div className={FIELD}>
          <label htmlFor="tradeName" className={LABEL}>
            Nome fantasia
          </label>
          <input
            id="tradeName"
            {...register('tradeName')}
            className={INPUT}
            placeholder="NovaPack"
          />
          {errors.tradeName && <span className={ERROR}>{errors.tradeName.message}</span>}
        </div>
      )}

      {/* CNPJ / CPF */}
      {isPJ ? (
        <div className={FIELD}>
          <label htmlFor="cnpj" className={LABEL}>
            CNPJ *
          </label>
          <input
            id="cnpj"
            {...register('cnpj')}
            className={mode === 'edit' ? INPUT_READONLY : INPUT}
            readOnly={mode === 'edit'}
            placeholder="00000000000000"
            maxLength={14}
          />
          {errors.cnpj && <span className={ERROR}>{errors.cnpj.message}</span>}
        </div>
      ) : (
        <div className={FIELD}>
          <label htmlFor="cpf" className={LABEL}>
            CPF *
          </label>
          <input
            id="cpf"
            {...register('cpf')}
            className={mode === 'edit' ? INPUT_READONLY : INPUT}
            readOnly={mode === 'edit'}
            placeholder="00000000000"
            maxLength={11}
          />
          {errors.cpf && <span className={ERROR}>{errors.cpf.message}</span>}
        </div>
      )}

      {/* Inscrição estadual — apenas PJ */}
      {isPJ && (
        <div className={FIELD}>
          <label htmlFor="stateRegistration" className={LABEL}>
            Inscrição estadual
          </label>
          <input
            id="stateRegistration"
            {...register('stateRegistration')}
            className={INPUT}
            placeholder="Isento ou número da IE"
            maxLength={20}
          />
          {errors.stateRegistration && (
            <span className={ERROR}>{errors.stateRegistration.message}</span>
          )}
        </div>
      )}

      {/* E-mail */}
      <div className={FIELD}>
        <label htmlFor="email" className={LABEL}>
          E-mail
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className={INPUT}
          placeholder="contato@fornecedor.com"
        />
        {errors.email && <span className={ERROR}>{errors.email.message}</span>}
      </div>

      {/* Telefone */}
      <div className={FIELD}>
        <label htmlFor="phone" className={LABEL}>
          Telefone
        </label>
        <input id="phone" {...register('phone')} className={INPUT} placeholder="(11) 99999-9999" />
        {errors.phone && <span className={ERROR}>{errors.phone.message}</span>}
      </div>

      {/* Observações */}
      <div className={FIELD}>
        <label htmlFor="notes" className={LABEL}>
          Observações
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={3}
          className={TEXTAREA}
          placeholder="Informações adicionais sobre o fornecedor..."
        />
        {errors.notes && <span className={ERROR}>{errors.notes.message}</span>}
      </div>

      {/* ─── Endereço ──────────────────────────────────────────── */}
      <div className="border-t border-border pt-5">
        <p className="mb-4 text-sm font-semibold text-foreground">Endereço (opcional)</p>
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(FIELD, 'col-span-2')}>
            <label htmlFor="address.street" className={LABEL}>
              Logradouro
            </label>
            <input
              id="address.street"
              {...register('address.street')}
              className={INPUT}
              placeholder="Rua, Avenida, Alameda..."
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="address.number" className={LABEL}>
              Número
            </label>
            <input
              id="address.number"
              {...register('address.number')}
              className={INPUT}
              placeholder="123"
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="address.complement" className={LABEL}>
              Complemento
            </label>
            <input
              id="address.complement"
              {...register('address.complement')}
              className={INPUT}
              placeholder="Sala 4, Apto 10..."
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="address.city" className={LABEL}>
              Cidade
            </label>
            <input
              id="address.city"
              {...register('address.city')}
              className={INPUT}
              placeholder="São Paulo"
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="address.state" className={LABEL}>
              UF
            </label>
            <input
              id="address.state"
              {...register('address.state')}
              className={INPUT}
              placeholder="SP"
              maxLength={2}
            />
          </div>
          <div className={FIELD}>
            <label htmlFor="address.zipCode" className={LABEL}>
              CEP
            </label>
            <input
              id="address.zipCode"
              {...register('address.zipCode')}
              className={INPUT}
              placeholder="00000000"
              maxLength={8}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel ?? (() => router.back())}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          {mode === 'create' ? 'Criar fornecedor' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
