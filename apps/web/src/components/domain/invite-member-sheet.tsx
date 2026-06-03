'use client'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { inviteMember } from '@/lib/api'
import { cn } from '@/lib/utils'
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

const FIELD = 'flex flex-col gap-1.5'
const LABEL = 'text-[13px] font-medium text-foreground-2'
const INPUT =
  'h-[38px] w-full rounded-md border border-input bg-card px-3 text-[13.5px] text-foreground outline-none transition-[border-color,box-shadow] focus:border-ring focus:ring-3 focus:ring-ring/[0.13]'
const SELECT = cn(INPUT, 'cursor-pointer appearance-none pr-8')
const ERROR = 'text-xs text-destructive'

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
        <UserPlus size={15} strokeWidth={1.5} className="mr-1.5" />
        Convidar usuário
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex w-[440px] flex-col">
          <SheetHeader>
            <SheetTitle className="text-[17px] font-semibold">Convidar usuário</SheetTitle>
            <p className="mt-[3px] text-[13px] text-muted-foreground">
              O usuário receberá acesso imediato com a senha definida pelo administrador.
            </p>
          </SheetHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-1 flex-col gap-[18px] overflow-y-auto py-[22px]"
          >
            <div className={FIELD}>
              <label htmlFor="invite-name" className={LABEL}>
                Nome <span className="text-destructive">*</span>
              </label>
              <input
                id="invite-name"
                {...register('name')}
                placeholder="Nome completo"
                className={INPUT}
              />
              {errors.name && (
                <span className={ERROR} role="alert">
                  {errors.name.message}
                </span>
              )}
            </div>

            <div className={FIELD}>
              <label htmlFor="invite-email" className={LABEL}>
                E-mail <span className="text-destructive">*</span>
              </label>
              <input
                id="invite-email"
                type="email"
                {...register('email')}
                placeholder="pessoa@empresa.com.br"
                className={INPUT}
              />
              {errors.email && (
                <span className={ERROR} role="alert">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className={FIELD}>
              <label htmlFor="invite-role" className={LABEL}>
                Papel na empresa <span className="text-destructive">*</span>
              </label>
              {/* Select nativo estilizado — igual ao protótipo ui.jsx Select */}
              <div className="relative">
                <select id="invite-role" {...register('role')} className={SELECT} defaultValue="">
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
                  className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              {errors.role && (
                <span className={ERROR} role="alert">
                  {errors.role.message}
                </span>
              )}
            </div>

            {/* Card de preview das permissões do papel */}
            {permissions.length > 0 && (
              <div className="rounded-md bg-muted p-3.5">
                <div className="mb-2 text-[12.5px] font-semibold text-foreground">
                  Permissões do papel
                </div>
                <div className="flex flex-col gap-1.5">
                  {permissions.map((p) => (
                    <div
                      key={p}
                      className="flex items-center gap-2 text-[12.5px] text-foreground-2"
                    >
                      <Check size={14} strokeWidth={2} className="shrink-0 text-success" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          <SheetFooter className="flex justify-end gap-2.5 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit(onSubmit)} disabled={loading}>
              {loading && <Loader2 size={15} className="mr-1.5 animate-spin" />}
              Enviar convite
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
