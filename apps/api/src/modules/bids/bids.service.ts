import { subject } from '@casl/ability'
import type {
  CreateBidDto,
  CreateBidItemDto,
  SelectWinnerDto,
  UpdateBidDto,
  UpdateBidItemDto,
} from '@elos/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import {
  bidItems,
  bids,
  quotationItems,
  quotationSuppliers,
  quotations,
} from '../../db/schema/quotations'
import { suppliers } from '../../db/schema/suppliers'

@Injectable()
export class BidsService {
  constructor(
    // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(AbilityFactory) private readonly abilityFactory: AbilityFactory,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertQuotationBelongsToCompany(
    quotationId: string,
    companyId: string,
    requiredStatus?: 'OPEN' | 'CLOSED' | 'OPEN_OR_CLOSED',
  ) {
    const [row] = await this.db
      .select()
      .from(quotations)
      .where(and(eq(quotations.id, quotationId), eq(quotations.companyId, companyId)))
      .limit(1)

    if (!row) throw new NotFoundException('Cotação não encontrada.')

    if (requiredStatus === 'OPEN' && row.status !== 'OPEN') {
      throw new BadRequestException(
        `Operação disponível apenas para cotações OPEN. Status atual: ${row.status}.`,
      )
    }

    if (requiredStatus === 'CLOSED' && row.status !== 'CLOSED') {
      throw new BadRequestException(
        `Operação disponível apenas para cotações CLOSED. Status atual: ${row.status}.`,
      )
    }

    if (requiredStatus === 'OPEN_OR_CLOSED' && !['OPEN', 'CLOSED'].includes(row.status)) {
      throw new BadRequestException(
        `Operação disponível apenas para cotações OPEN ou CLOSED. Status atual: ${row.status}.`,
      )
    }

    return row
  }

  private async assertBidBelongsToQuotation(bidId: string, quotationId: string) {
    const [row] = await this.db
      .select()
      .from(bids)
      .where(and(eq(bids.id, bidId), eq(bids.quotationId, quotationId)))
      .limit(1)

    if (!row) throw new NotFoundException('Lance não encontrado.')
    return row
  }

  // ─── Bids ──────────────────────────────────────────────────────────────────

  async findAll(quotationId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Bid')) {
      throw new ForbiddenException('Sem permissão para listar lances.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    return this.db
      .select({
        id: bids.id,
        quotationId: bids.quotationId,
        supplierId: bids.supplierId,
        supplierName: suppliers.name,
        companyId: bids.companyId,
        status: bids.status,
        // `notes` da API é persistido na coluna `observations` do lance.
        notes: bids.observations,
        submittedAt: bids.submittedAt,
        createdAt: bids.createdAt,
        updatedAt: bids.updatedAt,
        totalPrice: sql<string | null>`(
          SELECT SUM(bi.unit_price * qi.quantity)::text
          FROM bid_items bi
          JOIN quotation_items qi ON qi.id = bi.quotation_item_id
          WHERE bi.bid_id = ${bids.id}
        )`.as('total_price'),
      })
      .from(bids)
      .innerJoin(suppliers, eq(bids.supplierId, suppliers.id))
      .where(eq(bids.quotationId, quotationId))
      .orderBy(bids.createdAt)
  }

  async findOne(quotationId: string, bidId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Bid')) {
      throw new ForbiddenException('Sem permissão para visualizar lance.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    const [bid] = await this.db
      .select({
        id: bids.id,
        quotationId: bids.quotationId,
        supplierId: bids.supplierId,
        supplierName: suppliers.name,
        companyId: bids.companyId,
        status: bids.status,
        notes: bids.observations,
        submittedAt: bids.submittedAt,
        createdAt: bids.createdAt,
        updatedAt: bids.updatedAt,
        totalPrice: sql<string | null>`(
          SELECT SUM(bi.unit_price * qi.quantity)::text
          FROM bid_items bi
          JOIN quotation_items qi ON qi.id = bi.quotation_item_id
          WHERE bi.bid_id = ${bids.id}
        )`.as('total_price'),
      })
      .from(bids)
      .innerJoin(suppliers, eq(bids.supplierId, suppliers.id))
      .where(and(eq(bids.id, bidId), eq(bids.quotationId, quotationId)))
      .limit(1)

    if (!bid) throw new NotFoundException('Lance não encontrado.')

    const items = await this.findBidItemsRows(bidId)

    return { ...bid, items }
  }

  async create(quotationId: string, dto: CreateBidDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Bid')) {
      throw new ForbiddenException('Sem permissão para criar lance.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!, 'OPEN')

    // Verificar que o fornecedor está convidado para esta cotação
    const [invite] = await this.db
      .select({ id: quotationSuppliers.id })
      .from(quotationSuppliers)
      .where(
        and(
          eq(quotationSuppliers.quotationId, quotationId),
          eq(quotationSuppliers.supplierId, dto.supplierId),
        ),
      )
      .limit(1)

    if (!invite) {
      throw new BadRequestException('O fornecedor não está na lista de convidados desta cotação.')
    }

    // Verificar lance duplicado: um fornecedor pode ter apenas um lance por cotação
    const [existingBid] = await this.db
      .select({ id: bids.id })
      .from(bids)
      .where(and(eq(bids.quotationId, quotationId), eq(bids.supplierId, dto.supplierId)))
      .limit(1)

    if (existingBid) {
      throw new ConflictException('Já existe um lance deste fornecedor para esta cotação.')
    }

    const created = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(bids)
        .values({
          quotationId,
          supplierId: dto.supplierId,
          companyId: user.companyId!,
          status: 'DRAFT',
          observations: dto.notes ?? null,
        })
        .returning()

      if (!row) throw new BadRequestException('Falha ao criar lance.')

      await tx.insert(auditLogs).values({
        entity: 'Bid',
        entityId: row.id,
        action: 'CREATE',
        before: null,
        after: row,
        userId: user.id,
        companyId: user.companyId,
      })

      return row
    })

    return created
  }

  async update(quotationId: string, bidId: string, dto: UpdateBidDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    const existing = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (ability.cannot('update', subject('Bid', existing))) {
      throw new ForbiddenException('Sem permissão para atualizar lance.')
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Apenas lances com status DRAFT podem ser editados.')
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.notes !== undefined) updateData.observations = dto.notes

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(bids)
        .set(updateData)
        .where(and(eq(bids.id, bidId), eq(bids.quotationId, quotationId)))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Bid',
        entityId: bidId,
        action: 'UPDATE',
        before: existing,
        after: rows[0],
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Lance não encontrado.')
    return updated
  }

  async remove(quotationId: string, bidId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)

    const existing = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (ability.cannot('delete', subject('Bid', existing))) {
      throw new ForbiddenException('Sem permissão para remover lance.')
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Apenas lances com status DRAFT podem ser removidos.')
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(bids).where(eq(bids.id, bidId))

      await tx.insert(auditLogs).values({
        entity: 'Bid',
        entityId: bidId,
        action: 'DELETE',
        before: existing,
        after: null,
        userId: user.id,
        companyId: user.companyId,
      })
    })

    return { success: true }
  }

  async submit(quotationId: string, bidId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!, 'OPEN')

    const existing = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (ability.cannot('update', subject('Bid', existing))) {
      throw new ForbiddenException('Sem permissão para submeter lance.')
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Apenas lances com status DRAFT podem ser submetidos. Status atual: ${existing.status}.`,
      )
    }

    // Verificar que há pelo menos 1 item no lance
    const [counted] = await this.db
      .select({ itemCount: sql<number>`COUNT(*)` })
      .from(bidItems)
      .where(eq(bidItems.bidId, bidId))

    if (Number(counted?.itemCount ?? 0) === 0) {
      throw new BadRequestException('O lance precisa ter ao menos 1 item antes de ser submetido.')
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(bids)
        .set({ status: 'SUBMITTED', submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(bids.id, bidId))
        .returning()

      // Atualizar o status do convite do fornecedor para RESPONDED
      await tx
        .update(quotationSuppliers)
        .set({ status: 'RESPONDED', respondedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(quotationSuppliers.quotationId, quotationId),
            eq(quotationSuppliers.supplierId, existing.supplierId),
          ),
        )

      await tx.insert(auditLogs).values({
        entity: 'Bid',
        entityId: bidId,
        action: 'SUBMIT',
        before: { status: existing.status },
        after: { status: 'SUBMITTED' },
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!updated) throw new NotFoundException('Lance não encontrado.')
    return updated
  }

  // ─── Bid Items ─────────────────────────────────────────────────────────────

  private findBidItemsRows(bidId: string) {
    return this.db
      .select({
        id: bidItems.id,
        bidId: bidItems.bidId,
        quotationItemId: bidItems.quotationItemId,
        description: quotationItems.description,
        quantity: quotationItems.quantity,
        unit: quotationItems.unit,
        unitPrice: bidItems.unitPrice,
        totalPrice: sql<string>`(${bidItems.unitPrice} * ${quotationItems.quantity})::text`,
        deliveryDays: sql<number>`${bidItems.deliveryDays}::int`,
        notes: bidItems.observations,
        createdAt: bidItems.createdAt,
        updatedAt: bidItems.updatedAt,
      })
      .from(bidItems)
      .innerJoin(quotationItems, eq(bidItems.quotationItemId, quotationItems.id))
      .where(eq(bidItems.bidId, bidId))
      .orderBy(bidItems.createdAt)
  }

  async findBidItems(quotationId: string, bidId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Bid')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)
    await this.assertBidBelongsToQuotation(bidId, quotationId)

    return this.findBidItemsRows(bidId)
  }

  async addBidItem(quotationId: string, bidId: string, dto: CreateBidItemDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Bid')) {
      throw new ForbiddenException('Sem permissão para adicionar item ao lance.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!, 'OPEN')
    const bid = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (bid.status !== 'DRAFT') {
      throw new BadRequestException('Itens só podem ser adicionados a lances com status DRAFT.')
    }

    // Verificar que o quotationItem pertence à cotação
    const [qItem] = await this.db
      .select({ id: quotationItems.id })
      .from(quotationItems)
      .where(
        and(
          eq(quotationItems.id, dto.quotationItemId),
          eq(quotationItems.quotationId, quotationId),
        ),
      )
      .limit(1)

    if (!qItem) throw new NotFoundException('Item da cotação não encontrado.')

    // Verificar item duplicado no lance (quotationItemId é único por lance)
    const [existingItem] = await this.db
      .select({ id: bidItems.id })
      .from(bidItems)
      .where(and(eq(bidItems.bidId, bidId), eq(bidItems.quotationItemId, dto.quotationItemId)))
      .limit(1)

    if (existingItem) {
      throw new ConflictException('Este item da cotação já foi adicionado ao lance.')
    }

    const item = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(bidItems)
        .values({
          bidId,
          quotationItemId: dto.quotationItemId,
          // numeric do postgres.js trafega como string
          unitPrice: String(dto.unitPrice),
          deliveryDays: String(dto.deliveryDays),
          observations: dto.notes ?? null,
        })
        .returning()

      if (!created) throw new BadRequestException('Falha ao criar item do lance.')

      await tx.insert(auditLogs).values({
        entity: 'BidItem',
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

  async updateBidItem(
    quotationId: string,
    bidId: string,
    itemId: string,
    dto: UpdateBidItemDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Bid')) {
      throw new ForbiddenException('Sem permissão para atualizar item do lance.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)
    const bid = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (bid.status !== 'DRAFT') {
      throw new BadRequestException('Itens só podem ser editados em lances com status DRAFT.')
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.unitPrice !== undefined) updateData.unitPrice = String(dto.unitPrice)
    if (dto.deliveryDays !== undefined) updateData.deliveryDays = String(dto.deliveryDays)
    if (dto.notes !== undefined) updateData.observations = dto.notes

    const updated = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(bidItems)
        .where(and(eq(bidItems.id, itemId), eq(bidItems.bidId, bidId)))
        .limit(1)

      if (!before) throw new NotFoundException('Item do lance não encontrado.')

      const [row] = await tx
        .update(bidItems)
        .set(updateData)
        .where(and(eq(bidItems.id, itemId), eq(bidItems.bidId, bidId)))
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'BidItem',
        entityId: itemId,
        action: 'UPDATE',
        before,
        after: row,
        userId: user.id,
        companyId: user.companyId,
      })

      return row
    })

    if (!updated) throw new NotFoundException('Item do lance não encontrado.')
    return updated
  }

  async removeBidItem(quotationId: string, bidId: string, itemId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Bid')) {
      throw new ForbiddenException('Sem permissão para remover item do lance.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!)
    const bid = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (bid.status !== 'DRAFT') {
      throw new BadRequestException('Itens só podem ser removidos de lances com status DRAFT.')
    }

    const [before] = await this.db
      .select()
      .from(bidItems)
      .where(and(eq(bidItems.id, itemId), eq(bidItems.bidId, bidId)))
      .limit(1)

    if (!before) return { success: true }

    await this.db.transaction(async (tx) => {
      await tx.delete(bidItems).where(and(eq(bidItems.id, itemId), eq(bidItems.bidId, bidId)))

      await tx.insert(auditLogs).values({
        entity: 'BidItem',
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

  // ─── Comparison ────────────────────────────────────────────────────────────

  async compare(quotationId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Bid')) {
      throw new ForbiddenException('Sem permissão para visualizar comparativo.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!, 'OPEN_OR_CLOSED')

    // Itens da cotação (linhas da matrix)
    const items = await this.db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, quotationId))
      .orderBy(quotationItems.createdAt)

    // Lances da cotação (colunas da matrix), escopados ao tenant
    const quotationBids = await this.db
      .select({
        id: bids.id,
        supplierId: bids.supplierId,
        supplierName: suppliers.name,
        status: bids.status,
        totalPrice: sql<string | null>`(
          SELECT SUM(bi.unit_price * qi.quantity)::text
          FROM bid_items bi
          JOIN quotation_items qi ON qi.id = bi.quotation_item_id
          WHERE bi.bid_id = ${bids.id}
        )`.as('total_price'),
      })
      .from(bids)
      .innerJoin(suppliers, eq(bids.supplierId, suppliers.id))
      .where(and(eq(bids.quotationId, quotationId), eq(bids.companyId, user.companyId!)))
      .orderBy(bids.createdAt)

    // Todos os itens de lance de uma vez (evita N+1)
    const allBidItems = await this.db
      .select({
        id: bidItems.id,
        bidId: bidItems.bidId,
        quotationItemId: bidItems.quotationItemId,
        unitPrice: bidItems.unitPrice,
        totalPrice: sql<string>`(${bidItems.unitPrice} * ${quotationItems.quantity})::text`,
        deliveryDays: sql<number>`${bidItems.deliveryDays}::int`,
        notes: bidItems.observations,
        status: bids.status,
      })
      .from(bidItems)
      .innerJoin(bids, eq(bidItems.bidId, bids.id))
      .innerJoin(quotationItems, eq(bidItems.quotationItemId, quotationItems.id))
      .where(eq(bids.quotationId, quotationId))

    const rows = items.map((item) => {
      const cellsByBidId: Record<
        string,
        {
          bidItemId: string | null
          unitPrice: string | null
          totalPrice: string | null
          deliveryDays: number | null
          notes: string | null
          isWinner: boolean
        }
      > = {}

      for (const bid of quotationBids) {
        const bidItem = allBidItems.find(
          (bi) => bi.bidId === bid.id && bi.quotationItemId === item.id,
        )

        cellsByBidId[bid.id] = {
          bidItemId: bidItem?.id ?? null,
          unitPrice: bidItem?.unitPrice ?? null,
          totalPrice: bidItem?.totalPrice ?? null,
          deliveryDays: bidItem?.deliveryDays ?? null,
          notes: bidItem?.notes ?? null,
          isWinner: bid.status === 'SELECTED',
        }
      }

      return {
        quotationItemId: item.id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        bids: cellsByBidId,
      }
    })

    return {
      quotationId,
      bids: quotationBids.map((b) => ({
        bidId: b.id,
        supplierId: b.supplierId,
        supplierName: b.supplierName,
        status: b.status,
        totalPrice: b.totalPrice,
      })),
      rows,
    }
  }

  // ─── Winner Selection ──────────────────────────────────────────────────────

  async selectWinner(quotationId: string, dto: SelectWinnerDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Bid')) {
      throw new ForbiddenException('Sem permissão para selecionar vencedor.')
    }

    await this.assertQuotationBelongsToCompany(quotationId, user.companyId!, 'CLOSED')

    // O lance deve pertencer à cotação e estar SUBMITTED
    const [winnerBid] = await this.db
      .select()
      .from(bids)
      .where(and(eq(bids.id, dto.bidId), eq(bids.quotationId, quotationId)))
      .limit(1)

    if (!winnerBid) throw new NotFoundException('Lance não encontrado.')

    if (winnerBid.status !== 'SUBMITTED') {
      throw new BadRequestException(
        `Apenas lances SUBMITTED podem ser selecionados como vencedores. Status atual: ${winnerBid.status}.`,
      )
    }

    // Garantir que ainda não há vencedor selecionado
    const [existingWinner] = await this.db
      .select({ id: bids.id })
      .from(bids)
      .where(and(eq(bids.quotationId, quotationId), eq(bids.status, 'SELECTED')))
      .limit(1)

    if (existingWinner) {
      throw new ConflictException('Esta cotação já possui um lance vencedor selecionado.')
    }

    await this.db.transaction(async (tx) => {
      // Marcar o lance vencedor como SELECTED
      await tx
        .update(bids)
        .set({ status: 'SELECTED', updatedAt: new Date() })
        .where(eq(bids.id, dto.bidId))

      // Rejeitar os demais lances SUBMITTED
      await tx
        .update(bids)
        .set({ status: 'REJECTED', updatedAt: new Date() })
        .where(
          and(
            eq(bids.quotationId, quotationId),
            eq(bids.status, 'SUBMITTED'),
            sql`${bids.id} != ${dto.bidId}`,
          ),
        )

      await tx.insert(auditLogs).values({
        entity: 'Bid',
        entityId: dto.bidId,
        action: 'SELECT_WINNER',
        before: { status: winnerBid.status },
        after: { status: 'SELECTED', notes: dto.notes },
        userId: user.id,
        companyId: user.companyId,
      })
    })

    return { success: true, winnerBidId: dto.bidId }
  }
}
