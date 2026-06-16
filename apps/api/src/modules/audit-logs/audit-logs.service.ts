import type { AuditLogQuery } from '@elos/shared'
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { type SQL, and, desc, eq, gte, lte } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { users } from '../../db/schema/auth'

@Injectable()
export class AuditLogsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(user: SessionUser, query: AuditLogQuery) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'AuditLog')) {
      throw new ForbiddenException('Sem permissão para consultar audit logs.')
    }

    // page/limit já validados e com default pelo auditLogQuerySchema na borda.
    const { page, limit } = query
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(auditLogs.companyId, user.companyId!)]
    if (query.entity) conditions.push(eq(auditLogs.entity, query.entity))
    if (query.entityId) conditions.push(eq(auditLogs.entityId, query.entityId))
    if (query.action) conditions.push(eq(auditLogs.action, query.action))
    if (query.userId) conditions.push(eq(auditLogs.userId, query.userId))
    if (query.startDate) conditions.push(gte(auditLogs.createdAt, new Date(query.startDate)))
    if (query.endDate) conditions.push(lte(auditLogs.createdAt, new Date(query.endDate)))

    return this.db
      .select({
        id: auditLogs.id,
        companyId: auditLogs.companyId,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        before: auditLogs.before,
        after: auditLogs.after,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'AuditLog')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [log] = await this.db
      .select({
        id: auditLogs.id,
        companyId: auditLogs.companyId,
        userId: auditLogs.userId,
        userName: users.name,
        userEmail: users.email,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        action: auditLogs.action,
        before: auditLogs.before,
        after: auditLogs.after,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(and(eq(auditLogs.id, id), eq(auditLogs.companyId, user.companyId!)))
      .limit(1)

    if (!log) throw new NotFoundException('Registro de audit log não encontrado.')
    return log
  }

  // ─── getDistinctEntities ──────────────────────────────────────────────────

  async getDistinctEntities(user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'AuditLog')) {
      throw new ForbiddenException('Sem permissão.')
    }

    // Retorna entidades distintas já registradas para esta empresa
    const results = await this.db
      .selectDistinct({ entity: auditLogs.entity })
      .from(auditLogs)
      .where(eq(auditLogs.companyId, user.companyId!))
      .orderBy(auditLogs.entity)

    return results.map((r) => r.entity)
  }

  // ─── getDistinctActions ───────────────────────────────────────────────────

  async getDistinctActions(user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'AuditLog')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const results = await this.db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.companyId, user.companyId!))
      .orderBy(auditLogs.action)

    return results.map((r) => r.action)
  }
}
