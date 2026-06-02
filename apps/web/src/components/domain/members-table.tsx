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
// apps/web/src/components/domain/members-table.tsx
import type { MemberResponse } from '@elos/shared'
import { MoreHorizontal, Pencil, Shield, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

// Cores de badge por papel — fiel ao STATUS_MAP do protótipo
const ROLE_BADGE: Record<string, { fg: string; bg: string; bd: string }> = {
  SUPER_ADMIN: {
    fg: 'var(--color-primary)',
    bg: 'var(--color-primary-soft)',
    bd: 'var(--color-primary-soft-border)',
  },
  ADMIN_EMPRESA: {
    fg: 'var(--color-primary)',
    bg: 'var(--color-primary-soft)',
    bd: 'var(--color-primary-soft-border)',
  },
  COMPRADOR: {
    fg: 'var(--color-info)',
    bg: 'var(--color-info-soft)',
    bd: 'var(--color-info-border)',
  },
  ALMOXARIFE: {
    fg: 'var(--color-info)',
    bg: 'var(--color-info-soft)',
    bd: 'var(--color-info-border)',
  },
  ANALISTA_FINANCEIRO: {
    fg: 'var(--color-info)',
    bg: 'var(--color-info-soft)',
    bd: 'var(--color-info-border)',
  },
  TRANSPORTADOR: {
    fg: 'var(--color-muted-foreground)',
    bg: 'var(--color-muted)',
    bd: 'var(--color-border)',
  },
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
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        right: 0,
        zIndex: 60,
        width: 210,
        background: 'hsl(0 0% 100%)',
        border: '1px solid hsl(214 32% 91%)',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 16px -2px hsl(222 47% 11% / 0.12)',
        padding: 5,
        animation: 'popIn .14s ease',
      }}
    >
      <div
        style={{
          padding: '7px 9px 5px',
          fontSize: 11,
          fontWeight: 600,
          color: 'hsl(215 16% 47%)',
          textTransform: 'uppercase',
          letterSpacing: '.04em',
        }}
      >
        Alterar papel
      </div>
      {ASSIGNABLE_ROLES.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => change(role)}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '8px 9px',
            borderRadius: '0.375rem',
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
            fontSize: 13.5,
            color: 'hsl(222 47% 11%)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {ROLE_LABELS[role]}
          {role === currentRole && <Shield size={13} style={{ color: 'hsl(243 75% 59%)' }} />}
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

  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '0 16px 10px',
    fontSize: 11.5,
    fontWeight: 600,
    color: 'hsl(215 16% 47%)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    borderBottom: '1px solid hsl(214 32% 91%)',
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr>
              <th style={thStyle}>Usuário</th>
              <th style={thStyle}>Papel</th>
              <th style={{ ...thStyle, textAlign: 'right', width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{
                    textAlign: 'center',
                    padding: '48px 16px',
                    color: 'hsl(215 16% 47%)',
                    fontSize: 14,
                  }}
                >
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
                  style={{
                    borderBottom: '1px solid hsl(214 32% 91%)',
                    animation: `rowIn .3s ease ${Math.min(index * 0.025, 0.3)}s both`,
                  }}
                >
                  {/* Usuário: avatar + nome + email */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 999,
                          flexShrink: 0,
                          background: `hsl(${color} / 0.13)`,
                          color: `hsl(${color})`,
                          border: `1px solid hsl(${color} / 0.2)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {getInitials(member.user.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'hsl(222 47% 11%)' }}>
                          {member.user.name}
                          {isSelf && (
                            <span
                              style={{
                                fontSize: 11,
                                color: 'hsl(215 16% 47%)',
                                fontWeight: 400,
                                marginLeft: 6,
                              }}
                            >
                              (você)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'hsl(215 16% 47%)' }}>
                          {member.user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Badge de papel */}
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        height: 22,
                        padding: '0 8px',
                        borderRadius: 999,
                        background: `hsl(${badge!.bg})`,
                        color: `hsl(${badge!.fg})`,
                        border: `1px solid hsl(${badge!.bd})`,
                        fontSize: 11.5,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 99,
                          background: `hsl(${badge!.fg})`,
                        }}
                      />
                      {ROLE_LABELS[member.role]}
                    </span>
                  </td>

                  {/* Kebab menu */}
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {!isSuperAdmin && (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpen(menuOpen === member.userId ? null : member.userId)
                          }
                          disabled={isLoading}
                          aria-label={`Ações para ${member.user.name}`}
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '0.375rem',
                            border: 'none',
                            background: 'transparent',
                            color: 'hsl(215 16% 47%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background .12s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <MoreHorizontal size={16} strokeWidth={1.6} />
                        </button>

                        {menuOpen === member.userId && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              right: 0,
                              zIndex: 50,
                              width: 210,
                              background: 'hsl(0 0% 100%)',
                              border: '1px solid hsl(214 32% 91%)',
                              borderRadius: '0.5rem',
                              boxShadow: '0 4px 16px -2px hsl(222 47% 11% / 0.12)',
                              padding: 5,
                              animation: 'popIn .14s ease',
                            }}
                          >
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuOpen(null)
                                  setEditRole(member.userId)
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 9,
                                  width: '100%',
                                  padding: '8px 9px',
                                  borderRadius: '0.375rem',
                                  border: 'none',
                                  background: 'transparent',
                                  fontSize: 13.5,
                                  color: 'hsl(222 47% 11%)',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'hsl(210 40% 96.1%)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'transparent'
                                }}
                              >
                                <Pencil
                                  size={15}
                                  strokeWidth={1.6}
                                  style={{ color: 'hsl(215 16% 47%)' }}
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
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 9,
                                width: '100%',
                                padding: '8px 9px',
                                borderRadius: '0.375rem',
                                border: 'none',
                                background: 'transparent',
                                fontSize: 13.5,
                                color: 'hsl(0 72% 51%)',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'hsl(0 86% 97%)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
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
              style={{ background: 'hsl(0 72% 51%)', color: '#fff' }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
