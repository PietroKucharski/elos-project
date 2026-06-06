import { subject } from '@casl/ability'
import type { CreateWarehouseDto, UpdateWarehouseDto } from '@elos/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, ilike, or, sql } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { products } from '../../db/schema/products'
import { inventory, warehouses } from '../../db/schema/warehouses'

@Injectable()
export class WarehousesService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ─────────────────────────────────────────────────────────────

  async findAll(user: SessionUser, query: { includeInactive?: string | undefined }) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Warehouse')) {
      throw new ForbiddenException('Sem permissão para listar armazéns.')
    }

    const includeInactive = query.includeInactive === 'true'

    const conditions = [eq(warehouses.companyId, user.companyId!)]
    if (!includeInactive) {
      conditions.push(eq(warehouses.isActive, true))
    }

    return this.db
      .select()
      .from(warehouses)
      .where(and(...conditions))
      .orderBy(warehouses.name)
  }

  // ─── findOne ─────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Warehouse')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [warehouse] = await this.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.companyId, user.companyId!)))
      .limit(1)

    if (!warehouse) throw new NotFoundException('Armazém não encontrado.')
    return warehouse
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateWarehouseDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Warehouse')) {
      throw new ForbiddenException('Sem permissão para criar armazém.')
    }

    // Verificar código duplicado (opcional)
    if (dto.code) {
      const [existing] = await this.db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.companyId, user.companyId!), eq(warehouses.code, dto.code)))
        .limit(1)

      if (existing) {
        throw new ConflictException(`Já existe um armazém com o código "${dto.code}".`)
      }
    }

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(warehouses)
        .values({
          companyId: user.companyId!,
          name: dto.name,
          code: dto.code ?? null,
          location: dto.location ?? null,
        })
        .returning()

      if (!created) throw new Error('Falha ao criar armazém.')

      await tx.insert(auditLogs).values({
        entity: 'Warehouse',
        entityId: created.id,
        action: 'CREATE',
        after: { name: dto.name, code: dto.code, location: dto.location },
        userId: user.id,
        companyId: user.companyId,
      })

      return created
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateWarehouseDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Armazém não encontrado.')
    if (ability.cannot('update', subject('Warehouse', existing))) {
      throw new ForbiddenException('Sem permissão para editar este armazém.')
    }
    if (!existing.isActive) {
      throw new BadRequestException('Armazéns desativados não podem ser editados.')
    }

    // Verificar código duplicado (se mudou)
    if (dto.code && dto.code !== existing.code) {
      const [dup] = await this.db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(and(eq(warehouses.companyId, user.companyId!), eq(warehouses.code, dto.code)))
        .limit(1)

      if (dup) {
        throw new ConflictException(`Já existe um armazém com o código "${dto.code}".`)
      }
    }

    return this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.name !== undefined) updateData.name = dto.name
      if (dto.code !== undefined) updateData.code = dto.code
      if (dto.location !== undefined) updateData.location = dto.location

      const [updated] = await tx
        .update(warehouses)
        .set(updateData)
        .where(and(eq(warehouses.id, id), eq(warehouses.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Armazém não encontrado.')

      await tx.insert(auditLogs).values({
        entity: 'Warehouse',
        entityId: id,
        action: 'UPDATE',
        before: { name: existing.name, code: existing.code, location: existing.location },
        after: updateData,
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── deactivate ───────────────────────────────────────────────────────────

  async deactivate(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Armazém não encontrado.')
    if (ability.cannot('delete', subject('Warehouse', existing))) {
      throw new ForbiddenException('Sem permissão para desativar este armazém.')
    }
    if (!existing.isActive) {
      throw new BadRequestException('O armazém já está desativado.')
    }

    // Verificar se há estoque no armazém
    const [stockEntry] = await this.db
      .select({ id: inventory.id })
      .from(inventory)
      .where(
        and(
          eq(inventory.companyId, user.companyId!),
          eq(inventory.warehouseId, id),
          sql`${inventory.quantity}::numeric > 0`,
        ),
      )
      .limit(1)

    if (stockEntry) {
      throw new BadRequestException(
        'Não é possível desativar um armazém com estoque. ' +
          'Transfira ou baixe o estoque antes de desativar.',
      )
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(warehouses)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(warehouses.id, id), eq(warehouses.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Armazém não encontrado.')

      await tx.insert(auditLogs).values({
        entity: 'Warehouse',
        entityId: id,
        action: 'DEACTIVATE',
        before: { isActive: true },
        after: { isActive: false },
        userId: user.id,
        companyId: user.companyId,
      })

      return { success: true }
    })
  }

  // ─── getInventory ─────────────────────────────────────────────────────────
  // Listagem de saldo de estoque — global (todos os armazéns) ou por armazém

  async getInventory(
    user: SessionUser,
    query: {
      warehouseId?: string | undefined
      productId?: string | undefined
      search?: string | undefined
      page?: string | undefined
      limit?: string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Warehouse')) {
      throw new ForbiddenException('Sem permissão para visualizar estoque.')
    }

    // Parse seguro: `?page=abc`/`?limit=` produzem NaN; cai no default.
    const parsedPage = Number.parseInt(query.page ?? '', 10)
    const parsedLimit = Number.parseInt(query.limit ?? '', 10)
    const page = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage)
    const limit = Math.min(200, Math.max(1, Number.isNaN(parsedLimit) ? 50 : parsedLimit))
    const offset = (page - 1) * limit

    const conditions = [eq(inventory.companyId, user.companyId!)]

    if (query.warehouseId) {
      conditions.push(eq(inventory.warehouseId, query.warehouseId))
    }
    if (query.productId) {
      conditions.push(eq(inventory.productId, query.productId))
    }
    if (query.search) {
      conditions.push(
        or(ilike(products.name, `%${query.search}%`), ilike(products.code, `%${query.search}%`))!,
      )
    }

    return this.db
      .select({
        id: inventory.id,
        warehouseId: inventory.warehouseId,
        warehouseName: warehouses.name,
        productId: inventory.productId,
        productName: products.name,
        productCode: products.code,
        unit: products.unit,
        quantity: inventory.quantity,
        minStock: inventory.minStock,
        updatedAt: inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(warehouses, eq(warehouses.id, inventory.warehouseId))
      .innerJoin(products, eq(products.id, inventory.productId))
      .where(and(...conditions))
      .orderBy(warehouses.name, products.name)
      .limit(limit)
      .offset(offset)
  }
}
