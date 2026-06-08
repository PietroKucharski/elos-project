import type { CreateStockMovementDto } from '@elos/shared'
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
import { users } from '../../db/schema/auth'
import { products } from '../../db/schema/products'
import { inventory, stockMovements, warehouses } from '../../db/schema/warehouses'

@Injectable()
export class StockMovementsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  async findAll(
    user: SessionUser,
    query: {
      warehouseId?: string | undefined
      productId?: string | undefined
      type?: string | undefined
      page?: string | undefined
      limit?: string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'StockMovement')) {
      throw new ForbiddenException('Sem permissão para listar movimentações.')
    }

    // Parse seguro: `?page=abc`/`?limit=` produzem NaN; cai no default.
    const parsedPage = Number.parseInt(query.page ?? '', 10)
    const parsedLimit = Number.parseInt(query.limit ?? '', 10)
    const page = Math.max(1, Number.isNaN(parsedPage) ? 1 : parsedPage)
    const limit = Math.min(200, Math.max(1, Number.isNaN(parsedLimit) ? 50 : parsedLimit))
    const offset = (page - 1) * limit

    const conditions = [eq(stockMovements.companyId, user.companyId!)]
    if (query.warehouseId) {
      conditions.push(eq(stockMovements.warehouseId, query.warehouseId))
    }
    if (query.productId) {
      conditions.push(eq(stockMovements.productId, query.productId))
    }
    if (query.type) {
      conditions.push(eq(stockMovements.type, query.type as 'ENTRY'))
    }

    return this.db
      .select({
        id: stockMovements.id,
        companyId: stockMovements.companyId,
        warehouseId: stockMovements.warehouseId,
        warehouseName: warehouses.name,
        productId: stockMovements.productId,
        productName: products.name,
        productCode: products.code,
        unit: products.unit,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        referenceType: stockMovements.referenceType,
        referenceId: stockMovements.referenceId,
        notes: stockMovements.notes,
        createdById: stockMovements.createdById,
        createdByName: users.name,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .innerJoin(users, eq(users.id, stockMovements.createdById))
      .where(and(...conditions))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async create(dto: CreateStockMovementDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'StockMovement')) {
      throw new ForbiddenException('Sem permissão para registrar movimentação.')
    }

    // Validar armazém de origem
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

    if (!warehouse) throw new NotFoundException('Armazém de origem não encontrado ou inativo.')

    // Validar armazém de destino (apenas para TRANSFER)
    if (dto.type === 'TRANSFER') {
      if (!dto.toWarehouseId) {
        throw new BadRequestException('Transferência requer armazém de destino (toWarehouseId).')
      }
      if (dto.toWarehouseId === dto.warehouseId) {
        throw new BadRequestException('Armazém de origem e destino não podem ser o mesmo.')
      }
      const [toWarehouse] = await this.db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(
          and(
            eq(warehouses.id, dto.toWarehouseId),
            eq(warehouses.companyId, user.companyId!),
            eq(warehouses.isActive, true),
          ),
        )
        .limit(1)

      if (!toWarehouse) throw new NotFoundException('Armazém de destino não encontrado ou inativo.')
    }

    // Validar produto
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.id, dto.productId),
          eq(products.companyId, user.companyId!),
          eq(products.isActive, true),
        ),
      )
      .limit(1)

    if (!product) throw new NotFoundException('Produto não encontrado ou inativo.')

    return this.db.transaction(async (tx) => {
      // Para saídas e transferências: travar a linha de saldo e verificar a
      // suficiência DENTRO da transação (SELECT ... FOR UPDATE), antes da dedução,
      // para evitar a corrida TOCTOU entre a checagem e o upsert sob concorrência.
      if (dto.type === 'EXIT' || dto.type === 'TRANSFER') {
        const [inv] = await tx
          .select({ quantity: inventory.quantity })
          .from(inventory)
          .where(
            and(eq(inventory.warehouseId, dto.warehouseId), eq(inventory.productId, dto.productId)),
          )
          .for('update')
          .limit(1)

        const currentQty = Number(inv?.quantity ?? 0)
        if (currentQty < dto.quantity) {
          throw new BadRequestException(
            `Saldo insuficiente no armazém. Disponível: ${currentQty.toFixed(3)}; ` +
              `Solicitado: ${dto.quantity.toFixed(3)}.`,
          )
        }
      }

      const qty = String(dto.quantity)

      // Movimento de saída/entrada no armazém de origem
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          companyId: user.companyId!,
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          type: dto.type,
          quantity: qty,
          referenceType: dto.referenceType ?? null,
          referenceId: dto.referenceId ?? null,
          notes: dto.notes ?? null,
          createdById: user.id,
        })
        .returning()

      if (!movement) throw new Error('Falha ao criar movimentação.')

      // Atualizar inventory do armazém de origem: ENTRY soma, EXIT/TRANSFER subtrai.
      const signedQty = dto.type === 'ENTRY' ? qty : `-${qty}`

      await tx.execute(
        sql`
          INSERT INTO inventory (id, company_id, warehouse_id, product_id, quantity, updated_at)
          VALUES (gen_random_uuid(), ${user.companyId!}, ${dto.warehouseId}, ${dto.productId}, ${signedQty}::numeric, NOW())
          ON CONFLICT (warehouse_id, product_id)
          DO UPDATE SET quantity = inventory.quantity + ${signedQty}::numeric, updated_at = NOW()
        `,
      )

      // Para transferência: movimento de entrada no armazém de destino
      if (dto.type === 'TRANSFER' && dto.toWarehouseId) {
        await tx.insert(stockMovements).values({
          companyId: user.companyId!,
          warehouseId: dto.toWarehouseId,
          productId: dto.productId,
          type: 'ENTRY',
          quantity: qty,
          referenceType: 'transfer',
          referenceId: movement.id,
          notes: dto.notes ?? null,
          createdById: user.id,
        })

        await tx.execute(
          sql`
            INSERT INTO inventory (id, company_id, warehouse_id, product_id, quantity, updated_at)
            VALUES (gen_random_uuid(), ${user.companyId!}, ${dto.toWarehouseId}, ${dto.productId}, ${qty}::numeric, NOW())
            ON CONFLICT (warehouse_id, product_id)
            DO UPDATE SET quantity = inventory.quantity + ${qty}::numeric, updated_at = NOW()
          `,
        )
      }

      await tx.insert(auditLogs).values({
        entity: 'StockMovement',
        entityId: movement.id,
        action: 'CREATE',
        after: {
          type: dto.type,
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          quantity: dto.quantity,
        },
        userId: user.id,
        companyId: user.companyId,
      })

      return movement
    })
  }
}
