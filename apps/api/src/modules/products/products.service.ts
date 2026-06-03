import { subject } from '@casl/ability'
import type {
  CreateProductDto,
  LinkProductSupplierDto,
  UpdateProductDto,
  UpdateProductSupplierDto,
} from '@elos/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, ilike, inArray } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { productSuppliers, products } from '../../db/schema/products'
import { suppliers } from '../../db/schema/suppliers'

// Unidades de medida válidas — espelham o `unitOfMeasureEnum` do banco
const validUnits = ['UN', 'KG', 'G', 'L', 'ML', 'M', 'M2', 'M3', 'CX', 'PC'] as const

// `23505` = unique_violation do PostgreSQL. As checagens select-then-insert são
// otimistas (mensagem amigável no caso comum); este guard fecha a corrida quando
// duas requisições concorrentes passam pela checagem antes de qualquer insert.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  )
}

@Injectable()
export class ProductsService {
  constructor(
    // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(AbilityFactory) private readonly abilityFactory: AbilityFactory,
  ) {}

  // ─── Products ──────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      search?: string | undefined
      isActive?: string | undefined
      supplierId?: string | undefined
      unit?: string | undefined
      page?: number | undefined
      limit?: number | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Product')) {
      throw new ForbiddenException('Sem permissão para listar produtos.')
    }

    const limit = Math.min(query.limit ?? 20, 100)
    const offset = ((query.page ?? 1) - 1) * limit

    // isActive: default true se não informado
    const isActiveFilter = query.isActive !== 'false'

    const conditions = [
      eq(products.companyId, user.companyId!),
      eq(products.isActive, isActiveFilter),
    ]

    if (query.search) {
      conditions.push(ilike(products.name, `%${query.search}%`))
    }

    if (query.unit) {
      if (!validUnits.includes(query.unit as never)) {
        throw new BadRequestException('Unidade de medida inválida.')
      }
      conditions.push(eq(products.unit, query.unit as (typeof validUnits)[number]))
    }

    // Se supplierId informado, filtra produtos que têm esse fornecedor vinculado.
    // Join com `products` + filtro de tenant garante que só ids do próprio
    // companyId entrem no inArray (sem vazar vínculos de outro tenant).
    if (query.supplierId) {
      const linkedProductIds = await this.db
        .select({ productId: productSuppliers.productId })
        .from(productSuppliers)
        .innerJoin(products, eq(products.id, productSuppliers.productId))
        .where(
          and(
            eq(productSuppliers.supplierId, query.supplierId),
            eq(products.companyId, user.companyId!),
          ),
        )
        .then((rows) => rows.map((r) => r.productId))

      if (linkedProductIds.length === 0) return []

      conditions.push(inArray(products.id, linkedProductIds))
    }

    return this.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Product')) {
      throw new ForbiddenException('Sem permissão para visualizar produto.')
    }

    const [product] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.companyId, user.companyId!)))
      .limit(1)

    if (!product) throw new NotFoundException('Produto não encontrado.')

    // Buscar fornecedores vinculados
    const linkedSuppliers = await this.db
      .select({
        id: productSuppliers.id,
        supplierId: productSuppliers.supplierId,
        supplierName: suppliers.name,
        isPreferred: productSuppliers.isPreferred,
        notes: productSuppliers.notes,
      })
      .from(productSuppliers)
      .innerJoin(suppliers, eq(suppliers.id, productSuppliers.supplierId))
      .where(eq(productSuppliers.productId, id))
      .orderBy(productSuppliers.createdAt)

    return { ...product, suppliers: linkedSuppliers }
  }

  async create(dto: CreateProductDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Product')) {
      throw new ForbiddenException('Sem permissão para criar produto.')
    }

    // Verificar duplicidade de código interno (se fornecido)
    if (dto.code) {
      const existing = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.companyId, user.companyId!), eq(products.code, dto.code)))
        .limit(1)
        .then((r) => r[0] ?? null)

      if (existing) {
        throw new ConflictException('Já existe um produto com este código.')
      }
    }

    const [created] = await this.db.transaction(async (tx) => {
      let rows: (typeof products.$inferSelect)[]
      try {
        rows = await tx
          .insert(products)
          .values({
            ...dto,
            minStock: dto.minStock != null ? String(dto.minStock) : null,
            companyId: user.companyId!,
          })
          .returning()
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new ConflictException('Já existe um produto com este código.')
        }
        throw err
      }

      const [row] = rows
      if (!row) throw new BadRequestException('Falha ao criar produto.')

      await tx.insert(auditLogs).values({
        entity: 'Product',
        entityId: row.id,
        action: 'CREATE',
        before: null,
        after: row,
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    return created
  }

  async update(id: string, dto: UpdateProductDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Produto não encontrado.')

    if (ability.cannot('update', subject('Product', existing))) {
      throw new ForbiddenException('Sem permissão para atualizar produto.')
    }

    // Verificar duplicidade de código (excluindo o próprio)
    if (dto.code && dto.code !== existing.code) {
      const dup = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.companyId, user.companyId!), eq(products.code, dto.code)))
        .limit(1)
        .then((r) => r[0] ?? null)

      if (dup) throw new ConflictException('Já existe um produto com este código.')
    }

    const [updated] = await this.db.transaction(async (tx) => {
      let rows: (typeof products.$inferSelect)[]
      try {
        rows = await tx
          .update(products)
          .set({
            ...dto,
            minStock: dto.minStock != null ? String(dto.minStock) : undefined,
            updatedAt: new Date(),
          })
          .where(and(eq(products.id, id), eq(products.companyId, user.companyId!)))
          .returning()
      } catch (err) {
        if (isUniqueViolation(err)) {
          throw new ConflictException('Já existe um produto com este código.')
        }
        throw err
      }

      if (!rows[0]) throw new NotFoundException('Produto não encontrado.')

      await tx.insert(auditLogs).values({
        entity: 'Product',
        entityId: id,
        action: 'UPDATE',
        before: existing,
        after: rows[0],
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    return updated
  }

  async deactivate(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Produto não encontrado.')

    if (ability.cannot('delete', subject('Product', existing))) {
      throw new ForbiddenException('Sem permissão para desativar produto.')
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(products.id, id), eq(products.companyId, user.companyId!)))

      await tx.insert(auditLogs).values({
        entity: 'Product',
        entityId: id,
        action: 'DEACTIVATE',
        before: { isActive: true },
        after: { isActive: false },
        userId: user.id,
        companyId: user.companyId,
      })
    })

    return { success: true }
  }

  // ─── Product ↔ Supplier links ──────────────────────────────────────────────

  async linkSupplier(productId: string, dto: LinkProductSupplierDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Product')) {
      throw new ForbiddenException('Sem permissão para vincular fornecedor.')
    }

    // Verificar se produto pertence ao tenant
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.companyId, user.companyId!)))
      .limit(1)

    if (!product) throw new NotFoundException('Produto não encontrado.')

    // Verificar se fornecedor pertence ao tenant e está APPROVED
    const [supplier] = await this.db
      .select({ id: suppliers.id, status: suppliers.status })
      .from(suppliers)
      .where(and(eq(suppliers.id, dto.supplierId), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.')
    if (supplier.status !== 'APPROVED') {
      throw new BadRequestException(
        'Apenas fornecedores aprovados podem ser vinculados a produtos.',
      )
    }

    // Verificar duplicidade do vínculo
    const existing = await this.db
      .select({ id: productSuppliers.id })
      .from(productSuppliers)
      .where(
        and(
          eq(productSuppliers.productId, productId),
          eq(productSuppliers.supplierId, dto.supplierId),
        ),
      )
      .limit(1)
      .then((r) => r[0] ?? null)

    if (existing) throw new ConflictException('Este fornecedor já está vinculado ao produto.')

    let link: typeof productSuppliers.$inferSelect | undefined
    try {
      ;[link] = await this.db
        .insert(productSuppliers)
        .values({
          productId,
          supplierId: dto.supplierId,
          isPreferred: dto.isPreferred ?? false,
          notes: dto.notes ?? null,
        })
        .returning()
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('Este fornecedor já está vinculado ao produto.')
      }
      throw err
    }

    if (!link) throw new BadRequestException('Falha ao criar vínculo.')
    return link
  }

  async updateSupplierLink(
    productId: string,
    supplierId: string,
    dto: UpdateProductSupplierDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Product')) {
      throw new ForbiddenException('Sem permissão para atualizar vínculo.')
    }

    // Verificar ownership do produto
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.companyId, user.companyId!)))
      .limit(1)

    if (!product) throw new NotFoundException('Produto não encontrado.')

    const [link] = await this.db
      .select()
      .from(productSuppliers)
      .where(
        and(eq(productSuppliers.productId, productId), eq(productSuppliers.supplierId, supplierId)),
      )
      .limit(1)

    if (!link) throw new NotFoundException('Vínculo produto↔fornecedor não encontrado.')

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.isPreferred !== undefined) updateData.isPreferred = dto.isPreferred
    if (dto.notes !== undefined) updateData.notes = dto.notes

    const [updated] = await this.db
      .update(productSuppliers)
      .set(updateData)
      .where(eq(productSuppliers.id, link.id))
      .returning()

    if (!updated) throw new NotFoundException('Vínculo não encontrado.')
    return updated
  }

  async unlinkSupplier(productId: string, supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Product')) {
      throw new ForbiddenException('Sem permissão para remover vínculo.')
    }

    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.companyId, user.companyId!)))
      .limit(1)

    if (!product) throw new NotFoundException('Produto não encontrado.')

    await this.db
      .delete(productSuppliers)
      .where(
        and(eq(productSuppliers.productId, productId), eq(productSuppliers.supplierId, supplierId)),
      )

    return { success: true }
  }
}
