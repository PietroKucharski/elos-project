# Feature Spec — 5.3 Receipts API (NestJS)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 5 — Recebimento e Estoque  
**Unidade:** 5.3  
**Pré-requisito:** 5.2 concluído (`WarehousesModule` e `WarehousesService` disponíveis)  
**Commit convencional esperado:** `feat(api): add receipts module with stock movements and po completion`

---

## Objetivo

Criar o módulo NestJS `ReceiptsModule` que registra o recebimento de mercadorias
de um Pedido de Compra. Ao criar um recebimento:

1. Valida que o PO está em status `SENT` e pertence à empresa.
2. Valida que o armazém de destino pertence à empresa e está ativo.
3. Cria o registro de `receipt` e os `receipt_items`.
4. Atualiza `purchase_order_items.received_quantity` (acumula).
5. Cria `stock_movements` do tipo `ENTRY` para cada item no armazém de destino.
6. Faz upsert em `inventory` (saldo por produto/armazém).
7. Determina se o recebimento é `PARTIAL` ou `COMPLETE` (todos os itens
   totalmente recebidos).
8. Se `COMPLETE`, chama `purchaseOrdersService.receive()` para marcar o PO
   como `RECEIVED`.

Inclui também um `StockMovementsService` (interno a este módulo) para registrar
movimentações manuais de estoque (entrada, saída, transferência).

---

## Decisões de Negócio

| Regra | Comportamento |
| ----- | ------------- |
| PO requerido | O PO deve estar em status `SENT`; qualquer outro status → 400 |
| Recebimento parcial | Permitido — `receivedQuantity` por item pode ser menor que `orderedQuantity` |
| Exceder quantidade | `receivedQuantity` de um item não pode exceder `orderedQuantity - totalJáRecebido` → 400 |
| Status do recebimento | `COMPLETE` se `SUM(received_quantity) >= orderedQuantity` para **todos** os itens do PO; caso contrário `PARTIAL` |
| PO → `RECEIVED` | Só quando status = `COMPLETE`; PO parcialmente recebido permanece `SENT` |
| Stock movement | `ENTRY` gerado automaticamente para cada `receipt_item`; `referenceType='receipt'`, `referenceId=receipt.id` |
| Inventory upsert | `INSERT … ON CONFLICT (warehouse_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity` |
| Múltiplos recebimentos | Um PO pode ter vários `receipts` (parciais); o sistema acumula `received_quantity` |
| Movimentação manual | ALMOXARIFE pode registrar saídas, entradas avulsas e transferências entre armazéns via `POST /stock-movements` |
| Transferência | Gera 2 `stock_movements`: `EXIT` no armazém de origem + `ENTRY` no destino; atualiza ambos os `inventory` |
| Exclusão de recebimento | Não existe — recebimento é imutável (audit trail) |

---

## Escopo

### In

- `apps/api/src/modules/receipts/receipts.module.ts`
- `apps/api/src/modules/receipts/receipts.controller.ts`
- `apps/api/src/modules/receipts/receipts.controller.spec.ts`
- `apps/api/src/modules/receipts/receipts.service.ts`
- `apps/api/src/modules/receipts/receipts.service.spec.ts`
- `apps/api/src/modules/receipts/stock-movements.service.ts`
- `apps/api/src/modules/receipts/stock-movements.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `Receipt`, `StockMovement`
- Modificação em `apps/api/src/app.module.ts` — importar `ReceiptsModule`
- Migration de banco: constraint `UNIQUE (warehouse_id, product_id)` em `inventory`
  (necessária para o upsert ON CONFLICT)

### Out

- UI (→ 5.6)
- Não-conformidades (→ 5.4)

---

## Rotas

| Método | Caminho | Papel mínimo | Descrição |
| ------ | ------- | ------------ | --------- |
| GET | `/v1/companies/:cnpj/receipts` | Autenticado | Lista recebimentos |
| POST | `/v1/companies/:cnpj/receipts` | `ALMOXARIFE` | Registra recebimento |
| GET | `/v1/companies/:cnpj/receipts/:id` | Autenticado | Detalhe com itens |
| GET | `/v1/companies/:cnpj/purchase-orders/:poId/receipts` | Autenticado | Recebimentos de um PO |
| GET | `/v1/companies/:cnpj/stock-movements` | Autenticado | Lista movimentações |
| POST | `/v1/companies/:cnpj/stock-movements` | `ALMOXARIFE` | Movimentação manual |

> **Query params em GET /receipts:** `purchaseOrderId` (uuid), `warehouseId` (uuid),
> `status` (PARTIAL|COMPLETE), `page` (default 1), `limit` (default 20, max 100).  
> **Query params em GET /stock-movements:** `warehouseId` (uuid), `productId` (uuid),
> `type` (ENTRY|EXIT|TRANSFER), `page` (default 1), `limit` (default 50, max 200).

---

## Arquivos a Criar / Modificar

```text
apps/api/src/
  modules/
    receipts/
      receipts.module.ts                  ← criar
      receipts.controller.ts              ← criar
      receipts.controller.spec.ts         ← criar
      receipts.service.ts                 ← criar
      receipts.service.spec.ts            ← criar
      stock-movements.service.ts          ← criar
      stock-movements.service.spec.ts     ← criar
  common/
    ability/
      ability.factory.ts                  ← modificar (regras Receipt, StockMovement)
  app.module.ts                           ← modificar (importar ReceiptsModule)
  db/
    migrations/
      0004_receipts_inventory_constraint.sql  ← criar (constraint UNIQUE em inventory)
```

---

## Implementação Detalhada

### 1. Migration — constraint UNIQUE em `inventory`

O upsert `ON CONFLICT (warehouse_id, product_id)` exige um constraint de
unicidade composto. A tabela `inventory` definida em 0.3 não o incluiu.

Criar `apps/api/src/db/migrations/0004_receipts_inventory_constraint.sql`:

```sql
-- Adicionar constraint UNIQUE em inventory (warehouse_id, product_id)
-- Necessário para o ON CONFLICT do upsert de saldo de estoque
ALTER TABLE inventory
  ADD CONSTRAINT inventory_warehouse_product_unique
  UNIQUE (warehouse_id, product_id);
```

Adicionar a entrada ao `_journal.json` e gerar o snapshot 0004 conforme padrão
estabelecido em 3.2 (migration escrita à mão + snapshot via script mutando o
snapshot anterior).

> Depois de aplicar a migration, validar com `drizzle-kit check`.

---

### 2. Modificar `ability.factory.ts` — regras `Receipt` e `StockMovement`

```typescript
// Adicionar ao union Subjects:
//   'Receipt'        | (Receipt & ForcedSubject<'Receipt'>)
//   'StockMovement'  | (StockMovement & ForcedSubject<'StockMovement'>)

case 'SUPER_ADMIN':
  can('manage', 'all')
  break

case 'ADMIN_EMPRESA':
  // regras já existentes ...
  can('manage', 'Receipt',       { companyId })
  can('manage', 'StockMovement', { companyId })
  break

case 'COMPRADOR':
  // regras já existentes ...
  can('read', 'Receipt',       { companyId })
  can('read', 'StockMovement', { companyId })
  break

case 'ALMOXARIFE':
  // regras já existentes ...
  can('manage', 'Receipt',       { companyId })
  can('manage', 'StockMovement', { companyId })
  break

case 'ANALISTA_FINANCEIRO':
  // regras já existentes ...
  can('read', 'Receipt',       { companyId })
  can('read', 'StockMovement', { companyId })
  break

case 'TRANSPORTADOR':
  // regras já existentes ...
  can('read', 'Receipt',       { companyId })
  break
```

---

### 3. `receipts.service.ts`

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, sql } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { auditLogs } from '../../db/schema/audit-logs'
import { products } from '../../db/schema/products'
import { purchaseOrderItems, purchaseOrders } from '../../db/schema/purchase-orders'
import { receiptItems, receipts } from '../../db/schema/receipts'
import { inventory, stockMovements, warehouses } from '../../db/schema/warehouses'
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service'
import type { CreateReceiptDto } from '@elos/shared'

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
      warehouseId?:     string | undefined
      status?:          string | undefined
      page?:            string | undefined
      limit?:           string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Receipt')) {
      throw new ForbiddenException('Sem permissão para listar recebimentos.')
    }

    const page   = Math.max(1, Number.isFinite(Number.parseInt(query.page ?? '1', 10)) ? Number.parseInt(query.page ?? '1', 10) : 1)
    const limit  = Math.min(100, Math.max(1, Number.isFinite(Number.parseInt(query.limit ?? '20', 10)) ? Number.parseInt(query.limit ?? '20', 10) : 20))
    const offset = (page - 1) * limit

    const conditions = [eq(receipts.companyId, user.companyId!)]
    if (query.purchaseOrderId) conditions.push(eq(receipts.purchaseOrderId, query.purchaseOrderId))
    if (query.warehouseId)     conditions.push(eq(receipts.warehouseId, query.warehouseId))
    if (query.status)          conditions.push(eq(receipts.status, query.status as 'PARTIAL'))

    return this.db
      .select({
        id:                 receipts.id,
        companyId:          receipts.companyId,
        purchaseOrderId:    receipts.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        warehouseId:        receipts.warehouseId,
        warehouseName:      warehouses.name,
        receivedById:       receipts.receivedById,
        status:             receipts.status,
        notes:              receipts.notes,
        receivedAt:         receipts.receivedAt,
        createdAt:          receipts.createdAt,
        updatedAt:          receipts.updatedAt,
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
        id:                 receipts.id,
        companyId:          receipts.companyId,
        purchaseOrderId:    receipts.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        warehouseId:        receipts.warehouseId,
        warehouseName:      warehouses.name,
        receivedById:       receipts.receivedById,
        status:             receipts.status,
        notes:              receipts.notes,
        receivedAt:         receipts.receivedAt,
        createdAt:          receipts.createdAt,
        updatedAt:          receipts.updatedAt,
      })
      .from(receipts)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, receipts.purchaseOrderId))
      .innerJoin(warehouses, eq(warehouses.id, receipts.warehouseId))
      .where(
        and(
          eq(receipts.id, id),
          eq(receipts.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!receipt) throw new NotFoundException('Recebimento não encontrado.')

    const items = await this.db
      .select({
        id:                  receiptItems.id,
        receiptId:           receiptItems.receiptId,
        purchaseOrderItemId: receiptItems.purchaseOrderItemId,
        productId:           purchaseOrderItems.productId,
        productName:         products.name,
        productCode:         products.code,
        unit:                products.unit,
        orderedQuantity:     purchaseOrderItems.quantity,
        receivedQuantity:    receiptItems.receivedQuantity,
        totalReceived:       purchaseOrderItems.receivedQuantity,
        notes:               receiptItems.notes,
        createdAt:           receiptItems.createdAt,
        updatedAt:           receiptItems.updatedAt,
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
        id:               purchaseOrderItems.id,
        productId:        purchaseOrderItems.productId,
        quantity:         purchaseOrderItems.quantity,
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
      const remaining =
        Number(poItem.quantity) - Number(poItem.receivedQuantity)
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
          companyId:       user.companyId!,
          purchaseOrderId: dto.purchaseOrderId,
          warehouseId:     dto.warehouseId,
          receivedById:    user.id,
          status:          'PARTIAL', // calculado abaixo após inserir itens
          notes:           dto.notes ?? null,
          receivedAt:      new Date(dto.receivedAt),
        })
        .returning()

      if (!created) throw new Error('Falha ao criar recebimento.')

      // 5.2 Inserir receipt_items + atualizar PO item + stock movement + inventory
      for (const item of dto.items) {
        const poItem = poItemsMap.get(item.purchaseOrderItemId)!

        // 5.2.1 receipt_item
        await tx.insert(receiptItems).values({
          receiptId:           created.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          receivedQuantity:    String(item.receivedQuantity),
          notes:               item.notes ?? null,
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
          companyId:     user.companyId!,
          warehouseId:   dto.warehouseId,
          productId:     poItem.productId!,
          type:          'ENTRY',
          quantity:      String(item.receivedQuantity),
          referenceType: 'receipt',
          referenceId:   created.id,
          notes:         item.notes ?? null,
          createdById:   user.id,
        })

        // 5.2.4 Upsert inventory
        await tx.execute(
          sql`
            INSERT INTO inventory (id, company_id, warehouse_id, product_id, quantity, updated_at)
            VALUES (
              gen_random_uuid(),
              ${user.companyId!},
              ${dto.warehouseId},
              ${poItem.productId!},
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
          quantity:         purchaseOrderItems.quantity,
          receivedQuantity: purchaseOrderItems.receivedQuantity,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, dto.purchaseOrderId))

      const isComplete = updatedItems.every(
        (i) => Number(i.receivedQuantity) >= Number(i.quantity),
      )

      const receiptStatus: 'PARTIAL' | 'COMPLETE' = isComplete ? 'COMPLETE' : 'PARTIAL'

      // 5.4 Atualizar status do receipt
      const [finalReceipt] = await tx
        .update(receipts)
        .set({ status: receiptStatus, updatedAt: new Date() })
        .where(eq(receipts.id, created.id))
        .returning()

      // 5.5 Audit log
      await tx.insert(auditLogs).values({
        entity:    'Receipt',
        entityId:  created.id,
        action:    'CREATE',
        after:     {
          purchaseOrderId: dto.purchaseOrderId,
          warehouseId:     dto.warehouseId,
          status:          receiptStatus,
          itemCount:       dto.items.length,
        },
        userId:    user.id,
        companyId: user.companyId,
      })

      return finalReceipt
    })

    // 6. Se completo, marcar PO como RECEIVED (fora da transação principal
    //    para evitar deadlock — PurchaseOrdersService abre sua própria transação)
    if (receipt?.status === 'COMPLETE') {
      await this.purchaseOrdersService.receive(dto.purchaseOrderId, user)
    }

    return receipt
  }
}
```

> **Nota sobre `purchaseOrdersService.receive()` fora da transação:**
> Chamar `receive()` dentro da mesma transação criaria uma transação aninhada
> (Drizzle usa `SAVEPOINT` internamente, mas o PurchaseOrdersService abre
> `this.db.transaction(...)` novamente — comportamento seguro em Drizzle/postgres.js,
> mas pode gerar confusão). A abordagem mais simples é chamar após o `commit`
> da transação principal (fora do `db.transaction`). Se `receive()` falhar,
> o recebimento já foi registrado (idempotente: `receive()` verifica o status
> e retorna 400 se já `RECEIVED`).

---

### 4. `stock-movements.service.ts`

```typescript
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { auditLogs } from '../../db/schema/audit-logs'
import { products } from '../../db/schema/products'
import { users } from '../../db/schema/auth'
import { inventory, stockMovements, warehouses } from '../../db/schema/warehouses'
import { sql } from 'drizzle-orm'
import type { CreateStockMovementDto } from '@elos/shared'

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
      productId?:   string | undefined
      type?:        string | undefined
      page?:        string | undefined
      limit?:       string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'StockMovement')) {
      throw new ForbiddenException('Sem permissão para listar movimentações.')
    }

    const page   = Math.max(1, Number.isFinite(Number.parseInt(query.page ?? '1', 10)) ? Number.parseInt(query.page ?? '1', 10) : 1)
    const limit  = Math.min(200, Math.max(1, Number.isFinite(Number.parseInt(query.limit ?? '50', 10)) ? Number.parseInt(query.limit ?? '50', 10) : 50))
    const offset = (page - 1) * limit

    const conditions = [eq(stockMovements.companyId, user.companyId!)]
    if (query.warehouseId) conditions.push(eq(stockMovements.warehouseId, query.warehouseId))
    if (query.productId)   conditions.push(eq(stockMovements.productId, query.productId))
    if (query.type)        conditions.push(eq(stockMovements.type, query.type as 'ENTRY'))

    return this.db
      .select({
        id:            stockMovements.id,
        companyId:     stockMovements.companyId,
        warehouseId:   stockMovements.warehouseId,
        warehouseName: warehouses.name,
        productId:     stockMovements.productId,
        productName:   products.name,
        productCode:   products.code,
        unit:          products.unit,
        type:          stockMovements.type,
        quantity:      stockMovements.quantity,
        referenceType: stockMovements.referenceType,
        referenceId:   stockMovements.referenceId,
        notes:         stockMovements.notes,
        createdById:   stockMovements.createdById,
        createdByName: users.name,
        createdAt:     stockMovements.createdAt,
      })
      .from(stockMovements)
      .innerJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
      .innerJoin(products,   eq(products.id,   stockMovements.productId))
      .innerJoin(users,      eq(users.id,       stockMovements.createdById))
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

    // Para saídas e transferências: verificar saldo disponível
    if (dto.type === 'EXIT' || dto.type === 'TRANSFER') {
      const [inv] = await this.db
        .select({ quantity: inventory.quantity })
        .from(inventory)
        .where(
          and(
            eq(inventory.warehouseId, dto.warehouseId),
            eq(inventory.productId, dto.productId),
          ),
        )
        .limit(1)

      const currentQty = Number(inv?.quantity ?? 0)
      if (currentQty < dto.quantity) {
        throw new BadRequestException(
          `Saldo insuficiente no armazém. ` +
          `Disponível: ${currentQty.toFixed(3)}; Solicitado: ${dto.quantity.toFixed(3)}.`,
        )
      }
    }

    return this.db.transaction(async (tx) => {
      const qty = String(dto.quantity)

      // Movimento de saída/entrada no armazém de origem
      const [movement] = await tx
        .insert(stockMovements)
        .values({
          companyId:     user.companyId!,
          warehouseId:   dto.warehouseId,
          productId:     dto.productId,
          type:          dto.type,
          quantity:      qty,
          referenceType: dto.referenceType ?? null,
          referenceId:   dto.referenceId ?? null,
          notes:         dto.notes ?? null,
          createdById:   user.id,
        })
        .returning()

      if (!movement) throw new Error('Falha ao criar movimentação.')

      // Atualizar inventory do armazém de origem
      const qtyOp = dto.type === 'EXIT' || dto.type === 'TRANSFER'
        ? sql`inventory.quantity - ${qty}::numeric`
        : sql`inventory.quantity + ${qty}::numeric`

      await tx.execute(
        sql`
          INSERT INTO inventory (id, company_id, warehouse_id, product_id, quantity, updated_at)
          VALUES (gen_random_uuid(), ${user.companyId!}, ${dto.warehouseId}, ${dto.productId}, ${
            dto.type === 'ENTRY' ? qty : `-${qty}`
          }::numeric, NOW())
          ON CONFLICT (warehouse_id, product_id)
          DO UPDATE SET quantity = inventory.quantity + ${
            dto.type === 'ENTRY' ? qty : `-${qty}`
          }::numeric, updated_at = NOW()
        `,
      )

      // Para transferência: movimento de entrada no armazém de destino
      if (dto.type === 'TRANSFER' && dto.toWarehouseId) {
        await tx.insert(stockMovements).values({
          companyId:     user.companyId!,
          warehouseId:   dto.toWarehouseId,
          productId:     dto.productId,
          type:          'ENTRY',
          quantity:      qty,
          referenceType: 'transfer',
          referenceId:   movement.id,
          notes:         dto.notes ?? null,
          createdById:   user.id,
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
        entity:    'StockMovement',
        entityId:  movement.id,
        action:    'CREATE',
        after: {
          type:        dto.type,
          warehouseId: dto.warehouseId,
          productId:   dto.productId,
          quantity:    dto.quantity,
        },
        userId:    user.id,
        companyId: user.companyId,
      })

      return movement
    })
  }
}
```

---

### 5. `receipts.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import {
  createReceiptSchema,
  createStockMovementSchema,
  type CreateReceiptDto,
  type CreateStockMovementDto,
} from '@elos/shared'
import { ReceiptsService } from './receipts.service'
import { StockMovementsService } from './stock-movements.service'

@ApiTags('receipts')
@ApiCookieAuth()
@Controller('companies/:cnpj')
@UseGuards(AuthGuard)
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  // ─── Receipts ─────────────────────────────────────────────────────────────

  @Get('receipts')
  @ApiOperation({ summary: 'Listar recebimentos' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('warehouseId')     warehouseId?: string,
    @Query('status')          status?: string,
    @Query('page')            page?: string,
    @Query('limit')           limit?: string,
  ) {
    return this.receiptsService.findAll(user, { purchaseOrderId, warehouseId, status, page, limit })
  }

  @Post('receipts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar recebimento de mercadoria' })
  @ApiResponse({ status: 201, description: 'Recebimento registrado.' })
  @ApiResponse({ status: 400, description: 'PO não está SENT ou quantidade excedida.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'PO ou armazém não encontrado.' })
  create(
    @Body(new ZodValidationPipe(createReceiptSchema)) body: CreateReceiptDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.receiptsService.create(body, user)
  }

  @Get('receipts/:id')
  @ApiOperation({ summary: 'Detalhe do recebimento com itens' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.receiptsService.findOne(id, user)
  }

  @Get('purchase-orders/:poId/receipts')
  @ApiOperation({ summary: 'Recebimentos de um Pedido de Compra' })
  findByPo(@Param('poId') poId: string, @CurrentUser() user: SessionUser) {
    return this.receiptsService.findAll(user, { purchaseOrderId: poId })
  }

  // ─── Stock Movements ──────────────────────────────────────────────────────

  @Get('stock-movements')
  @ApiOperation({ summary: 'Listar movimentações de estoque' })
  findMovements(
    @CurrentUser() user: SessionUser,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId')   productId?: string,
    @Query('type')        type?: string,
    @Query('page')        page?: string,
    @Query('limit')       limit?: string,
  ) {
    return this.stockMovementsService.findAll(user, { warehouseId, productId, type, page, limit })
  }

  @Post('stock-movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar movimentação manual de estoque' })
  @ApiResponse({ status: 201, description: 'Movimentação registrada.' })
  createMovement(
    @Body(new ZodValidationPipe(createStockMovementSchema)) body: CreateStockMovementDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.stockMovementsService.create(body, user)
  }
}
```

---

### 6. `receipts.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module'
import { ReceiptsController } from './receipts.controller'
import { ReceiptsService } from './receipts.service'
import { StockMovementsService } from './stock-movements.service'

@Module({
  imports: [AbilityModule, PurchaseOrdersModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, StockMovementsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
```

---

### 7. `receipts.service.spec.ts` (casos críticos)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { ReceiptsService } from './receipts.service'
import { DRIZZLE } from '../../db.module'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service'

const companyId       = '00000000-0000-0000-0000-000000000001'
const poId            = '00000000-0000-0000-0000-000000000002'
const warehouseId     = '00000000-0000-0000-0000-000000000003'
const poItemId        = '00000000-0000-0000-0000-000000000004'
const productId       = '00000000-0000-0000-0000-000000000005'
const userId          = 'user-001'

const mockPO = { id: poId, status: 'SENT', companyId, number: 'PO-2024-0001' }
const mockWarehouse = { id: warehouseId, companyId, name: 'Central', isActive: true }
const mockPOItem = { id: poItemId, productId, quantity: '10.000', receivedQuantity: '0.000' }

const mockUser = {
  id: userId, email: 'almox@test.com', name: 'Almox',
  role: 'ALMOXARIFE', companyId,
} as any

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])

  const qb: Record<string, unknown> = {
    select:    vi.fn().mockReturnThis(),
    from:      vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin:  vi.fn().mockReturnThis(),
    where:     vi.fn().mockReturnThis(),
    orderBy:   vi.fn().mockReturnThis(),
    limit:     vi.fn().mockReturnThis(),
    offset:    vi.fn().mockReturnThis(),
    insert:    vi.fn().mockReturnThis(),
    values:    vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update:    vi.fn().mockReturnThis(),
    set:       vi.fn().mockReturnThis(),
    execute:   vi.fn().mockResolvedValue([]),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select:      () => qb,
    insert:      () => qb,
    update:      () => qb,
    execute:     vi.fn().mockResolvedValue([]),
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }

  return { mockDb, enqueue }
}

describe('ReceiptsService', () => {
  let service: ReceiptsService
  let mockDb: ReturnType<typeof makeDb>['mockDb']
  let enqueue: ReturnType<typeof makeDb>['enqueue']

  const mockAbility        = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }
  const mockPoService      = { receive: vi.fn().mockResolvedValue({ status: 'RECEIVED' }) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    mockDb = db; enqueue = eq

    const module = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        { provide: DRIZZLE,               useValue: mockDb },
        { provide: AbilityFactory,         useValue: mockAbilityFactory },
        { provide: PurchaseOrdersService,  useValue: mockPoService },
      ],
    }).compile()

    service = module.get(ReceiptsService)
    mockAbility.cannot.mockReturnValue(false)
    mockPoService.receive.mockClear()
  })

  describe('findAll', () => {
    it('lista recebimentos', async () => {
      enqueue({})
      const r = await service.findAll(mockUser, {})
      expect(r).toBeDefined()
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.findAll(mockUser, {})).rejects.toThrow(ForbiddenException)
    })
  })

  describe('create', () => {
    const dto = {
      purchaseOrderId: poId,
      warehouseId,
      receivedAt: new Date().toISOString(),
      items: [{ purchaseOrderItemId: poItemId, receivedQuantity: 10 }],
    }

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create(dto, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se PO não encontrado', async () => {
      enqueue(undefined) // PO
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se PO não está SENT', async () => {
      enqueue({ ...mockPO, status: 'APPROVED' })
      await expect(service.create(dto, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 404 se armazém não encontrado', async () => {
      enqueue(mockPO)    // PO válido
      enqueue(undefined) // armazém não encontrado
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se quantidade excede saldo pendente', async () => {
      enqueue(mockPO)                                   // PO
      enqueue(mockWarehouse)                            // warehouse
      enqueue({ ...mockPOItem, receivedQuantity: '5.000' }) // PO items — 5 já recebidos, restam 5
      await expect(
        service.create({ ...dto, items: [{ purchaseOrderItemId: poItemId, receivedQuantity: 6 }] }, mockUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('retorna 400 se item não pertence ao PO', async () => {
      enqueue(mockPO)      // PO
      enqueue(mockWarehouse) // warehouse
      enqueue(mockPOItem)  // PO items (não inclui o item do dto)
      await expect(
        service.create(
          { ...dto, items: [{ purchaseOrderItemId: '00000000-0000-0000-0000-000000000099', receivedQuantity: 1 }] },
          mockUser,
        ),
      ).rejects.toThrow(BadRequestException)
    })

    it('chama purchaseOrdersService.receive quando COMPLETE', async () => {
      enqueue(mockPO)       // PO
      enqueue(mockWarehouse) // warehouse
      enqueue(mockPOItem)   // PO items para mapa
      // dentro da transação:
      enqueue({ id: 'receipt-1', status: 'PARTIAL' }) // receipt insert
      enqueue([{ quantity: '10.000', receivedQuantity: '10.000' }]) // updatedItems (COMPLETE)
      enqueue({ id: 'receipt-1', status: 'COMPLETE' }) // update status returning

      await service.create(dto, mockUser)
      expect(mockPoService.receive).toHaveBeenCalledWith(poId, mockUser)
    })

    it('não chama purchaseOrdersService.receive quando PARTIAL', async () => {
      enqueue(mockPO)
      enqueue(mockWarehouse)
      enqueue(mockPOItem)
      enqueue({ id: 'receipt-1', status: 'PARTIAL' })
      enqueue([{ quantity: '10.000', receivedQuantity: '5.000' }]) // PARTIAL
      enqueue({ id: 'receipt-1', status: 'PARTIAL' })

      await service.create(
        { ...dto, items: [{ purchaseOrderItemId: poItemId, receivedQuantity: 5 }] },
        mockUser,
      )
      expect(mockPoService.receive).not.toHaveBeenCalled()
    })
  })
})
```

---

### 8. `stock-movements.service.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { StockMovementsService } from './stock-movements.service'
import { DRIZZLE } from '../../db.module'
import { AbilityFactory } from '../../common/ability/ability.factory'

const companyId   = '00000000-0000-0000-0000-000000000001'
const warehouseId = '00000000-0000-0000-0000-000000000002'
const productId   = '00000000-0000-0000-0000-000000000003'
const userId      = 'user-001'

const mockWarehouse = { id: warehouseId, companyId, isActive: true }
const mockProduct   = { id: productId, companyId, isActive: true }
const mockInventory = { quantity: '100.000' }
const mockUser      = { id: userId, role: 'ALMOXARIFE', companyId } as any

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])

  const qb: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(), returning: vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select: () => qb, insert: () => qb,
    execute: vi.fn().mockResolvedValue([]),
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }
  return { mockDb, enqueue }
}

describe('StockMovementsService', () => {
  let service: StockMovementsService
  let mockDb: ReturnType<typeof makeDb>['mockDb']
  let enqueue: ReturnType<typeof makeDb>['enqueue']
  const mockAbility        = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    mockDb = db; enqueue = eq
    const module = await Test.createTestingModule({
      providers: [
        StockMovementsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()
    service = module.get(StockMovementsService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('create', () => {
    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(
        service.create({ warehouseId, productId, type: 'ENTRY', quantity: 10 }, mockUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se armazém não encontrado', async () => {
      enqueue(undefined)
      await expect(
        service.create({ warehouseId, productId, type: 'ENTRY', quantity: 10 }, mockUser),
      ).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se EXIT sem saldo suficiente', async () => {
      enqueue(mockWarehouse)      // warehouse
      enqueue(mockProduct)        // product
      enqueue({ quantity: '5.000' }) // inventory — apenas 5
      await expect(
        service.create({ warehouseId, productId, type: 'EXIT', quantity: 10 }, mockUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('retorna 400 se TRANSFER sem toWarehouseId', async () => {
      enqueue(mockWarehouse) // warehouse
      await expect(
        service.create({ warehouseId, productId, type: 'TRANSFER', quantity: 10 }, mockUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('cria movimentação ENTRY com sucesso', async () => {
      enqueue(mockWarehouse) // warehouse
      enqueue(mockProduct)   // product
      enqueue({ id: 'mov-1', type: 'ENTRY' }) // insert returning
      const result = await service.create(
        { warehouseId, productId, type: 'ENTRY', quantity: 50 }, mockUser,
      )
      expect(result).toMatchObject({ type: 'ENTRY' })
    })
  })
})
```

---

### 9. `receipts.controller.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import { ReceiptsController } from './receipts.controller'
import { ReceiptsService } from './receipts.service'
import { StockMovementsService } from './stock-movements.service'
import { AuthGuard } from '../../common/guards/auth.guard'

describe('ReceiptsController', () => {
  let controller: ReceiptsController
  const mockUser    = { id: 'u1', role: 'ALMOXARIFE', companyId: 'c1' } as any
  const mockReceipt = { id: 'r1', status: 'COMPLETE' }

  const mockReceiptsService = {
    findAll: vi.fn().mockResolvedValue([mockReceipt]),
    findOne: vi.fn().mockResolvedValue({ ...mockReceipt, items: [] }),
    create:  vi.fn().mockResolvedValue(mockReceipt),
  }
  const mockMovementsService = {
    findAll: vi.fn().mockResolvedValue([]),
    create:  vi.fn().mockResolvedValue({ id: 'm1', type: 'ENTRY' }),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReceiptsController],
      providers: [
        { provide: ReceiptsService,      useValue: mockReceiptsService },
        { provide: StockMovementsService, useValue: mockMovementsService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(ReceiptsController)
  })

  it('GET /receipts — lista', async () => expect(await controller.findAll(mockUser)).toEqual([mockReceipt]))
  it('POST /receipts — cria recebimento', async () => {
    const dto = { purchaseOrderId: 'po-1', warehouseId: 'w-1', receivedAt: new Date().toISOString(), items: [] }
    expect(await controller.create(dto as any, mockUser)).toMatchObject({ id: 'r1' })
  })
  it('GET /receipts/:id — detalhe', async () => expect(await controller.findOne('r1', mockUser)).toMatchObject({ items: [] }))
  it('GET /stock-movements — lista', async () => expect(await controller.findMovements(mockUser)).toEqual([]))
  it('POST /stock-movements — cria', async () => {
    const dto = { warehouseId: 'w1', productId: 'p1', type: 'ENTRY' as const, quantity: 10 }
    expect(await controller.createMovement(dto, mockUser)).toMatchObject({ type: 'ENTRY' })
  })
})
```

---

### 10. Modificar `app.module.ts`

```typescript
import { ReceiptsModule } from './modules/receipts/receipts.module'
// No array @Module({ imports: [...] }):
ReceiptsModule,
```

---

## Checklist de Verificação

```bash
# Migration
# drizzle-kit check após criar 0004_receipts_inventory_constraint.sql

# Testes
pnpm vitest run   # espera ≥ 185 testes (157 anteriores + ~28 novos)

# TypeScript
pnpm type-check

# Lint
pnpm --filter api lint

# Segurança (manual)
# [ ] CASL verifica antes de cada operação
# [ ] Queries escopadas a companyId em todas as tabelas
# [ ] 400 se PO não está SENT
# [ ] 400 se quantidade excede saldo pendente
# [ ] 400 se item não pertence ao PO
# [ ] 400 EXIT/TRANSFER com saldo insuficiente
# [ ] PO marcado como RECEIVED apenas quando todos os itens são totalmente recebidos
# [ ] Upsert de inventory atômico (dentro da transação)
# [ ] Audit log em create (receipt e stock movement)
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| `purchaseOrdersService.receive()` fora da transação principal | Evita transação aninhada complexa; `receive()` é idempotente (retorna 400 se PO já `RECEIVED`) — falha isolada não deixa dados inconsistentes |
| Constraint UNIQUE em `inventory` via migration manual | O schema da 0.3 omitiu a constraint necessária para o `ON CONFLICT`; migration cirúrgica (só `ALTER TABLE ADD CONSTRAINT`) sem recriar a tabela |
| `StockMovementsService` no mesmo módulo de receipts | Movimentações manuais e automáticas compartilham a mesma lógica de inventory upsert; manter no mesmo módulo evita dependência circular |
| Upsert de inventory via `sql\`\`` raw | Drizzle ORM não tem helper de `ON CONFLICT … DO UPDATE` para `execute`; usar `sql\`\`` raw com `gen_random_uuid()` e o conflict target explícito é mais legível que montar a query via builder |
| `referenceType='receipt'` nas movimentações automáticas | Permite filtrar movimentações por origem (recebimento vs. manual vs. transferência) sem FK polimórfica |
