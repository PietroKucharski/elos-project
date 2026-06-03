'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { removeMember, updateMemberRole } from '@/lib/api'
import { cn } from '@/lib/utils'
// apps/web/src/components/domain/members-table.tsx
import type { MemberResponse } from '@elos/shared'
import { MoreHorizontal, Pencil, Shield, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

// Classes de badge por papel — fiel ao STATUS_MAP do protótipo
const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'text-primary bg-primary-soft border-primary-soft-border',
  ADMIN_EMPRESA: 'text-primary bg-primary-soft border-primary-soft-border',
  COMPRADOR: 'text-info bg-info-soft border-info-border',
  ALMOXARIFE: 'text-info bg-info-soft border-info-border',
  ANALISTA_FINANCEIRO: 'text-info bg-info-soft border-info-border',
  TRANSPORTADOR: 'text-muted-foreground bg-muted border-border',
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_EMPRESA: 'Administrador',
  COMPRADOR: 'Comprador',
  ALMOXARIFE: 'Almoxarife',
  ANALISTA_FINANCEIRO: 'Analista Financeiro',
  TRANSPORTADOR: 'Transportador',
}

const ASSIGNABLE_ROLES = [
  'ADMIN_EMPRESA',
  'COMPRADOR',
  'ALMOXARIFE',
  'ANALISTA_FINANCEIRO',
  'TRANSPORTADOR',
] as const

// Avatar com iniciais, igual ao componente Avatar do protótipo
const PALETTE = [
  '243 75% 59%',
  '199 89% 42%',
  '142 60% 40%',
  '262 60% 55%',
  '20 85% 52%',
  '330 65% 52%',
]
function avatarColor(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length] ?? PALETTE[0]!
}
function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

const TH =
  'border-b border-border px-4 pb-2.5 text-left text-[11.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase'
const MENU_ITEM =
  'flex w-full cursor-pointer items-center gap-[9px] rounded-md px-[9px] py-2 text-left text-[13.5px] transition-colors'

interface MembersTableProps {
  cnpj: string
  members: MemberResponse[]
  currentUserId: string
}

// Mini dropdown de papel (abre ao clicar em "Editar papel" no kebab)
function RoleEditor({
  cnpj,
  userId,
  currentRole,
  onClose,
}: {
  cnpj: string
  userId: string
  currentRole: string
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function change(role: (typeof ASSIGNABLE_ROLES)[number]) {
    setLoading(true)
    try {
      await updateMemberRole(cnpj, userId, { role })
      toast.success('Papel atualizado.')
      onClose()
      router.refresh()
    } catch (error) {
      console.error('[RoleEditor]', error)
      toast.error('Erro ao atualizar papel.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="absolute top-[calc(100%+4px)] right-0 z-[60] w-[210px] rounded-lg border border-border bg-card p-[5px] shadow-pop [animation:popIn_0.14s_ease]">
      <div className="px-[9px] pt-[7px] pb-[5px] text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
        Alterar papel
      </div>
      {ASSIGNABLE_ROLES.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => change(role)}
          disabled={loading}
          className="flex w-full cursor-pointer items-center justify-between rounded-md px-[9px] py-2 text-left text-[13.5px] text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          {ROLE_LABELS[role]}
          {role === currentRole && <Shield size={13} className="text-primary" />}
        </button>
      ))}
    </div>
  )
}

export function MembersTable({ cnpj, members, currentUserId }: MembersTableProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<string | null>(null)
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleRemove() {
    if (!removeTarget) return
    setLoadingId(removeTarget.userId)
    try {
      await removeMember(cnpj, removeTarget.userId)
      toast.success(`${removeTarget.name} foi removido da empresa.`)
      setRemoveTarget(null)
      router.refresh()
    } catch (error) {
      console.error('[MembersTable.handleRemove]', error)
      toast.error('Não foi possível remover o membro.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr>
              <th className={TH}>Usuário</th>
              <th className={TH}>Papel</th>
              <th className={cn(TH, 'w-12 text-right')} />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Nenhum membro encontrado.
                </td>
              </tr>
            )}
            {members.map((member, index) => {
              const isSelf = member.userId === currentUserId
              const isSuperAdmin = member.role === 'SUPER_ADMIN'
              const isLoading = loadingId === member.userId
              const color = avatarColor(member.user.name)
              const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.TRANSPORTADOR!

              return (
                <tr
                  key={member.id}
                  className="border-b border-border [animation:rowIn_.3s_ease_both]"
                  style={{ animationDelay: `${Math.min(index * 0.025, 0.3)}s` }}
                >
                  {/* Usuário: avatar + nome + email */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-[11px]">
                      <div
                        className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold"
                        style={{
                          background: `hsl(${color} / 0.13)`,
                          color: `hsl(${color})`,
                          borderColor: `hsl(${color} / 0.2)`,
                        }}
                      >
                        {getInitials(member.user.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {member.user.name}
                          {isSelf && (
                            <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                              (você)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{member.user.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Badge de papel */}
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex h-[22px] items-center gap-[5px] rounded-full border px-2 text-[11.5px] font-semibold',
                        badge,
                      )}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>

                  {/* Kebab menu */}
                  <td className="px-4 py-3 text-right">
                    {!isSuperAdmin && (
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpen(menuOpen === member.userId ? null : member.userId)
                          }
                          disabled={isLoading}
                          aria-label={`Ações para ${member.user.name}`}
                          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                        >
                          <MoreHorizontal size={16} strokeWidth={1.6} />
                        </button>

                        {menuOpen === member.userId && (
                          <div className="absolute top-[calc(100%+4px)] right-0 z-50 w-[210px] rounded-lg border border-border bg-card p-[5px] shadow-pop [animation:popIn_0.14s_ease]">
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpen(null)
                                  setEditRole(member.userId)
                                }}
                                className={cn(MENU_ITEM, 'text-foreground hover:bg-muted')}
                              >
                                <Pencil
                                  size={15}
                                  strokeWidth={1.6}
                                  className="text-muted-foreground"
                                />
                                Editar papel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpen(null)
                                setRemoveTarget({ userId: member.userId, name: member.user.name })
                              }}
                              className={cn(
                                MENU_ITEM,
                                'text-destructive hover:bg-destructive-soft',
                              )}
                            >
                              <XCircle size={15} strokeWidth={1.6} /> Remover da empresa
                            </button>
                          </div>
                        )}

                        {/* Role editor dropdown (aparece após "Editar papel") */}
                        {editRole === member.userId && (
                          <RoleEditor
                            cnpj={cnpj}
                            userId={member.userId}
                            currentRole={member.role}
                            onClose={() => setEditRole(null)}
                          />
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* AlertDialog de confirmação de remoção */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{removeTarget?.name}</strong> da empresa? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
