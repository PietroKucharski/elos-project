'use client'

import { Button } from '@/components/ui/button'
import { createCompany, updateCompany } from '@/lib/api'
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

// Estilos reutilizáveis alinhados ao protótipo
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
  transition: 'border .15s, box-shadow .15s',
  width: '100%',
}
const inputReadonlyStyle: React.CSSProperties = {
  ...inputStyle,
  background: 'hsl(210 40% 96.1%)',
  fontFamily: 'monospace',
  cursor: 'not-allowed',
}
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }
const sectionTitle: React.CSSProperties = {
  fontSize: 15.5,
  fontWeight: 600,
  color: 'hsl(222 47% 11%)',
  marginBottom: 14,
  marginTop: 4,
}

function inputFocus(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'hsl(243 75% 59%)'
  e.target.style.boxShadow = '0 0 0 3px hsl(243 75% 59% / 0.13)'
}
function inputBlur(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'hsl(214 32% 91%)'
  e.target.style.boxShadow = 'none'
}

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
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 780 }}
    >
      {/* ── Identificação ────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>Identificação</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
            <label htmlFor="company-name" style={labelStyle}>
              Razão Social <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
            </label>
            <input
              id="company-name"
              {...register('name')}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
            {errors.name && (
              <span style={errorStyle} role="alert">
                {errors.name.message}
              </span>
            )}
          </div>
          <div style={fieldStyle}>
            <label htmlFor="company-tradeName" style={labelStyle}>
              Nome Fantasia
            </label>
            <input
              id="company-tradeName"
              {...register('tradeName')}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="company-cnpj" style={labelStyle}>
              CNPJ {mode === 'create' && <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>}
            </label>
            {mode === 'create' ? (
              <>
                <input
                  id="company-cnpj"
                  {...register('cnpj')}
                  style={inputStyle}
                  placeholder="14 dígitos sem formatação"
                  maxLength={14}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                />
                {errors.cnpj && (
                  <span style={errorStyle} role="alert">
                    {errors.cnpj.message}
                  </span>
                )}
              </>
            ) : (
              <input id="company-cnpj" value={cnpj} readOnly style={inputReadonlyStyle} />
            )}
          </div>
        </div>
      </div>

      {/* ── Contato ──────────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>Contato</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={fieldStyle}>
            <label htmlFor="company-email" style={labelStyle}>
              E-mail
            </label>
            <input
              id="company-email"
              type="email"
              {...register('email')}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
            {errors.email && (
              <span style={errorStyle} role="alert">
                {errors.email.message}
              </span>
            )}
          </div>
          <div style={fieldStyle}>
            <label htmlFor="company-phone" style={labelStyle}>
              Telefone
            </label>
            <input
              id="company-phone"
              {...register('phone')}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
        </div>
      </div>

      {/* ── Endereço ─────────────────────────────────────────── */}
      <div>
        <div style={sectionTitle}>Endereço</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
          <div style={{ ...fieldStyle, gridColumn: 'span 4' }}>
            <label htmlFor="company-street" style={labelStyle}>
              Logradouro
            </label>
            <input
              id="company-street"
              {...register('street')}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label htmlFor="company-number" style={labelStyle}>
              Número
            </label>
            <input
              id="company-number"
              {...register('number')}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 3' }}>
            <label htmlFor="company-complement" style={labelStyle}>
              Complemento
            </label>
            <input
              id="company-complement"
              {...register('complement')}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 3' }}>
            <label htmlFor="company-city" style={labelStyle}>
              Cidade
            </label>
            <input
              id="company-city"
              {...register('city')}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 1' }}>
            <label htmlFor="company-state" style={labelStyle}>
              UF
            </label>
            <input
              id="company-state"
              {...register('state')}
              maxLength={2}
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
          <div style={{ ...fieldStyle, gridColumn: 'span 2' }}>
            <label htmlFor="company-zipCode" style={labelStyle}>
              CEP
            </label>
            <input
              id="company-zipCode"
              {...register('zipCode')}
              maxLength={8}
              placeholder="8 dígitos"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={loading}>
          {loading && (
            <Loader2 size={15} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />
          )}
          {mode === 'create' ? 'Criar Empresa' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  )
}
