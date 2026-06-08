import { subject } from '@casl/ability'
import type {
  AddNcCommentDto,
  AnalyzeNcDto,
  CreateNonConformityDto,
  RejectNcDto,
  ResolveNcDto,
  UpdateNonConformityDto,
} from '@elos/shared'
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { type SQL, and, desc, eq, ilike } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { users } from '../../db/schema/auth'
import { ncComments, nonConformities } from '../../db/schema/non-conformities'
import { products } from '../../db/schema/products'
import { purchaseOrders } from '../../db/schema/purchase-orders'
import { suppliers } from '../../db/schema/suppliers'

@Injectable()
export class NonConformitiesService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?: string | undefined
      type?: string | undefined
      severity?: string | undefined
      supplierId?: string | undefined
      purchaseOrderId?: string | undefined
      search?: string | undefined
      page?: string | undefined
      limit?: string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'NonConformity')) {
      throw new ForbiddenException('Sem permissão para listar não-conformidades.')
    }

    // Parse seguro: `?page=abc`/`?limit=` produzem NaN; cai no default.
    const parsedPage = Number.parseInt(query.page ?? '', 10)
    const parsedLimit = Number.parseInt(query.limit ?? '', 10)
    const page = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage)
    const limit = Math.min(100, Math.max(1, Number.isNaN(parsedLimit) ? 20 : parsedLimit))
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(nonConformities.companyId, user.companyId!)]
    if (query.status) conditions.push(eq(nonConformities.status, query.status as 'OPEN'))
    if (query.type) conditions.push(eq(nonConformities.type, query.type as 'QUALITY'))
    if (query.severity) conditions.push(eq(nonConformities.severity, query.severity as 'LOW'))
    if (query.supplierId) conditions.push(eq(nonConformities.supplierId, query.supplierId))
    if (query.purchaseOrderId) {
      conditions.push(eq(nonConformities.purchaseOrderId, query.purchaseOrderId))
    }
    if (query.search) conditions.push(ilike(nonConformities.description, `%${query.search}%`))

    return this.db
      .select({
        id: nonConformities.id,
        companyId: nonConformities.companyId,
        purchaseOrderId: nonConformities.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        supplierId: nonConformities.supplierId,
        supplierName: suppliers.name,
        productId: nonConformities.productId,
        productName: products.name,
        type: nonConformities.type,
        severity: nonConformities.severity,
        description: nonConformities.description,
        status: nonConformities.status,
        resolution: nonConformities.resolution,
        notes: nonConformities.notes,
        resolvedAt: nonConformities.resolvedAt,
        createdById: nonConformities.createdById,
        createdByName: users.name,
        createdAt: nonConformities.createdAt,
        updatedAt: nonConformities.updatedAt,
      })
      .from(nonConformities)
      .innerJoin(suppliers, eq(suppliers.id, nonConformities.supplierId))
      .leftJoin(purchaseOrders, eq(purchaseOrders.id, nonConformities.purchaseOrderId))
      .leftJoin(products, eq(products.id, nonConformities.productId))
      .innerJoin(users, eq(users.id, nonConformities.createdById))
      .where(and(...conditions))
      .orderBy(desc(nonConformities.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'NonConformity')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [nc] = await this.db
      .select({
        id: nonConformities.id,
        companyId: nonConformities.companyId,
        purchaseOrderId: nonConformities.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        supplierId: nonConformities.supplierId,
        supplierName: suppliers.name,
        productId: nonConformities.productId,
        productName: products.name,
        type: nonConformities.type,
        severity: nonConformities.severity,
        description: nonConformities.description,
        status: nonConformities.status,
        resolution: nonConformities.resolution,
        notes: nonConformities.notes,
        resolvedAt: nonConformities.resolvedAt,
        createdById: nonConformities.createdById,
        createdByName: users.name,
        createdAt: nonConformities.createdAt,
        updatedAt: nonConformities.updatedAt,
      })
      .from(nonConformities)
      .innerJoin(suppliers, eq(suppliers.id, nonConformities.supplierId))
      .leftJoin(purchaseOrders, eq(purchaseOrders.id, nonConformities.purchaseOrderId))
      .leftJoin(products, eq(products.id, nonConformities.productId))
      .innerJoin(users, eq(users.id, nonConformities.createdById))
      .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
      .limit(1)

    if (!nc) throw new NotFoundException('Não-conformidade não encontrada.')

    const comments = await this.db
      .select({
        id: ncComments.id,
        nonConformityId: ncComments.nonConformityId,
        userId: ncComments.userId,
        userName: users.name,
        text: ncComments.text,
        createdAt: ncComments.createdAt,
        updatedAt: ncComments.updatedAt,
      })
      .from(ncComments)
      .innerJoin(users, eq(users.id, ncComments.userId))
      .where(eq(ncComments.nonConformityId, id))
      .orderBy(ncComments.createdAt)

    return { ...nc, comments }
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateNonConformityDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'NonConformity')) {
      throw new ForbiddenException('Sem permissão para abrir não-conformidade.')
    }

    // Validar fornecedor (deve pertencer à empresa)
    const [supplier] = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(and(eq(suppliers.id, dto.supplierId), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.')

    // Validar PO (opcional — se informado, deve pertencer à empresa)
    if (dto.purchaseOrderId) {
      const [po] = await this.db
        .select({ id: purchaseOrders.id })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, dto.purchaseOrderId),
            eq(purchaseOrders.companyId, user.companyId!),
          ),
        )
        .limit(1)

      if (!po) throw new NotFoundException('Pedido de compra não encontrado.')
    }

    return this.db.transaction(async (tx) => {
      const [nc] = await tx
        .insert(nonConformities)
        .values({
          companyId: user.companyId!,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          supplierId: dto.supplierId,
          productId: dto.productId ?? null,
          type: dto.type,
          severity: dto.severity,
          description: dto.description,
          notes: dto.notes ?? null,
          status: 'OPEN',
          createdById: user.id,
        })
        .returning()

      if (!nc) throw new Error('Falha ao criar não-conformidade.')

      await tx.insert(auditLogs).values({
        entity: 'NonConformity',
        entityId: nc.id,
        action: 'CREATE',
        after: {
          type: dto.type,
          severity: dto.severity,
          status: 'OPEN',
          supplierId: dto.supplierId,
        },
        userId: user.id,
        companyId: user.companyId,
      })

      return nc
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateNonConformityDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(nonConformities)
      .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Não-conformidade não encontrada.')
    if (ability.cannot('update', subject('NonConformity', existing))) {
      throw new ForbiddenException('Sem permissão para editar esta não-conformidade.')
    }
    if (existing.status !== 'OPEN') {
      throw new BadRequestException('Somente não-conformidades abertas (OPEN) podem ser editadas.')
    }

    return this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.type !== undefined) updateData.type = dto.type
      if (dto.severity !== undefined) updateData.severity = dto.severity
      if (dto.description !== undefined) updateData.description = dto.description
      if (dto.notes !== undefined) updateData.notes = dto.notes

      const [updated] = await tx
        .update(nonConformities)
        .set(updateData)
        .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Não-conformidade não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'NonConformity',
        entityId: id,
        action: 'UPDATE',
        before: {
          type: existing.type,
          severity: existing.severity,
          description: existing.description,
        },
        after: updateData,
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── analyze ──────────────────────────────────────────────────────────────

  async analyze(id: string, dto: AnalyzeNcDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(nonConformities)
      .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Não-conformidade não encontrada.')
    if (ability.cannot('update', subject('NonConformity', existing))) {
      throw new ForbiddenException('Sem permissão para analisar esta não-conformidade.')
    }
    if (existing.status !== 'OPEN') {
      throw new BadRequestException(
        `Apenas NCs abertas podem ser enviadas para análise. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status: 'ANALYZING',
        updatedAt: new Date(),
      }
      if (dto.notes) updateData.notes = dto.notes

      const [updated] = await tx
        .update(nonConformities)
        .set(updateData)
        .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Não-conformidade não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'NonConformity',
        entityId: id,
        action: 'ANALYZE',
        before: { status: 'OPEN' },
        after: { status: 'ANALYZING' },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── resolve ──────────────────────────────────────────────────────────────

  async resolve(id: string, dto: ResolveNcDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(nonConformities)
      .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Não-conformidade não encontrada.')
    if (ability.cannot('update', subject('NonConformity', existing))) {
      throw new ForbiddenException('Sem permissão para resolver esta não-conformidade.')
    }
    if (existing.status !== 'ANALYZING') {
      throw new BadRequestException(
        `Apenas NCs em análise podem ser resolvidas. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(nonConformities)
        .set({
          status: 'RESOLVED',
          resolution: dto.resolution,
          resolvedAt: now,
          updatedAt: now,
        })
        .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Não-conformidade não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'NonConformity',
        entityId: id,
        action: 'RESOLVE',
        before: { status: 'ANALYZING' },
        after: { status: 'RESOLVED', resolution: dto.resolution },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── reject ───────────────────────────────────────────────────────────────

  async reject(id: string, dto: RejectNcDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(nonConformities)
      .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Não-conformidade não encontrada.')
    if (ability.cannot('update', subject('NonConformity', existing))) {
      throw new ForbiddenException('Sem permissão para rejeitar esta não-conformidade.')
    }
    if (existing.status !== 'ANALYZING') {
      throw new BadRequestException(
        `Apenas NCs em análise podem ser rejeitadas. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(nonConformities)
        .set({
          status: 'REJECTED',
          resolution: dto.resolution,
          resolvedAt: now,
          updatedAt: now,
        })
        .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Não-conformidade não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'NonConformity',
        entityId: id,
        action: 'REJECT',
        before: { status: 'ANALYZING' },
        after: { status: 'REJECTED', resolution: dto.resolution },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── addComment ───────────────────────────────────────────────────────────

  async addComment(id: string, dto: AddNcCommentDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'NonConformity')) {
      throw new ForbiddenException('Sem permissão para comentar.')
    }

    // Verificar que a NC pertence à empresa
    const [nc] = await this.db
      .select({ id: nonConformities.id })
      .from(nonConformities)
      .where(and(eq(nonConformities.id, id), eq(nonConformities.companyId, user.companyId!)))
      .limit(1)

    if (!nc) throw new NotFoundException('Não-conformidade não encontrada.')

    const [comment] = await this.db
      .insert(ncComments)
      .values({
        nonConformityId: id,
        userId: user.id,
        text: dto.text,
      })
      .returning()

    return comment
  }
}
