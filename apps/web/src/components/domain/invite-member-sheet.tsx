'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { inviteMember } from '@/lib/api'
import { inviteMemberSchema } from '@elos/shared'
import type { InviteMemberDto } from '@elos/shared'
// apps/web/src/components/domain/invite-member-sheet.tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const ROLE_LABELS: Record<string, string> = {
  ADMIN_EMPRESA: 'Administrador',
  COMPRADOR: 'Comprador',
  ALMOXARIFE: 'Almoxarife',
  ANALISTA_FINANCEIRO: 'Analista Financeiro',
  TRANSPORTADOR: 'Transportador',
}

// Permissões exibidas no card de preview (igual ao protótipo ROLE_PERMS)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN_EMPRESA: [
    'Gerenciar usuários e fornecedores',
    'Configurações da empresa',
    'Todos os módulos',
  ],
  COMPRADOR: ['Criar cotações e pedidos', 'Aprovar fornecedores', 'Gerenciar produtos'],
  ALMOXARIFE: ['Registrar recebimentos', 'Movimentações de estoque', 'Abrir não-conformidades'],
  ANALISTA_FINANCEIRO: ['Validar notas fiscais', 'Registrar pagamentos', 'Conciliação financeira'],
  TRANSPORTADOR: ['Acompanhar entregas', 'Atualizar status de transporte'],
}

interface InviteMemberSheetProps {
  cnpj: string
}

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
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: 'hsl(217 33% 17%)' }
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const errorStyle: React.CSSProperties = { fontSize: 12, color: 'hsl(0 72% 51%)' }

function inputFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'hsl(243 75% 59%)'
  e.target.style.boxShadow = '0 0 0 3px hsl(243 75% 59% / 0.13)'
}
function inputBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = 'hsl(214 32% 91%)'
  e.target.style.boxShadow = 'none'
}

export function InviteMemberSheet({ cnpj }: InviteMemberSheetProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteMemberDto>({ resolver: zodResolver(inviteMemberSchema) })

  const selectedRole = watch('role')
  const permissions = selectedRole ? (ROLE_PERMISSIONS[selectedRole] ?? []) : []

  async function onSubmit(data: InviteMemberDto) {
    setLoading(true)
    try {
      await inviteMember(cnpj, data)
      toast.success(`${data.name} foi convidado com sucesso.`)
      reset()
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('[InviteMemberSheet.onSubmit]', error)
      toast.error('Erro ao convidar membro. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus size={15} strokeWidth={1.5} style={{ marginRight: 6 }} />
        Convidar usuário
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent style={{ width: 440, display: 'flex', flexDirection: 'column' }}>
          <SheetHeader>
            <SheetTitle style={{ fontSize: 17, fontWeight: 600 }}>Convidar usuário</SheetTitle>
            <p style={{ fontSize: 13, color: 'hsl(215 16% 47%)', marginTop: 3 }}>
              O usuário receberá acesso imediato com a senha definida pelo administrador.
            </p>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '22px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            <div style={fieldStyle}>
              <label htmlFor="invite-name" style={labelStyle}>
                Nome <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
              </label>
              <input
                id="invite-name"
                {...register('name')}
                placeholder="Nome completo"
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
              <label htmlFor="invite-email" style={labelStyle}>
                E-mail <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
              </label>
              <input
                id="invite-email"
                type="email"
                {...register('email')}
                placeholder="pessoa@empresa.com.br"
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
              <label htmlFor="invite-role" style={labelStyle}>
                Papel na empresa <span style={{ color: 'hsl(0 72% 51%)' }}>*</span>
              </label>
              {/* Select nativo estilizado — igual ao protótipo ui.jsx Select */}
              <div style={{ position: 'relative' }}>
                <select
                  id="invite-role"
                  {...register('role')}
                  style={{
                    ...inputStyle,
                    appearance: 'none',
                    padding: '0 32px 0 12px',
                    cursor: 'pointer',
                  }}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Selecione um papel
                  </option>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'hsl(215 16% 47%)',
                    pointerEvents: 'none',
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              {errors.role && (
                <span style={errorStyle} role="alert">
                  {errors.role.message}
                </span>
              )}
            </div>

            {/* Card de preview das permissões do papel */}
            {permissions.length > 0 && (
              <div
                style={{
                  background: 'hsl(210 40% 96.1%)',
                  borderRadius: '0.375rem',
                  padding: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: 'hsl(222 47% 11%)',
                  }}
                >
                  Permissões do papel
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {permissions.map((p) => (
                    <div
                      key={p}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12.5,
                        color: 'hsl(217 33% 17%)',
                      }}
                    >
                      <Check
                        size={14}
                        strokeWidth={2}
                        style={{ color: 'hsl(142 71% 40%)', flexShrink: 0 }}
                      />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          <SheetFooter
            style={{
              padding: '16px 0 0',
              borderTop: '1px solid hsl(214 32% 91%)',
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading && (
                <Loader2
                  size={15}
                  style={{ marginRight: 6, animation: 'spin 1s linear infinite' }}
                />
              )}
              Enviar convite
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
