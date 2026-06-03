'use client'

import { Button } from '@/components/ui/button'
import { createCompany, updateCompany } from '@/lib/api'
import { cn } from '@/lib/utils'
import { createCompanySchema, updateCompanySchema } from '@elos/shared'
import type { CompanyResponse, CreateCompanyDto, UpdateCompanyDto } from '@elos/shared'
// apps/web/src/components/domain/company-form.tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type FormMode = 'create' | 'edit'

interface CompanyFormProps {
  mode: FormMode
  cnpj?: string
  defaultValues?: Partial<CreateCompanyDto>
  onSuccess?: (company: CompanyResponse) => void
}

// Classes reutilizáveis alinhadas ao protótipo
const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const INPUT_READONLY = cn(INPUT, 'cursor-not-allowed bg-muted font-mono')
const ERROR = 'text-xs text-destructive'
const SECTION_TITLE = 'mt-1 mb-3.5 text-[15.5px] font-semibold text-foreground'

export function CompanyForm({ mode, cnpj, defaultValues, onSuccess }: CompanyFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const schema = mode === 'create' ? createCompanySchema : updateCompanySchema
  // useForm é tipado pelo superset (CreateCompanyDto, que possui todos os
  // campos); o resolver muda conforme o modo, daí o cast do Resolver.
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCompanyDto>({
    resolver: zodResolver(schema) as Resolver<CreateCompanyDto>,
    defaultValues: defaultValues ?? {},
  })

  async function onSubmit(data: CreateCompanyDto) {
    setLoading(true)
    try {
      if (mode === 'create') {
        const company = await createCompany(data)
        toast.success('Empresa criada com sucesso.')
        router.push(`/${company.cnpj}/dashboard`)
      } else {
        const company = await updateCompany(cnpj!, data as UpdateCompanyDto)
        toast.success('Dados atualizados com sucesso.')
        onSuccess?.(company)
        router.refresh()
      }
    } catch (error) {
      console.error('[CompanyForm.onSubmit]', error)
      toast.error('Erro ao salvar. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-[780px] flex-col gap-5">
      {/* ── Identificação ────────────────────────────────────── */}
      <div>
        <div className={SECTION_TITLE}>Identificação</div>
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(FIELD, 'col-span-2')}>
            <label htmlFor="company-name" className={LABEL}>
              Razão Social <span className="text-destructive">*</span>
            </label>
            <input id="company-name" {...register('name')} className={INPUT} />
            {errors.name && (
              <span className={ERROR} role="alert">
                {errors.name.message}
              </span>
            )}
          </div>
          <div className={FIELD}>
            <label htmlFor="company-tradeName" className={LABEL}>
              Nome Fantasia
            </label>
            <input id="company-tradeName" {...register('tradeName')} className={INPUT} />
          </div>
          <div className={FIELD}>
            <label htmlFor="company-cnpj" className={LABEL}>
              CNPJ {mode === 'create' && <span className="text-destructive">*</span>}
            </label>
            {mode === 'create' ? (
              <>
                <input
                  id="company-cnpj"
                  {...register('cnpj')}
                  className={INPUT}
                  placeholder="14 dígitos sem formatação"
                  maxLength={14}
                />
                {errors.cnpj && (
                  <span className={ERROR} role="alert">
                    {errors.cnpj.message}
                  </span>
                )}
              </>
            ) : (
              <input id="company-cnpj" value={cnpj} readOnly className={INPUT_READONLY} />
            )}
          </div>
        </div>
      </div>

      {/* ── Contato ──────────────────────────────────────────── */}
      <div>
        <div className={SECTION_TITLE}>Contato</div>
        <div className="grid grid-cols-2 gap-4">
          <div className={FIELD}>
            <label htmlFor="company-email" className={LABEL}>
              E-mail
            </label>
            <input id="company-email" type="email" {...register('email')} className={INPUT} />
            {errors.email && (
              <span className={ERROR} role="alert">
                {errors.email.message}
              </span>
            )}
          </div>
          <div className={FIELD}>
            <label htmlFor="company-phone" className={LABEL}>
              Telefone
            </label>
            <input id="company-phone" {...register('phone')} className={INPUT} />
          </div>
        </div>
      </div>

      {/* ── Endereço ─────────────────────────────────────────── */}
      <div>
        <div className={SECTION_TITLE}>Endereço</div>
        <div className="grid grid-cols-6 gap-4">
          <div className={cn(FIELD, 'col-span-4')}>
            <label htmlFor="company-street" className={LABEL}>
              Logradouro
            </label>
            <input id="company-street" {...register('street')} className={INPUT} />
          </div>
          <div className={cn(FIELD, 'col-span-2')}>
            <label htmlFor="company-number" className={LABEL}>
              Número
            </label>
            <input id="company-number" {...register('number')} className={INPUT} />
          </div>
          <div className={cn(FIELD, 'col-span-3')}>
            <label htmlFor="company-complement" className={LABEL}>
              Complemento
            </label>
            <input id="company-complement" {...register('complement')} className={INPUT} />
          </div>
          <div className={cn(FIELD, 'col-span-3')}>
            <label htmlFor="company-city" className={LABEL}>
              Cidade
            </label>
            <input id="company-city" {...register('city')} className={INPUT} />
          </div>
          <div className={cn(FIELD, 'col-span-1')}>
            <label htmlFor="company-state" className={LABEL}>
              UF
            </label>
            <input id="company-state" {...register('state')} maxLength={2} className={INPUT} />
          </div>
          <div className={cn(FIELD, 'col-span-2')}>
            <label htmlFor="company-zipCode" className={LABEL}>
              CEP
            </label>
            <input
              id="company-zipCode"
              {...register('zipCode')}
              maxLength={8}
              placeholder="8 dígitos"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 size={15} className="mr-1.5 animate-spin" />}
          {mode === 'create' ? 'Criar Empresa' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  )
}
