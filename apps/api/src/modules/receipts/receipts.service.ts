import type { CreateReceiptDto } from '@elos/shared'
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, sql } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { products } from '../../db/schema/products'
import { purchaseOrderItems, purchaseOrders } from '../../db/schema/purchase-orders'
import { receiptItems, receipts } from '../../db/schema/receipts'
// `inventory` é referenciada apenas no SQL bruto do upsert (ON CONFLICT), não como
// objeto Drizzle — por isso não é importada aqui.
import { stockMovements, warehouses } from '../../db/schema/warehouses'
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service'

@Injectable()
export class ReceiptsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
    @Inject(PurchaseOrdersService) private purchaseOrdersService: PurchaseOrdersService,
  ) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      purchaseOrderId?: string | undefined
      warehouseId?: string | undefined
      status?: string | undefined
      page?: string | undefined
      limit?: string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Receipt')) {
      throw new ForbiddenException('Sem permissão para listar recebimentos.')
    }

    // Parse seguro: `?page=abc`/`?limit=` produzem NaN; cai no default.
    const parsedPage = Number.parseInt(query.page ?? '', 10)
    const parsedLimit = Number.parseInt(query.limit ?? '', 10)
    const page = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage)
    const limit = Math.min(100, Math.max(1, Number.isNaN(parsedLimit) ? 20 : parsedLimit))
    const offset = (page - 1) * limit

    const conditions = [eq(receipts.companyId, user.companyId!)]
    if (query.purchaseOrderId) {
      conditions.push(eq(receipts.purchaseOrderId, query.purchaseOrderId))
    }
    if (query.warehouseId) {
      conditions.push(eq(receipts.warehouseId, query.warehouseId))
    }
    if (query.status) {
      conditions.push(eq(receipts.status, query.status as 'PARTIAL'))
    }

    return this.db
      .select({
        id: receipts.id,
        companyId: receipts.companyId,
        purchaseOrderId: receipts.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        warehouseId: receipts.warehouseId,
        warehouseName: warehouses.name,
        receivedById: receipts.receivedById,
        status: receipts.status,
        notes: receipts.notes,
        receivedAt: receipts.receivedAt,
        createdAt: receipts.createdAt,
        updatedAt: receipts.updatedAt,
      })
      .from(receipts)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, receipts.purchaseOrderId))
      .innerJoin(warehouses, eq(warehouses.id, receipts.warehouseId))
      .where(and(...conditions))
      .orderBy(desc(receipts.receivedAt))
      .limit(limit)
      .offset(offset)
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Receipt')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [receipt] = await this.db
      .select({
        id: receipts.id,
        companyId: receipts.companyId,
        purchaseOrderId: receipts.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        warehouseId: receipts.warehouseId,
        warehouseName: warehouses.name,
        receivedById: receipts.receivedById,
        status: receipts.status,
        notes: receipts.notes,
        receivedAt: receipts.receivedAt,
        createdAt: receipts.createdAt,
        updatedAt: receipts.updatedAt,
      })
      .from(receipts)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, receipts.purchaseOrderId))
      .innerJoin(warehouses, eq(warehouses.id, receipts.warehouseId))
      .where(and(eq(receipts.id, id), eq(receipts.companyId, user.companyId!)))
      .limit(1)

    if (!receipt) throw new NotFoundException('Recebimento não encontrado.')

    const items = await this.db
      .select({
        id: receiptItems.id,
        receiptId: receiptItems.receiptId,
        purchaseOrderItemId: receiptItems.purchaseOrderItemId,
        productId: purchaseOrderItems.productId,
        productName: products.name,
        productCode: products.code,
        unit: products.unit,
        orderedQuantity: purchaseOrderItems.quantity,
        receivedQuantity: receiptItems.receivedQuantity,
        totalReceived: purchaseOrderItems.receivedQuantity,
        notes: receiptItems.notes,
        createdAt: receiptItems.createdAt,
        updatedAt: receiptItems.updatedAt,
      })
      .from(receiptItems)
      .innerJoin(purchaseOrderItems, eq(purchaseOrderItems.id, receiptItems.purchaseOrderItemId))
      .innerJoin(products, eq(products.id, purchaseOrderItems.productId))
      .where(eq(receiptItems.receiptId, id))

    return { ...receipt, items }
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateReceiptDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Receipt')) {
      throw new ForbiddenException('Sem permissão para registrar recebimento.')
    }

    // 1. Validar PO (deve ser SENT, pertencer à empresa)
    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, dto.purchaseOrderId),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!po) throw new NotFoundException('Pedido de compra não encontrado.')
    if (po.status !== 'SENT') {
      throw new BadRequestException(
        `Somente pedidos enviados (SENT) podem ser recebidos. Status atual: ${po.status}.`,
      )
    }

    // 2. Validar armazém (deve pertencer à empresa, estar ativo)
    const [warehouse] = await this.db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, dto.warehouseId),
          eq(warehouses.companyId, user.companyId!),
          eq(warehouses.isActive, true),
        ),
      )
      .limit(1)

    if (!warehouse) throw new NotFoundException('Armazém não encontrado ou inativo.')

    // 3. Carregar todos os itens do PO com quantidades já recebidas
    const poItems = await this.db
      .select({
        id: purchaseOrderItems.id,
        productId: purchaseOrderItems.productId,
        quantity: purchaseOrderItems.quantity,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
      })
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, dto.purchaseOrderId))

    const poItemsMap = new Map(poItems.map((i) => [i.id, i]))

    // 4. Validar quantidades do recebimento
    for (const item of dto.items) {
      const poItem = poItemsMap.get(item.purchaseOrderItemId)
      if (!poItem) {
        throw new BadRequestException(
          `Item ${item.purchaseOrderItemId} não pertence ao pedido de compra.`,
        )
      }
      const remaining = Number(poItem.quantity) - Number(poItem.receivedQuantity)
      if (item.receivedQuantity > remaining) {
        throw new BadRequestException(
          `Quantidade informada (${item.receivedQuantity}) excede o saldo pendente ` +
            `(${remaining.toFixed(3)}) do item.`,
        )
      }
    }

    // 5. Executar tudo em transação
    const receipt = await this.db.transaction(async (tx) => {
      // 5.1 Criar receipt
      const [created] = await tx
        .insert(receipts)
        .values({
          companyId: user.companyId!,
          purchaseOrderId: dto.purchaseOrderId,
          warehouseId: dto.warehouseId,
          receivedById: user.id,
          status: 'PARTIAL', // calculado abaixo após inserir itens
          notes: dto.notes ?? null,
          receivedAt: new Date(dto.receivedAt),
        })
        .returning()

      if (!created) throw new Error('Falha ao criar recebimento.')

      // 5.2 Inserir receipt_items + atualizar PO item + stock movement + inventory
      for (const item of dto.items) {
        const poItem = poItemsMap.get(item.purchaseOrderItemId)!

        // 5.2.1 receipt_item
        await tx.insert(receiptItems).values({
          receiptId: created.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          receivedQuantity: String(item.receivedQuantity),
          notes: item.notes ?? null,
        })

        // 5.2.2 Atualizar received_quantity acumulado no PO item
        await tx
          .update(purchaseOrderItems)
          .set({
            receivedQuantity: sql`${purchaseOrderItems.receivedQuantity}::numeric + ${String(item.receivedQuantity)}`,
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrderItems.id, item.purchaseOrderItemId))

        // 5.2.3 Stock movement ENTRY
        await tx.insert(stockMovements).values({
          companyId: user.companyId!,
          warehouseId: dto.warehouseId,
          productId: poItem.productId,
          type: 'ENTRY',
          quantity: String(item.receivedQuantity),
          referenceType: 'receipt',
          referenceId: created.id,
          notes: item.notes ?? null,
          createdById: user.id,
        })

        // 5.2.4 Upsert inventory
        await tx.execute(
          sql`
            INSERT INTO inventory (id, company_id, warehouse_id, product_id, quantity, updated_at)
            VALUES (
              gen_random_uuid(),
              ${user.companyId!},
              ${dto.warehouseId},
              ${poItem.productId},
              ${String(item.receivedQuantity)},
              NOW()
            )
            ON CONFLICT (warehouse_id, product_id)
            DO UPDATE SET
              quantity = inventory.quantity + EXCLUDED.quantity,
              updated_at = NOW()
          `,
        )
      }

      // 5.3 Determinar status do recebimento (PARTIAL ou COMPLETE)
      // Recarregar quantidades atualizadas dos itens do PO
      const updatedItems = await tx
        .select({
          quantity: purchaseOrderItems.quantity,
          receivedQuantity: purchaseOrderItems.receivedQuantity,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, dto.purchaseOrderId))

      const isComplete = updatedItems.every((i) => Number(i.receivedQuantity) >= Number(i.quantity))

      const receiptStatus: 'PARTIAL' | 'COMPLETE' = isComplete ? 'COMPLETE' : 'PARTIAL'

      // 5.4 Atualizar status do receipt
      const [finalReceipt] = await tx
        .update(receipts)
        .set({ status: receiptStatus, updatedAt: new Date() })
        .where(eq(receipts.id, created.id))
        .returning()

      // 5.5 Audit log
      await tx.insert(auditLogs).values({
        entity: 'Receipt',
        entityId: created.id,
        action: 'CREATE',
        after: {
          purchaseOrderId: dto.purchaseOrderId,
          warehouseId: dto.warehouseId,
          status: receiptStatus,
          itemCount: dto.items.length,
        },
        userId: user.id,
        companyId: user.companyId,
      })

      return finalReceipt
    })

    // 6. Se completo, marcar PO como RECEIVED (fora da transação principal para
    //    evitar transação aninhada — PurchaseOrdersService abre a sua própria).
    //    `receive()` é idempotente: retorna 400 se o PO já estiver RECEIVED.
    if (receipt?.status === 'COMPLETE') {
      await this.purchaseOrdersService.receive(dto.purchaseOrderId, user)
    }

    return receipt
  }
}
