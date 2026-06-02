import { z } from 'zod'
import { Role } from '../enums'

// Roles que um ADMIN_EMPRESA pode atribuir a outros usuários.
// SUPER_ADMIN não pode ser atribuído via este endpoint — é gerenciado
// fora do fluxo de empresa normal.
const assignableRoles = [
  Role.ADMIN_EMPRESA,
  Role.COMPRADOR,
  Role.ALMOXARIFE,
  Role.ANALISTA_FINANCEIRO,
  Role.TRANSPORTADOR,
] as const

export const inviteMemberSchema = z.object({
  email: z.string().email('E-mail inválido'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  role: z.enum(assignableRoles, {
    error: () => 'Papel inválido para atribuição',
  }),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(assignableRoles, {
    error: () => 'Papel inválido para atribuição',
  }),
})

// Shape aninhado: membro + dados do usuário (JOIN no Service)
export const memberResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  userId: z.string(),
  role: z.nativeEnum(Role),
  createdAt: z.string().datetime(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
})

// Shape resumido para o company switcher no frontend
export const myCompanySchema = z.object({
  companyId: z.string().uuid(),
  companyName: z.string(),
  cnpj: z.string(),
  role: z.nativeEnum(Role),
})

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>
export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>
export type MemberResponse = z.infer<typeof memberResponseSchema>
export type MyCompany = z.infer<typeof myCompanySchema>
