import { subject } from '@casl/ability'
import type { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '@elos/shared'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { type SQL, and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { products } from '../../db/schema/products'
import { purchaseOrderItems, purchaseOrders } from '../../db/schema/purchase-orders'
import { bidItems, bids, quotationItems, quotations } from '../../db/schema/quotations'
import { suppliers } from '../../db/schema/suppliers'

// `23505` = unique_violation do PostgreSQL. Usado para fechar a corrida na geração
// do número sequencial do pedido de compra (PO-{ano}-NNNN): a constraint única em
// `number` garante a unicidade e o `create` reexecuta a transação na colisão.
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: unknown }).code === '23505'
  )
}

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ─────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?: string | undefined
      search?: string | undefined
      supplierId?: string | undefined
      page?: string | undefined
      limit?: string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'PurchaseOrder')) {
      throw new ForbiddenException('Sem permissão para listar pedidos de compra.')
    }

    // Parse seguro: `?page=abc`/`?limit=` produzem NaN com Number(); cai no default.
    const parsedPage = Number.parseInt(query.page ?? '', 10)
    const parsedLimit = Number.parseInt(query.limit ?? '', 10)
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1
    const limit = Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 20
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(purchaseOrders.companyId, user.companyId!)]

    if (query.status) {
      conditions.push(eq(purchaseOrders.status, query.status as 'DRAFT'))
    }
    if (query.supplierId) {
      conditions.push(eq(purchaseOrders.supplierId, query.supplierId))
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(purchaseOrders.number, `%${query.search}%`),
          ilike(suppliers.name, `%${query.search}%`),
        )!,
      )
    }

    // Contagem de itens por PO via subquery
    const itemCountSq = this.db
      .select({
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        itemCount: sql<number>`count(*)::int`.as('item_count'),
      })
      .from(purchaseOrderItems)
      .groupBy(purchaseOrderItems.purchaseOrderId)
      .as('item_counts')

    const rows = await this.db
      .select({
        id: purchaseOrders.id,
        companyId: purchaseOrders.companyId,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        quotationId: purchaseOrders.quotationId,
        bidId: purchaseOrders.bidId,
        number: purchaseOrders.number,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        approvedById: purchaseOrders.approvedById,
        approvedAt: purchaseOrders.approvedAt,
        sentAt: purchaseOrders.sentAt,
        createdById: purchaseOrders.createdById,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
        itemCount: itemCountSq.itemCount,
        quotationNumber: quotations.number,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .leftJoin(quotations, eq(quotations.id, purchaseOrders.quotationId))
      .leftJoin(itemCountSq, eq(itemCountSq.purchaseOrderId, purchaseOrders.id))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt))
      .limit(limit)
      .offset(offset)

    return rows
  }

  // ─── findOne ─────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'PurchaseOrder')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [po] = await this.db
      .select({
        id: purchaseOrders.id,
        companyId: purchaseOrders.companyId,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        quotationId: purchaseOrders.quotationId,
        quotationNumber: quotations.number,
        bidId: purchaseOrders.bidId,
        number: purchaseOrders.number,
        status: purchaseOrders.status,
        totalAmount: purchaseOrders.totalAmount,
        notes: purchaseOrders.notes,
        approvedById: purchaseOrders.approvedById,
        approvedAt: purchaseOrders.approvedAt,
        sentAt: purchaseOrders.sentAt,
        createdById: purchaseOrders.createdById,
        createdAt: purchaseOrders.createdAt,
        updatedAt: purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .leftJoin(quotations, eq(quotations.id, purchaseOrders.quotationId))
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, user.companyId!)))
      .limit(1)

    if (!po) throw new NotFoundException('Pedido de compra não encontrado.')

    // Itens do PO com dados do produto
    const items = await this.db
      .select({
        id: purchaseOrderItems.id,
        purchaseOrderId: purchaseOrderItems.purchaseOrderId,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productCode: products.code,
        unit: products.unit,
        quantity: purchaseOrderItems.quantity,
        unitPrice: purchaseOrderItems.unitPrice,
        totalPrice: purchaseOrderItems.totalPrice,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        createdAt: purchaseOrderItems.createdAt,
        updatedAt: purchaseOrderItems.updatedAt,
      })
      .from(purchaseOrderItems)
      .innerJoin(products, eq(products.id, purchaseOrderItems.productId))
      .where(eq(purchaseOrderItems.purchaseOrderId, id))

    return { ...po, items }
  }

  // ─── create (gerar a partir de lance vencedor) ────────────────────────────

  async create(dto: CreatePurchaseOrderDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'PurchaseOrder')) {
      throw new ForbiddenException('Sem permissão para gerar pedido de compra.')
    }

    // 1. Validar o lance (deve ser SELECTED e pertencer à empresa)
    const [bid] = await this.db
      .select({
        id: bids.id,
        status: bids.status,
        supplierId: bids.supplierId,
        quotationId: bids.quotationId,
        companyId: bids.companyId,
      })
      .from(bids)
      .where(and(eq(bids.id, dto.bidId), eq(bids.companyId, user.companyId!)))
      .limit(1)

    if (!bid) throw new NotFoundException('Lance não encontrado.')
    if (bid.status !== 'SELECTED') {
      throw new BadRequestException(
        'Somente lances vencedores (SELECTED) podem gerar um pedido de compra.',
      )
    }

    // 2. Verificar se já existe PO para este lance (bid_id UNIQUE em purchase_orders)
    const [existingPO] = await this.db
      .select({ id: purchaseOrders.id })
      .from(purchaseOrders)
      .where(
        and(eq(purchaseOrders.bidId, dto.bidId), eq(purchaseOrders.companyId, user.companyId!)),
      )
      .limit(1)

    if (existingPO) {
      throw new ConflictException('Já existe um pedido de compra gerado para este lance.')
    }

    // 3. Carregar itens do lance com dados da cotação e produto
    const items = await this.db
      .select({
        quotationItemId: bidItems.quotationItemId,
        unitPrice: bidItems.unitPrice, // preço ofertado no lance
        quantity: quotationItems.quantity, // quantidade solicitada na cotação
        productId: quotationItems.productId, // pode ser null (validar abaixo)
        description: quotationItems.description,
      })
      .from(bidItems)
      .innerJoin(quotationItems, eq(quotationItems.id, bidItems.quotationItemId))
      .where(eq(bidItems.bidId, dto.bidId))

    if (items.length === 0) {
      throw new BadRequestException(
        'O lance não possui itens. Não é possível gerar um pedido de compra.',
      )
    }

    // 4. Validar que todos os itens têm produto vinculado
    const itemsSemProduto = items.filter((i) => !i.productId)
    if (itemsSemProduto.length > 0) {
      throw new BadRequestException(
        `Todos os itens da cotação devem ter um produto vinculado para gerar um pedido de compra. ${itemsSemProduto.length} item(s) sem produto encontrado(s).`,
      )
    }

    // 5. Calcular total
    const totalAmount = items.reduce((acc, item) => {
      const qty = Number(item.quantity)
      const price = Number(item.unitPrice)
      return acc + qty * price
    }, 0)

    // 6. Gerar número sequencial PO-{ano}-{4 dígitos} e criar PO + itens + audit log.
    // A leitura do último número e o insert correm na MESMA transação; sob concorrência
    // a constraint única em `number` rejeita a colisão (23505) e reexecutamos — a leitura
    // seguinte já enxerga a linha concorrente commitada, derivando o próximo número.
    const year = new Date().getFullYear()
    const prefix = `PO-${year}-`

    const MAX_ATTEMPTS = 5
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        return await this.db.transaction(async (tx) => {
          const [lastPO] = await tx
            .select({ number: purchaseOrders.number })
            .from(purchaseOrders)
            .where(
              and(
                eq(purchaseOrders.companyId, user.companyId!),
                sql`${purchaseOrders.number} LIKE ${`${prefix}%`}`,
              ),
            )
            .orderBy(desc(purchaseOrders.number))
            .limit(1)

          let sequence = 1
          if (lastPO) {
            const lastSeq = Number.parseInt(lastPO.number.slice(prefix.length), 10)
            sequence = (Number.isNaN(lastSeq) ? 0 : lastSeq) + 1
          }
          const number = `${prefix}${String(sequence).padStart(4, '0')}`

          const [po] = await tx
            .insert(purchaseOrders)
            .values({
              companyId: user.companyId!,
              supplierId: bid.supplierId,
              quotationId: bid.quotationId,
              bidId: dto.bidId,
              number,
              status: 'DRAFT',
              totalAmount: String(totalAmount.toFixed(2)),
              notes: dto.notes ?? null,
              createdById: user.id,
            })
            .returning()

          if (!po) throw new Error('Falha ao criar pedido de compra.')

          // Inserir itens
          await tx.insert(purchaseOrderItems).values(
            items.map((item) => {
              const qty = Number(item.quantity)
              const price = Number(item.unitPrice)
              const total = qty * price
              return {
                purchaseOrderId: po.id,
                productId: item.productId!,
                quantity: String(item.quantity),
                unitPrice: String(item.unitPrice),
                totalPrice: String(total.toFixed(2)),
                receivedQuantity: '0',
              }
            }),
          )

          await tx.insert(auditLogs).values({
            entity: 'PurchaseOrder',
            entityId: po.id,
            action: 'CREATE',
            after: { number: po.number, bidId: dto.bidId, status: 'DRAFT' },
            userId: user.id,
            companyId: user.companyId,
          })

          return po
        })
      } catch (err) {
        if (isUniqueViolation(err) && attempt < MAX_ATTEMPTS - 1) continue
        throw err
      }
    }

    throw new ConflictException(
      'Não foi possível gerar um número único para o pedido de compra. Tente novamente.',
    )
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePurchaseOrderDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Pedido de compra não encontrado.')
    if (ability.cannot('update', subject('PurchaseOrder', existing))) {
      throw new ForbiddenException('Sem permissão para editar este pedido de compra.')
    }
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException('Apenas pedidos em rascunho (DRAFT) podem ser editados.')
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(purchaseOrders)
        .set({ notes: dto.notes ?? null, updatedAt: new Date() })
        .where(
          and(
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.companyId, user.companyId!),
            eq(purchaseOrders.status, 'DRAFT'),
          ),
        )
        .returning()

      if (!updated) {
        throw new ConflictException(
          'O pedido de compra foi modificado por outra operação. Tente novamente.',
        )
      }

      await tx.insert(auditLogs).values({
        entity: 'PurchaseOrder',
        entityId: id,
        action: 'UPDATE',
        before: { notes: existing.notes },
        after: { notes: dto.notes },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── approve ──────────────────────────────────────────────────────────────

  async approve(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Pedido de compra não encontrado.')
    if (ability.cannot('update', subject('PurchaseOrder', existing))) {
      throw new ForbiddenException('Sem permissão para aprovar este pedido de compra.')
    }
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Apenas pedidos em rascunho podem ser aprovados. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(purchaseOrders)
        .set({
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.companyId, user.companyId!),
            eq(purchaseOrders.status, 'DRAFT'),
          ),
        )
        .returning()

      if (!updated) {
        throw new ConflictException(
          'O pedido de compra foi modificado por outra operação. Tente novamente.',
        )
      }

      await tx.insert(auditLogs).values({
        entity: 'PurchaseOrder',
        entityId: id,
        action: 'APPROVE',
        before: { status: 'DRAFT' },
        after: { status: 'APPROVED', approvedById: user.id },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── send ─────────────────────────────────────────────────────────────────

  async send(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Pedido de compra não encontrado.')
    if (ability.cannot('update', subject('PurchaseOrder', existing))) {
      throw new ForbiddenException('Sem permissão para enviar este pedido de compra.')
    }
    if (existing.status !== 'APPROVED') {
      throw new BadRequestException(
        `Apenas pedidos aprovados podem ser enviados. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(purchaseOrders)
        .set({ status: 'SENT', sentAt: now, updatedAt: now })
        .where(
          and(
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.companyId, user.companyId!),
            eq(purchaseOrders.status, 'APPROVED'),
          ),
        )
        .returning()

      if (!updated) {
        throw new ConflictException(
          'O pedido de compra foi modificado por outra operação. Tente novamente.',
        )
      }

      await tx.insert(auditLogs).values({
        entity: 'PurchaseOrder',
        entityId: id,
        action: 'SEND',
        before: { status: 'APPROVED' },
        after: { status: 'SENT' },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── cancel ───────────────────────────────────────────────────────────────

  async cancel(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Pedido de compra não encontrado.')
    if (ability.cannot('update', subject('PurchaseOrder', existing))) {
      throw new ForbiddenException('Sem permissão para cancelar este pedido de compra.')
    }
    if (!['DRAFT', 'APPROVED'].includes(existing.status)) {
      throw new BadRequestException(
        `Apenas pedidos em rascunho ou aprovados podem ser cancelados. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(purchaseOrders)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(
          and(
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.companyId, user.companyId!),
            inArray(purchaseOrders.status, ['DRAFT', 'APPROVED']),
          ),
        )
        .returning()

      if (!updated) {
        throw new ConflictException(
          'O pedido de compra foi modificado por outra operação. Tente novamente.',
        )
      }

      await tx.insert(auditLogs).values({
        entity: 'PurchaseOrder',
        entityId: id,
        action: 'CANCEL',
        before: { status: existing.status },
        after: { status: 'CANCELLED' },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── receive ──────────────────────────────────────────────────────────────
  // Projetado para ser chamado pelo ReceiptsModule (Fase 5) quando o recebimento
  // estiver completo. Também exposto como endpoint direto (ALMOXARIFE).

  async receive(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.companyId, user.companyId!)))
      .limit(1)

    if (!existing) throw new NotFoundException('Pedido de compra não encontrado.')
    if (ability.cannot('receive', subject('PurchaseOrder', existing))) {
      throw new ForbiddenException('Sem permissão para registrar recebimento.')
    }
    if (existing.status !== 'SENT') {
      throw new BadRequestException(
        `Apenas pedidos enviados podem ser recebidos. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(purchaseOrders)
        .set({ status: 'RECEIVED', updatedAt: new Date() })
        .where(
          and(
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.companyId, user.companyId!),
            eq(purchaseOrders.status, 'SENT'),
          ),
        )
        .returning()

      if (!updated) {
        throw new ConflictException(
          'O pedido de compra foi modificado por outra operação. Tente novamente.',
        )
      }

      await tx.insert(auditLogs).values({
        entity: 'PurchaseOrder',
        entityId: id,
        action: 'RECEIVE',
        before: { status: 'SENT' },
        after: { status: 'RECEIVED' },
        userId: user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }
}
