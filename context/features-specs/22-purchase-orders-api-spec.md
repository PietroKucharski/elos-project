# Feature Spec — 4.2 Purchase Orders API (NestJS)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 4 — Pedidos de Compra  
**Unidade:** 4.2  
**Pré-requisito:** 4.1 concluído (schemas `CreatePurchaseOrderDto`, `PurchaseOrderResponse`, etc.)  
**Commit convencional esperado:** `feat(api): add purchase-orders module with generate-from-bid and status transitions`

---

## Objetivo

Criar o módulo NestJS `PurchaseOrdersModule` com rotas de gestão de pedidos de
compra: geração de PO a partir de lance vencedor, listagem, detalhe, atualização
de notas e transições de status (aprovar, enviar, cancelar). Audit log em todas as
mutações. O módulo é exportado para uso futuro pelo `ReceiptsModule` (Fase 5),
que irá marcar o PO como `RECEIVED` via método interno.

---

## Decisões de Negócio

| Regra | Comportamento |
| ----- | ------------- |
| Numeração do PO | `PO-{ano}-{sequencial 4 dígitos por empresa}` ex: `PO-2024-0001`. Gerado no `create`, mesmo mecanismo do `COT-` das cotações |
| Geração a partir de lance | `bidId` deve referenciar um lance com status `SELECTED`; a cotação correspondente deve estar `CLOSED` |
| Lance já com PO | Se o `bidId` já gerou um PO, retorna 409 (`bid_id` é `UNIQUE` em `purchase_orders`) |
| Itens com produto obrigatório | Todos os `quotation_items` do lance devem ter `product_id NOT NULL`. Se algum item não tiver produto, retorna 400 com mensagem descritiva |
| Itens do PO | Copiados do lance: `productId` e `quantity` de `quotation_items`; `unitPrice` de `bid_items`; `totalPrice = quantity × unitPrice` |
| `totalAmount` do PO | `SUM(total_price)` de todos os itens, calculado no insert |
| Edição | Apenas `notes` é editável em status `DRAFT` |
| Aprovar (`approve`) | `DRAFT → APPROVED`; registra `approvedById` e `approvedAt` |
| Enviar (`send`) | `APPROVED → SENT`; registra `sentAt` |
| Cancelar (`cancel`) | `DRAFT` ou `APPROVED → CANCELLED`; PO `SENT` ou `RECEIVED` não pode ser cancelado |
| Receber (`receive`) | `SENT → RECEIVED`; exposto na API mas projetado para ser chamado pelo `ReceiptsModule` (Fase 5) quando o recebimento estiver completo |
| Exclusão | Não existe — apenas cancelamento |

---

## Escopo

### In

- `apps/api/src/modules/purchase-orders/purchase-orders.module.ts`
- `apps/api/src/modules/purchase-orders/purchase-orders.controller.ts`
- `apps/api/src/modules/purchase-orders/purchase-orders.controller.spec.ts`
- `apps/api/src/modules/purchase-orders/purchase-orders.service.ts`
- `apps/api/src/modules/purchase-orders/purchase-orders.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `PurchaseOrder`
- Modificação em `apps/api/src/app.module.ts` — importar `PurchaseOrdersModule`

### Out (não implementar nesta unidade)

- Recebimento de mercadoria (`ReceiptsModule`) (→ Fase 5)
- Gestão de armazéns e estoque (→ Fase 5)
- Upload de nota fiscal (`InvoicesModule`) (→ Fase 6)
- Registro de pagamento (`PaymentsModule`) (→ Fase 6)
- UI de pedidos de compra (→ 4.3)

---

## Rotas

| Método | Caminho | Papel mínimo | Descrição |
| ------ | ------- | ------------ | --------- |
| GET | `/v1/companies/:cnpj/purchase-orders` | Autenticado | Lista POs com filtros |
| POST | `/v1/companies/:cnpj/purchase-orders` | `COMPRADOR` | Gera PO a partir de lance vencedor |
| GET | `/v1/companies/:cnpj/purchase-orders/:id` | Autenticado | Detalhe do PO com itens |
| PATCH | `/v1/companies/:cnpj/purchase-orders/:id` | `COMPRADOR` | Atualiza notes (apenas DRAFT) |
| POST | `/v1/companies/:cnpj/purchase-orders/:id/approve` | `COMPRADOR` | DRAFT → APPROVED |
| POST | `/v1/companies/:cnpj/purchase-orders/:id/send` | `COMPRADOR` | APPROVED → SENT |
| POST | `/v1/companies/:cnpj/purchase-orders/:id/cancel` | `COMPRADOR` | DRAFT/APPROVED → CANCELLED |
| POST | `/v1/companies/:cnpj/purchase-orders/:id/receive` | `ALMOXARIFE` | SENT → RECEIVED (usado pela Fase 5) |

> **Query params em GET /purchase-orders:** `status` (DRAFT|APPROVED|SENT|RECEIVED|CANCELLED),
> `search` (substring do número ou nome do fornecedor — usa `ilike`),
> `supplierId` (uuid — filtra por fornecedor), `page` (default 1), `limit` (default 20, max 100).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    purchase-orders/
      purchase-orders.module.ts           ← criar
      purchase-orders.controller.ts       ← criar
      purchase-orders.controller.spec.ts  ← criar
      purchase-orders.service.ts          ← criar
      purchase-orders.service.spec.ts     ← criar
  common/
    ability/
      ability.factory.ts                  ← modificar (regras PurchaseOrder)
  app.module.ts                           ← modificar (importar PurchaseOrdersModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `PurchaseOrder`

```typescript
// — dentro do switch(user.role) —
// Adicionar ao union Subjects:
//   'PurchaseOrder' | (PurchaseOrder & ForcedSubject<'PurchaseOrder'>)
// (seguindo padrão de Quotation em 3.2 e Bid em 3.3)

case 'SUPER_ADMIN':
  can('manage', 'all')
  break

case 'ADMIN_EMPRESA':
  // regras já existentes ...
  can('manage', 'PurchaseOrder', { companyId })
  break

case 'COMPRADOR':
  // regras já existentes ...
  can('manage', 'PurchaseOrder', { companyId })
  break

case 'ALMOXARIFE':
  // regras já existentes (read Quotation, Bid, etc.) ...
  can('read',    'PurchaseOrder', { companyId })
  can('receive', 'PurchaseOrder', { companyId })  // transição SENT→RECEIVED
  break

case 'ANALISTA_FINANCEIRO':
  // regras já existentes ...
  can('read', 'PurchaseOrder', { companyId })
  break

case 'TRANSPORTADOR':
  // regras já existentes ...
  can('read', 'PurchaseOrder', { companyId })
  break
```

> `'receive'` é uma action customizada (além de create/read/update/delete) —
> seguindo o precedente da action `'select'` adicionada em 3.3. Adicionar
> `'receive'` ao union `Actions` no tipo `AppAbility`.

---

### 2. `purchase-orders.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, ilike, or, sql, SQL } from 'drizzle-orm'
import { subject } from '@casl/ability'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { auditLogs } from '../../db/schema/audit-logs'
import { suppliers } from '../../db/schema/suppliers'
import { products } from '../../db/schema/products'
import { quotations, quotationItems, bids, bidItems } from '../../db/schema/quotations'
import { purchaseOrders, purchaseOrderItems } from '../../db/schema/purchase-orders'
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from '@elos/shared'

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

    const page = Math.max(1, Number(query.page ?? 1))
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)))
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
        id:              purchaseOrders.id,
        companyId:       purchaseOrders.companyId,
        supplierId:      purchaseOrders.supplierId,
        supplierName:    suppliers.name,
        quotationId:     purchaseOrders.quotationId,
        bidId:           purchaseOrders.bidId,
        number:          purchaseOrders.number,
        status:          purchaseOrders.status,
        totalAmount:     purchaseOrders.totalAmount,
        notes:           purchaseOrders.notes,
        approvedById:    purchaseOrders.approvedById,
        approvedAt:      purchaseOrders.approvedAt,
        sentAt:          purchaseOrders.sentAt,
        createdById:     purchaseOrders.createdById,
        createdAt:       purchaseOrders.createdAt,
        updatedAt:       purchaseOrders.updatedAt,
        itemCount:       itemCountSq.itemCount,
        // quotationNumber via subquery ou join
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
        id:              purchaseOrders.id,
        companyId:       purchaseOrders.companyId,
        supplierId:      purchaseOrders.supplierId,
        supplierName:    suppliers.name,
        quotationId:     purchaseOrders.quotationId,
        quotationNumber: quotations.number,
        bidId:           purchaseOrders.bidId,
        number:          purchaseOrders.number,
        status:          purchaseOrders.status,
        totalAmount:     purchaseOrders.totalAmount,
        notes:           purchaseOrders.notes,
        approvedById:    purchaseOrders.approvedById,
        approvedAt:      purchaseOrders.approvedAt,
        sentAt:          purchaseOrders.sentAt,
        createdById:     purchaseOrders.createdById,
        createdAt:       purchaseOrders.createdAt,
        updatedAt:       purchaseOrders.updatedAt,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .leftJoin(quotations, eq(quotations.id, purchaseOrders.quotationId))
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!po) throw new NotFoundException('Pedido de compra não encontrado.')

    // Itens do PO com dados do produto
    const items = await this.db
      .select({
        id:               purchaseOrderItems.id,
        purchaseOrderId:  purchaseOrderItems.purchaseOrderId,
        productId:        purchaseOrderItems.productId,
        productName:      products.name,
        productCode:      products.code,
        unit:             products.unit,
        quantity:         purchaseOrderItems.quantity,
        unitPrice:        purchaseOrderItems.unitPrice,
        totalPrice:       purchaseOrderItems.totalPrice,
        receivedQuantity: purchaseOrderItems.receivedQuantity,
        createdAt:        purchaseOrderItems.createdAt,
        updatedAt:        purchaseOrderItems.updatedAt,
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
        id:          bids.id,
        status:      bids.status,
        supplierId:  bids.supplierId,
        quotationId: bids.quotationId,
        companyId:   bids.companyId,
      })
      .from(bids)
      .where(
        and(
          eq(bids.id, dto.bidId),
          eq(bids.companyId, user.companyId!),
        ),
      )
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
      .where(eq(purchaseOrders.bidId, dto.bidId))
      .limit(1)

    if (existingPO) {
      throw new ConflictException(
        'Já existe um pedido de compra gerado para este lance.',
      )
    }

    // 3. Carregar itens do lance com dados da cotação e produto
    const items = await this.db
      .select({
        quotationItemId: bidItems.quotationItemId,
        unitPrice:       bidItems.unitPrice,        // preço ofertado no lance
        quantity:        quotationItems.quantity,   // quantidade solicitada na cotação
        productId:       quotationItems.productId,  // pode ser null (validar abaixo)
        description:     quotationItems.description,
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
        `Todos os itens da cotação devem ter um produto vinculado para gerar um ` +
        `pedido de compra. ${itemsSemProduto.length} item(s) sem produto encontrado(s).`,
      )
    }

    // 5. Calcular total
    const totalAmount = items.reduce((acc, item) => {
      const qty = Number(item.quantity)
      const price = Number(item.unitPrice)
      return acc + qty * price
    }, 0)

    // 6. Gerar número sequencial PO-{ano}-{4 dígitos}
    const year = new Date().getFullYear()
    const prefix = `PO-${year}-`

    const [lastPO] = await this.db
      .select({ number: purchaseOrders.number })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.companyId, user.companyId!),
          sql`${purchaseOrders.number} LIKE ${prefix + '%'}`,
        ),
      )
      .orderBy(desc(purchaseOrders.number))
      .limit(1)

    let sequence = 1
    if (lastPO) {
      const lastSeq = parseInt(lastPO.number.slice(prefix.length), 10)
      sequence = (isNaN(lastSeq) ? 0 : lastSeq) + 1
    }
    const number = `${prefix}${String(sequence).padStart(4, '0')}`

    // 7. Criar PO + itens + audit log em transação
    return this.db.transaction(async (tx) => {
      const [po] = await tx
        .insert(purchaseOrders)
        .values({
          companyId:   user.companyId!,
          supplierId:  bid.supplierId,
          quotationId: bid.quotationId,
          bidId:       dto.bidId,
          number,
          status:      'DRAFT',
          totalAmount: String(totalAmount.toFixed(2)),
          notes:       dto.notes ?? null,
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
            productId:       item.productId!,
            quantity:        String(item.quantity),
            unitPrice:       String(item.unitPrice),
            totalPrice:      String(total.toFixed(2)),
            receivedQuantity: '0',
          }
        }),
      )

      await tx.insert(auditLogs).values({
        entity:    'PurchaseOrder',
        entityId:  po.id,
        action:    'CREATE',
        after:     { number: po.number, bidId: dto.bidId, status: 'DRAFT' },
        userId:    user.id,
        companyId: user.companyId,
      })

      return po
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePurchaseOrderDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Pedido de compra não encontrado.')
    if (ability.cannot('update', subject('PurchaseOrder', existing))) {
      throw new ForbiddenException('Sem permissão para editar este pedido de compra.')
    }
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas pedidos em rascunho (DRAFT) podem ser editados.',
      )
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(purchaseOrders)
        .set({ notes: dto.notes ?? null, updatedAt: new Date() })
        .where(
          and(
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.companyId, user.companyId!),
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Pedido de compra não encontrado.')

      await tx.insert(auditLogs).values({
        entity:    'PurchaseOrder',
        entityId:  id,
        action:    'UPDATE',
        before:    { notes: existing.notes },
        after:     { notes: dto.notes },
        userId:    user.id,
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
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
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
          status:      'APPROVED',
          approvedById: user.id,
          approvedAt:  now,
          updatedAt:   now,
        })
        .where(
          and(
            eq(purchaseOrders.id, id),
            eq(purchaseOrders.companyId, user.companyId!),
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Pedido de compra não encontrado.')

      await tx.insert(auditLogs).values({
        entity:    'PurchaseOrder',
        entityId:  id,
        action:    'APPROVE',
        before:    { status: 'DRAFT' },
        after:     { status: 'APPROVED', approvedById: user.id },
        userId:    user.id,
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
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
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
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Pedido de compra não encontrado.')

      await tx.insert(auditLogs).values({
        entity:    'PurchaseOrder',
        entityId:  id,
        action:    'SEND',
        before:    { status: 'APPROVED' },
        after:     { status: 'SENT' },
        userId:    user.id,
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
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
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
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Pedido de compra não encontrado.')

      await tx.insert(auditLogs).values({
        entity:    'PurchaseOrder',
        entityId:  id,
        action:    'CANCEL',
        before:    { status: existing.status },
        after:     { status: 'CANCELLED' },
        userId:    user.id,
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
      .where(
        and(
          eq(purchaseOrders.id, id),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
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
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Pedido de compra não encontrado.')

      await tx.insert(auditLogs).values({
        entity:    'PurchaseOrder',
        entityId:  id,
        action:    'RECEIVE',
        before:    { status: 'SENT' },
        after:     { status: 'RECEIVED' },
        userId:    user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }
}
```

---

### 3. `purchase-orders.controller.ts`

```typescript
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  type CreatePurchaseOrderDto,
  type UpdatePurchaseOrderDto,
} from '@elos/shared'
import { PurchaseOrdersService } from './purchase-orders.service'

@ApiTags('purchase-orders')
@ApiCookieAuth()
@Controller('companies/:cnpj/purchase-orders')
@UseGuards(AuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos de compra' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos de compra.' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('supplierId') supplierId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.findAll(user, {
      status,
      search,
      supplierId,
      page,
      limit,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gerar pedido de compra a partir de lance vencedor' })
  @ApiResponse({ status: 201, description: 'Pedido de compra gerado.' })
  @ApiResponse({ status: 400, description: 'Lance inválido ou itens sem produto.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Lance não encontrado.' })
  @ApiResponse({ status: 409, description: 'Já existe PO para este lance.' })
  create(
    @Body(new ZodValidationPipe(createPurchaseOrderSchema)) body: CreatePurchaseOrderDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.purchaseOrdersService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do pedido de compra com itens' })
  @ApiResponse({ status: 200, description: 'Pedido de compra com itens.' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado.' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar notas do pedido (apenas DRAFT)' })
  @ApiResponse({ status: 200, description: 'Pedido atualizado.' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePurchaseOrderSchema)) body: UpdatePurchaseOrderDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.purchaseOrdersService.update(id, body, user)
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprovar pedido (DRAFT → APPROVED)' })
  @ApiResponse({ status: 200, description: 'Pedido aprovado.' })
  approve(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.approve(id, user)
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar pedido ao fornecedor (APPROVED → SENT)' })
  @ApiResponse({ status: 200, description: 'Pedido enviado.' })
  send(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.send(id, user)
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pedido (DRAFT/APPROVED → CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Pedido cancelado.' })
  cancel(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.cancel(id, user)
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar pedido como recebido (SENT → RECEIVED)' })
  @ApiResponse({ status: 200, description: 'Pedido marcado como recebido.' })
  receive(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.receive(id, user)
  }
}
```

---

### 4. `purchase-orders.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { PurchaseOrdersController } from './purchase-orders.controller'
import { PurchaseOrdersService } from './purchase-orders.service'

@Module({
  imports: [AbilityModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],  // exportado para uso pelo ReceiptsModule (Fase 5)
})
export class PurchaseOrdersModule {}
```

---

### 5. `purchase-orders.service.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PurchaseOrdersService } from './purchase-orders.service'
import { DRIZZLE } from '../../db.module'
import { AbilityFactory } from '../../common/ability/ability.factory'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const companyId = '00000000-0000-0000-0000-000000000001'
const supplierId = '00000000-0000-0000-0000-000000000002'
const quotationId = '00000000-0000-0000-0000-000000000003'
const bidId = '00000000-0000-0000-0000-000000000004'
const poId = '00000000-0000-0000-0000-000000000005'
const productId = '00000000-0000-0000-0000-000000000006'
const userId = 'user-001'

const mockBid = {
  id: bidId,
  status: 'SELECTED',
  supplierId,
  quotationId,
  companyId,
}

const mockBidItem = {
  quotationItemId: '00000000-0000-0000-0000-000000000007',
  unitPrice: '100.00',
  quantity: '5.000',
  productId,
  description: 'Produto teste',
}

const mockPO = {
  id: poId,
  companyId,
  supplierId,
  quotationId,
  bidId,
  number: 'PO-2024-0001',
  status: 'DRAFT',
  totalAmount: '500.00',
  notes: null,
  approvedById: null,
  approvedAt: null,
  sentAt: null,
  createdById: userId,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUser = { id: userId, email: 'test@test.com', name: 'Test', role: 'COMPRADOR', companyId } as any

// ─── Mock do Drizzle ─────────────────────────────────────────────────────────

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])
  const enqueueMany = (results: unknown[]) => resultsQueue.push(results)

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
    groupBy:   vi.fn().mockReturnThis(),
    as:        vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select:      (...args: unknown[]) => { qb.select = vi.fn().mockReturnThis(); return qb },
    insert:      (...args: unknown[]) => { qb.insert = vi.fn().mockReturnThis(); return qb },
    update:      (...args: unknown[]) => { qb.update = vi.fn().mockReturnThis(); return qb },
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }

  return { mockDb, enqueue, enqueueMany }
}

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('PurchaseOrdersService', () => {
  let service: PurchaseOrdersService
  let mockDb: ReturnType<typeof makeDb>['mockDb']
  let enqueue: ReturnType<typeof makeDb>['enqueue']

  const mockAbility = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    mockDb = db
    enqueue = eq

    const module = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()

    service = module.get(PurchaseOrdersService)
    mockAbility.cannot.mockReturnValue(false)
  })

  // ─── findAll ────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna lista de POs', async () => {
      enqueue(mockPO)  // rows retornadas
      const result = await service.findAll(mockUser, {})
      expect(result).toBeDefined()
    })

    it('retorna 403 se sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.findAll(mockUser, {})).rejects.toThrow(ForbiddenException)
    })
  })

  // ─── findOne ────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna PO com itens', async () => {
      enqueue(mockPO)           // PO encontrado
      enqueue({ ...mockBidItem, productName: 'Prod', productCode: null, unit: 'UN' })  // item
      const result = await service.findOne(poId, mockUser)
      expect(result).toBeDefined()
    })

    it('retorna 404 se PO não encontrado', async () => {
      enqueue(undefined)  // nenhum PO
      await expect(service.findOne('nonexistent', mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  // ─── create ─────────────────────────────────────────────────────────────

  describe('create', () => {
    it('cria PO a partir de lance SELECTED', async () => {
      enqueue(mockBid)              // bid encontrado
      enqueue(undefined)            // sem PO existente
      enqueue(mockBidItem)          // bid items
      enqueue(undefined)            // lastPO (nenhum anterior)
      enqueue(mockPO)               // insert returning

      const result = await service.create({ bidId, notes: undefined }, mockUser)
      expect(result).toMatchObject({ status: 'DRAFT' })
    })

    it('retorna 403 se sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se lance não encontrado', async () => {
      enqueue(undefined)  // bid não encontrado
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se lance não é SELECTED', async () => {
      enqueue({ ...mockBid, status: 'SUBMITTED' })
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 409 se já existe PO para o lance', async () => {
      enqueue(mockBid)      // bid SELECTED
      enqueue(mockPO)       // PO já existente
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(ConflictException)
    })

    it('retorna 400 se item não tem produto vinculado', async () => {
      enqueue(mockBid)                               // bid SELECTED
      enqueue(undefined)                             // sem PO existente
      enqueue({ ...mockBidItem, productId: null })   // item sem produto
      await expect(service.create({ bidId }, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  // ─── approve ────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('aprova PO em DRAFT', async () => {
      enqueue(mockPO)                    // PO DRAFT
      enqueue({ ...mockPO, status: 'APPROVED' })  // update returning

      const result = await service.approve(poId, mockUser)
      expect(result.status).toBe('APPROVED')
    })

    it('retorna 404 se PO não encontrado', async () => {
      enqueue(undefined)
      await expect(service.approve('nonexistent', mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 400 se PO não está em DRAFT', async () => {
      enqueue({ ...mockPO, status: 'SENT' })
      await expect(service.approve(poId, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 403 se sem permissão', async () => {
      enqueue(mockPO)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.approve(poId, mockUser)).rejects.toThrow(ForbiddenException)
    })
  })

  // ─── send ───────────────────────────────────────────────────────────────

  describe('send', () => {
    it('envia PO aprovado', async () => {
      enqueue({ ...mockPO, status: 'APPROVED' })
      enqueue({ ...mockPO, status: 'SENT' })

      const result = await service.send(poId, mockUser)
      expect(result.status).toBe('SENT')
    })

    it('retorna 400 se PO não está em APPROVED', async () => {
      enqueue(mockPO)  // DRAFT
      await expect(service.send(poId, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  // ─── cancel ─────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('cancela PO em DRAFT', async () => {
      enqueue(mockPO)
      enqueue({ ...mockPO, status: 'CANCELLED' })

      const result = await service.cancel(poId, mockUser)
      expect(result.status).toBe('CANCELLED')
    })

    it('cancela PO em APPROVED', async () => {
      enqueue({ ...mockPO, status: 'APPROVED' })
      enqueue({ ...mockPO, status: 'CANCELLED' })

      const result = await service.cancel(poId, mockUser)
      expect(result.status).toBe('CANCELLED')
    })

    it('retorna 400 se PO está em SENT', async () => {
      enqueue({ ...mockPO, status: 'SENT' })
      await expect(service.cancel(poId, mockUser)).rejects.toThrow(BadRequestException)
    })
  })

  // ─── receive ────────────────────────────────────────────────────────────

  describe('receive', () => {
    it('marca PO como RECEIVED', async () => {
      const almoxUser = { ...mockUser, role: 'ALMOXARIFE' }
      enqueue({ ...mockPO, status: 'SENT' })
      enqueue({ ...mockPO, status: 'RECEIVED' })

      const result = await service.receive(poId, almoxUser)
      expect(result.status).toBe('RECEIVED')
    })

    it('retorna 400 se PO não está em SENT', async () => {
      enqueue(mockPO)  // DRAFT
      await expect(service.receive(poId, mockUser)).rejects.toThrow(BadRequestException)
    })
  })
})
```

---

### 6. `purchase-orders.controller.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import { PurchaseOrdersController } from './purchase-orders.controller'
import { PurchaseOrdersService } from './purchase-orders.service'
import { AuthGuard } from '../../common/guards/auth.guard'

describe('PurchaseOrdersController', () => {
  let controller: PurchaseOrdersController
  const mockUser = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as any
  const mockPO = { id: 'po1', status: 'DRAFT', number: 'PO-2024-0001' } as any

  const mockService = {
    findAll:  vi.fn().mockResolvedValue([mockPO]),
    findOne:  vi.fn().mockResolvedValue({ ...mockPO, items: [] }),
    create:   vi.fn().mockResolvedValue(mockPO),
    update:   vi.fn().mockResolvedValue(mockPO),
    approve:  vi.fn().mockResolvedValue({ ...mockPO, status: 'APPROVED' }),
    send:     vi.fn().mockResolvedValue({ ...mockPO, status: 'SENT' }),
    cancel:   vi.fn().mockResolvedValue({ ...mockPO, status: 'CANCELLED' }),
    receive:  vi.fn().mockResolvedValue({ ...mockPO, status: 'RECEIVED' }),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PurchaseOrdersController],
      providers: [{ provide: PurchaseOrdersService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(PurchaseOrdersController)
  })

  it('GET / — lista POs', async () => {
    const result = await controller.findAll(mockUser)
    expect(result).toEqual([mockPO])
  })

  it('POST / — cria PO', async () => {
    const result = await controller.create({ bidId: 'bid-uuid' }, mockUser)
    expect(result).toMatchObject({ status: 'DRAFT' })
  })

  it('GET /:id — detalhe', async () => {
    const result = await controller.findOne('po1', mockUser)
    expect(result).toMatchObject({ items: [] })
  })

  it('POST /:id/approve — aprova', async () => {
    const result = await controller.approve('po1', mockUser)
    expect(result.status).toBe('APPROVED')
  })

  it('POST /:id/send — envia', async () => {
    const result = await controller.send('po1', mockUser)
    expect(result.status).toBe('SENT')
  })

  it('POST /:id/cancel — cancela', async () => {
    const result = await controller.cancel('po1', mockUser)
    expect(result.status).toBe('CANCELLED')
  })

  it('POST /:id/receive — recebe', async () => {
    const result = await controller.receive('po1', mockUser)
    expect(result.status).toBe('RECEIVED')
  })
})
```

---

### 7. Modificar `app.module.ts`

```typescript
// Adicionar ao imports:
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module'

// No array @Module({ imports: [...] }):
PurchaseOrdersModule,
```

---

## Checklist de Verificação

```bash
# Testes
pnpm vitest run   # espera ≥ 130 testes passando (115 anteriores + ~15 novos)

# TypeScript
pnpm type-check   # 3 workspaces verdes

# Lint
pnpm --filter api lint   # sem erros

# Segurança (manual)
# [ ] CASL verifica antes de cada mutação (create/update/approve/send/cancel/receive)
# [ ] Queries incluem eq(purchaseOrders.companyId, user.companyId!) — isolamento de tenant
# [ ] Audit log em create/update/approve/send/cancel/receive
# [ ] 409 ao tentar criar PO duplicado (bidId UNIQUE)
# [ ] 400 ao tentar gerar PO de lance não-SELECTED
# [ ] 400 ao tentar gerar PO com itens sem produto
# [ ] 400 em transições inválidas de status
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| `receive` incluso no módulo Phase 4 | O status `RECEIVED` já existe no schema e o endpoint precisa existir para a Fase 5 usar via importação do `PurchaseOrdersService`. Evita adicionar dependência circular futura. |
| `PurchaseOrdersModule` exporta `PurchaseOrdersService` | O `ReceiptsModule` (Fase 5) precisará chamar `purchaseOrdersService.receive()` internamente após confirmar recebimento completo. |
| Action `'receive'` no CASL em vez de `'update'` | Separa semanticamente a transição SENT→RECEIVED (responsabilidade do ALMOXARIFE) das demais transições (COMPRADOR). Evita que ALMOXARIFE possa aprovar ou enviar o PO. |
| `totalAmount` calculado no Service, não no banco | Mantém a lógica no Service (padrão do projeto — sem triggers). Recalculado no `create` via `SUM` in-memory dos itens copiados do lance. |
| Numeração `PO-{ano}-{4 dígitos}` via query do último número | Mesmo padrão do `COT-` das cotações (3.2). Sem `SEQUENCE` PostgreSQL para manter a lógica no Service. Race condition improvável em v1; se necessário, adicionar UNIQUE no banco e retry. |
| Bid items importados de `db/schema/quotations` | `bid_items` e `bids` foram definidos em `quotations.ts` na 0.3 (padrão documentado em 3.2/3.3). Não há `db/schema/bids.ts`. |
