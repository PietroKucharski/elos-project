import { subject } from '@casl/ability'
import type {
  CreateQuotationDto,
  CreateQuotationItemDto,
  InviteSupplierToQuotationDto,
  UpdateQuotationDto,
  UpdateQuotationItemDto,
} from '@elos/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { bids, quotationItems, quotationSuppliers, quotations } from '../../db/schema/quotations'
import { suppliers } from '../../db/schema/suppliers'

// `23505` = unique_violation do PostgreSQL. Usado para fechar a corrida na geração
// do número sequencial da cotação (COT-{ano}-NNNN): o índice único (company_id,
// number) garante a unicidade e o `create` reexecuta a transação na colisão.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  )
}

@Injectable()
export class QuotationsService {
  constructor(
    // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(AbilityFactory) private readonly abilityFactory: AbilityFactory,
  ) {}

  // ─── Quotations ────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?: string | undefined
      search?: string | undefined
      page?: number | undefined
      limit?: number | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para listar cotações.')
    }

    // Normaliza paginação: descarta NaN/0/negativos (vindos de query strings inválidas)
    // antes de chegarem a `.limit()`/`.offset()` e gerarem SQL inválido (500).
    const limit =
      typeof query.limit === 'number' && Number.isFinite(query.limit)
        ? Math.min(Math.max(1, Math.floor(query.limit)), 100)
        : 20
    const page =
      typeof query.page === 'number' && Number.isFinite(query.page)
        ? Math.max(1, Math.floor(query.page))
        : 1
    const offset = (page - 1) * limit

    const validStatuses = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'] as const
    if (query.status && !validStatuses.includes(query.status as never)) {
      throw new BadRequestException('Status de cotação inválido.')
    }

    const conditions = [eq(quotations.companyId, user.companyId!)]

    if (query.status) {
      conditions.push(eq(quotations.status, query.status as (typeof validStatuses)[number]))
    }

    if (query.search) {
      conditions.push(ilike(quotations.title, `%${query.search}%`))
    }

    // Lista com contagem de itens e lances via subquery
    const rows = await this.db
      .select({
        id: quotations.id,
        companyId: quotations.companyId,
        number: quotations.number,
        title: quotations.title,
        description: quotations.description,
        deadline: quotations.deadline,
        paymentTerms: quotations.paymentTerms,
        status: quotations.status,
        createdBy: quotations.createdBy,
        createdAt: quotations.createdAt,
        updatedAt: quotations.updatedAt,
        itemCount: sql<number>`(
          SELECT COUNT(*)::int FROM quotation_items
          WHERE quotation_items.quotation_id = ${quotations.id}
        )`.as('item_count'),
        bidCount: sql<number>`(
          SELECT COUNT(*)::int FROM bids
          WHERE bids.quotation_id = ${quotations.id}
          AND bids.status != 'REJECTED'
        )`.as('bid_count'),
      })
      .from(quotations)
      .where(and(...conditions))
      .orderBy(desc(quotations.createdAt))
      .limit(limit)
      .offset(offset)

    return rows
  }

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para visualizar cotação.')
    }

    const [row] = await this.db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))
      .limit(1)

    if (!row) throw new NotFoundException('Cotação não encontrada.')
    return row
  }

  async create(dto: CreateQuotationDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para criar cotação.')
    }

    const year = new Date().getFullYear()
    const { deadline, ...rest } = dto

    // Número sequencial por empresa: COT-{ano}-{4 dígitos}. Contagem e insert correm
    // na mesma transação; sob concorrência o índice único (company_id, number) rejeita
    // a colisão (23505) e reexecutamos — a contagem seguinte já enxerga a linha
    // concorrente commitada, derivando o próximo número.
    const MAX_ATTEMPTS = 5
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await this.db.transaction(async (tx) => {
          const [counted] = await tx
            .select({ count: sql<number>`COUNT(*)::int` })
            .from(quotations)
            .where(
              and(
                eq(quotations.companyId, user.companyId!),
                sql`EXTRACT(YEAR FROM ${quotations.createdAt}) = ${year}`,
              ),
            )

          const sequential = String((counted?.count ?? 0) + 1).padStart(4, '0')
          const number = `COT-${year}-${sequential}`

          const [created] = await tx
            .insert(quotations)
            .values({
              ...rest,
              number,
              companyId: user.companyId!,
              createdBy: user.id,
              status: 'DRAFT',
              deadline: new Date(deadline),
            })
            .returning()

          if (!created) throw new BadRequestException('Falha ao criar cotação.')

          await tx.insert(auditLogs).values({
            entity: 'Quotation',
            entityId: created.id,
            action: 'CREATE',
            before: null,
            after: created,
            userId: user.id,
            companyId: user.companyId,
          })

          return created
        })
      } catch (err) {
        if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS - 1) continue
        throw err
      }
    }

    throw new ConflictException(
      'Não foi possível gerar um número único para a cotação. Tente novamente.',
    )
  }

  async update(id: string, dto: UpdateQuotationDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Cotação não encontrada.')

    if (ability.cannot('update', subject('Quotation', existing))) {
      throw new ForbiddenException('Sem permissão para atualizar cotação.')
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Apenas cotações com status DRAFT podem ser editadas.')
    }

    const { deadline, ...rest } = dto

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quotations)
        .set({
          ...rest,
          ...(deadline ? { deadline: new Date(deadline) } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Quotation',
        entityId: id,
        action: 'UPDATE',
        before: existing,
        after: rows[0],
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Cotação não encontrada.')
    return updated
  }

  async publish(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Cotação não encontrada.')

    if (ability.cannot('update', subject('Quotation', existing))) {
      throw new ForbiddenException('Sem permissão para publicar cotação.')
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Apenas cotações com status DRAFT podem ser publicadas. Status atual: ${existing.status}.`,
      )
    }

    // Verificar pré-condições: ao menos 1 item e 1 fornecedor convidado
    const [itemCounted] = await this.db
      .select({ itemCount: sql<number>`COUNT(*)` })
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, id))

    if (Number(itemCounted?.itemCount ?? 0) === 0) {
      throw new BadRequestException('A cotação precisa ter ao menos 1 item para ser publicada.')
    }

    const [supplierCounted] = await this.db
      .select({ supplierCount: sql<number>`COUNT(*)` })
      .from(quotationSuppliers)
      .where(eq(quotationSuppliers.quotationId, id))

    if (Number(supplierCounted?.supplierCount ?? 0) === 0) {
      throw new BadRequestException(
        'A cotação precisa ter ao menos 1 fornecedor convidado para ser publicada.',
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quotations)
        .set({ status: 'OPEN', updatedAt: new Date() })
        .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Quotation',
        entityId: id,
        action: 'PUBLISH',
        before: { status: existing.status },
        after: { status: 'OPEN' },
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Cotação não encontrada.')
    return updated
  }

  async close(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Cotação não encontrada.')

    if (ability.cannot('update', subject('Quotation', existing))) {
      throw new ForbiddenException('Sem permissão para fechar cotação.')
    }

    if (existing.status !== 'OPEN') {
      throw new BadRequestException(
        `Apenas cotações com status OPEN podem ser fechadas. Status atual: ${existing.status}.`,
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quotations)
        .set({ status: 'CLOSED', closedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Quotation',
        entityId: id,
        action: 'CLOSE',
        before: { status: existing.status },
        after: { status: 'CLOSED' },
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Cotação não encontrada.')
    return updated
  }

  async cancel(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Cotação não encontrada.')

    if (ability.cannot('update', subject('Quotation', existing))) {
      throw new ForbiddenException('Sem permissão para cancelar cotação.')
    }

    if (!['DRAFT', 'OPEN'].includes(existing.status)) {
      throw new BadRequestException(
        `Apenas cotações DRAFT ou OPEN podem ser canceladas. Status atual: ${existing.status}.`,
      )
    }

    await this.db.transaction(async (tx) => {
      await tx
        .update(quotations)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(and(eq(quotations.id, id), eq(quotations.companyId, user.companyId!)))

      // Rejeitar todos os lances não finalizados (SELECTED/REJECTED são finais)
      await tx
        .update(bids)
        .set({ status: 'REJECTED', updatedAt: new Date() })
        .where(
          and(
            eq(bids.quotationId, id),
            eq(bids.companyId, user.companyId!),
            sql`${bids.status} NOT IN ('SELECTED', 'REJECTED')`,
          ),
        )

      await tx.insert(auditLogs).values({
        entity: 'Quotation',
        entityId: id,
        action: 'CANCEL',
        before: { status: existing.status },
        after: { status: 'CANCELLED' },
        userId: user.id,
        companyId: user.companyId,
      })
    })

    return { success: true }
  }

  // ─── Quotation Items ────────────────────────────────────────────────────────

  private async assertQuotationBelongsToCompany(quotationId: string, companyId: string) {
    const [row] = await this.db
      .select({ id: quotations.id, status: quotations.status })
      .from(quotations)
      .where(and(eq(quotations.id, quotationId), eq(quotations.companyId, companyId)))
      .limit(1)

    if (!row) throw new NotFoundException('Cotação não encontrada.')
    return row
  }

  async findItems(quotationId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Quotation')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    return this.db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, quotationId))
      .orderBy(quotationItems.createdAt)
  }

  async addItem(quotationId: string, dto: CreateQuotationItemDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para adicionar item.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException('Itens só podem ser adicionados em cotações com status DRAFT.')
    }

    const item = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(quotationItems)
        .values({
          quotationId,
          productId: dto.productId ?? null,
          description: dto.description,
          // numeric do postgres.js trafega como string
          quantity: String(dto.quantity),
          unit: dto.unit,
          notes: dto.notes ?? null,
        })
        .returning()

      if (!created) throw new BadRequestException('Falha ao criar item.')

      await tx.insert(auditLogs).values({
        entity: 'QuotationItem',
        entityId: created.id,
        action: 'CREATE',
        before: null,
        after: created,
        userId: user.id,
        companyId: user.companyId,
      })

      return created
    })

    return item
  }

  async updateItem(
    quotationId: string,
    itemId: string,
    dto: UpdateQuotationItemDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para atualizar item.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException('Itens só podem ser editados em cotações com status DRAFT.')
    }

    const [before] = await this.db
      .select()
      .from(quotationItems)
      .where(and(eq(quotationItems.id, itemId), eq(quotationItems.quotationId, quotationId)))
      .limit(1)

    if (!before) throw new NotFoundException('Item não encontrado.')

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.productId !== undefined) updateData.productId = dto.productId
    if (dto.description !== undefined) updateData.description = dto.description
    if (dto.quantity !== undefined) updateData.quantity = String(dto.quantity)
    if (dto.unit !== undefined) updateData.unit = dto.unit
    if (dto.notes !== undefined) updateData.notes = dto.notes

    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(quotationItems)
        .set(updateData)
        .where(and(eq(quotationItems.id, itemId), eq(quotationItems.quotationId, quotationId)))
        .returning()

      if (!row) throw new NotFoundException('Item não encontrado.')

      await tx.insert(auditLogs).values({
        entity: 'QuotationItem',
        entityId: itemId,
        action: 'UPDATE',
        before,
        after: row,
        userId: user.id,
        companyId: user.companyId,
      })

      return row
    })

    return updated
  }

  async removeItem(quotationId: string, itemId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para remover item.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException('Itens só podem ser removidos em cotações com status DRAFT.')
    }

    const [before] = await this.db
      .select()
      .from(quotationItems)
      .where(and(eq(quotationItems.id, itemId), eq(quotationItems.quotationId, quotationId)))
      .limit(1)

    if (!before) return { success: true }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(quotationItems)
        .where(and(eq(quotationItems.id, itemId), eq(quotationItems.quotationId, quotationId)))

      await tx.insert(auditLogs).values({
        entity: 'QuotationItem',
        entityId: itemId,
        action: 'DELETE',
        before,
        after: null,
        userId: user.id,
        companyId: user.companyId,
      })
    })

    return { success: true }
  }

  // ─── Quotation Suppliers (convidados) ──────────────────────────────────────

  async findInvitedSuppliers(quotationId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Quotation')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    return this.db
      .select({
        id: quotationSuppliers.id,
        quotationId: quotationSuppliers.quotationId,
        supplierId: quotationSuppliers.supplierId,
        supplierName: suppliers.name,
        status: quotationSuppliers.status,
        invitedAt: quotationSuppliers.invitedAt,
      })
      .from(quotationSuppliers)
      .innerJoin(suppliers, eq(quotationSuppliers.supplierId, suppliers.id))
      .where(eq(quotationSuppliers.quotationId, quotationId))
      .orderBy(quotationSuppliers.invitedAt)
  }

  async inviteSupplier(quotationId: string, dto: InviteSupplierToQuotationDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para convidar fornecedor.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Fornecedores só podem ser convidados em cotações com status DRAFT.',
      )
    }

    // Verificar que o fornecedor pertence à empresa e está APPROVED
    const [supplier] = await this.db
      .select({ id: suppliers.id, status: suppliers.status })
      .from(suppliers)
      .where(and(eq(suppliers.id, dto.supplierId), eq(suppliers.companyId, user.companyId!)))
      .limit(1)

    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.')

    if (supplier.status !== 'APPROVED') {
      throw new BadRequestException(
        'Apenas fornecedores APROVADOS podem ser convidados para cotações.',
      )
    }

    // Verificar convite duplicado
    const [existing] = await this.db
      .select({ id: quotationSuppliers.id })
      .from(quotationSuppliers)
      .where(
        and(
          eq(quotationSuppliers.quotationId, quotationId),
          eq(quotationSuppliers.supplierId, dto.supplierId),
        ),
      )
      .limit(1)

    if (existing) {
      throw new ConflictException('Este fornecedor já foi convidado para esta cotação.')
    }

    const invite = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(quotationSuppliers)
        .values({
          quotationId,
          supplierId: dto.supplierId,
          status: 'INVITED',
          invitedAt: new Date(),
        })
        .returning()

      if (!created) throw new BadRequestException('Falha ao criar convite.')

      await tx.insert(auditLogs).values({
        entity: 'QuotationSupplier',
        entityId: created.id,
        action: 'INVITE',
        before: null,
        after: created,
        userId: user.id,
        companyId: user.companyId,
      })

      return created
    })

    return invite
  }

  async removeInvite(quotationId: string, supplierId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para remover convite.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException('Convites só podem ser removidos em cotações com status DRAFT.')
    }

    const [before] = await this.db
      .select()
      .from(quotationSuppliers)
      .where(
        and(
          eq(quotationSuppliers.quotationId, quotationId),
          eq(quotationSuppliers.supplierId, supplierId),
        ),
      )
      .limit(1)

    if (!before) return { success: true }

    await this.db.transaction(async (tx) => {
      await tx
        .delete(quotationSuppliers)
        .where(
          and(
            eq(quotationSuppliers.quotationId, quotationId),
            eq(quotationSuppliers.supplierId, supplierId),
          ),
        )

      await tx.insert(auditLogs).values({
        entity: 'QuotationSupplier',
        entityId: before.id,
        action: 'REMOVE_INVITE',
        before,
        after: null,
        userId: user.id,
        companyId: user.companyId,
      })
    })

    return { success: true }
  }
}
