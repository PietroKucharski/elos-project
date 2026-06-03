import type { InviteMemberDto, UpdateMemberRoleDto } from '@elos/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, count, eq } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { users } from '../../db/schema/auth'
import { companies, companyMembers } from '../../db/schema/companies'
import { auth } from '../auth/better-auth'

@Injectable()
export class MembersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
    @Inject(AbilityFactory) private readonly abilityFactory: AbilityFactory,
  ) {}

  // GET /v1/companies/:cnpj/members
  async findAll(user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'CompanyMember')) {
      throw new ForbiddenException('Sem permissão para listar membros.')
    }

    return this.db
      .select({
        id: companyMembers.id,
        companyId: companyMembers.companyId,
        userId: companyMembers.userId,
        role: companyMembers.role,
        createdAt: companyMembers.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(companyMembers)
      .innerJoin(users, eq(users.id, companyMembers.userId))
      .where(eq(companyMembers.companyId, user.companyId!))
      .orderBy(companyMembers.createdAt)
  }

  // POST /v1/companies/:cnpj/members
  async invite(dto: InviteMemberDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'CompanyMember')) {
      throw new ForbiddenException('Sem permissão para convidar membros.')
    }

    // Verificar se usuário já existe pelo e-mail
    const existingUser = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1)
      .then((rows) => rows[0] ?? null)

    let targetUserId: string

    if (existingUser) {
      // Verificar se já é membro desta empresa
      const existingMembership = await this.db
        .select({ id: companyMembers.id })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.userId, existingUser.id),
            eq(companyMembers.companyId, user.companyId!),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null)

      if (existingMembership) {
        throw new ConflictException('Este usuário já é membro desta empresa.')
      }

      targetUserId = existingUser.id
    } else {
      // Criar usuário com senha temporária. O usuário deverá redefinir a senha
      // (fluxo "esqueci a senha") quando disponível.
      const tempPassword = generateTempPassword()

      const newUser = await auth.api.signUpEmail({
        body: {
          email: dto.email,
          name: dto.name,
          password: tempPassword,
        },
      })

      if (!newUser?.user?.id) {
        throw new BadRequestException('Não foi possível criar o usuário.')
      }

      targetUserId = newUser.user.id
    }

    // Criar vínculo de membro
    const [member] = await this.db
      .insert(companyMembers)
      .values({
        companyId: user.companyId!,
        userId: targetUserId,
        role: dto.role,
      })
      .returning()

    if (!member) {
      throw new BadRequestException('Não foi possível criar o vínculo de membro.')
    }

    // Buscar dados completos para retorno
    const [result] = await this.db
      .select({
        id: companyMembers.id,
        companyId: companyMembers.companyId,
        userId: companyMembers.userId,
        role: companyMembers.role,
        createdAt: companyMembers.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(companyMembers)
      .innerJoin(users, eq(users.id, companyMembers.userId))
      .where(eq(companyMembers.id, member.id))

    return result
  }

  // PATCH /v1/companies/:cnpj/members/:userId
  async updateRole(targetUserId: string, dto: UpdateMemberRoleDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'CompanyMember')) {
      throw new ForbiddenException('Sem permissão para alterar papel de membro.')
    }

    // Um ADMIN_EMPRESA não pode alterar seu próprio papel
    if (targetUserId === user.id) {
      throw new BadRequestException('Não é possível alterar o próprio papel.')
    }

    const membership = await this.db
      .select()
      .from(companyMembers)
      .where(
        and(eq(companyMembers.userId, targetUserId), eq(companyMembers.companyId, user.companyId!)),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!membership) throw new NotFoundException('Membro não encontrado.')

    const [updated] = await this.db
      .update(companyMembers)
      .set({ role: dto.role, updatedAt: new Date() })
      .where(eq(companyMembers.id, membership.id))
      .returning()

    if (!updated) throw new NotFoundException('Membro não encontrado.')

    return updated
  }

  // DELETE /v1/companies/:cnpj/members/:userId
  async remove(targetUserId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('delete', 'CompanyMember')) {
      throw new ForbiddenException('Sem permissão para remover membro.')
    }

    // Não pode remover a si mesmo
    if (targetUserId === user.id) {
      throw new BadRequestException('Não é possível remover a si mesmo.')
    }

    const membership = await this.db
      .select()
      .from(companyMembers)
      .where(
        and(eq(companyMembers.userId, targetUserId), eq(companyMembers.companyId, user.companyId!)),
      )
      .limit(1)
      .then((rows) => rows[0] ?? null)

    if (!membership) throw new NotFoundException('Membro não encontrado.')

    // Garantir que não é o último ADMIN_EMPRESA
    if (membership.role === 'ADMIN_EMPRESA') {
      const adminCount = await this.db
        .select({ count: count() })
        .from(companyMembers)
        .where(
          and(
            eq(companyMembers.companyId, user.companyId!),
            eq(companyMembers.role, 'ADMIN_EMPRESA'),
          ),
        )
        .then((rows) => rows[0]?.count ?? 0)

      if (Number(adminCount) <= 1) {
        throw new BadRequestException('Não é possível remover o único ADMIN_EMPRESA da empresa.')
      }
    }

    await this.db.delete(companyMembers).where(eq(companyMembers.id, membership.id))

    return { success: true }
  }

  // GET /v1/me/companies — empresas do usuário logado (para company switcher)
  async getMyCompanies(user: SessionUser) {
    return this.db
      .select({
        companyId: companyMembers.companyId,
        companyName: companies.name,
        cnpj: companies.cnpj,
        role: companyMembers.role,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companies.id, companyMembers.companyId))
      .where(eq(companyMembers.userId, user.id))
      .orderBy(companies.name)
  }
}

// Gera senha temporária de 12 caracteres
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
