# Feature Spec — 3.3 Bids API (NestJS)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 3 — Cotações e Lances  
**Unidade:** 3.3  
**Pré-requisito:** 3.2 concluído (`QuotationsModule` exportado, schema da cotação disponível)  
**Commit convencional esperado:** `feat(api): add bids module with crud, comparison and winner selection`

---

## Objetivo

Criar o módulo NestJS `BidsModule` com rotas para gestão de lances: CRUD de lances
e itens de lance, endpoint de comparativo, e seleção de vencedor. Lances são criados
pelo COMPRADOR em nome de fornecedores (sem portal de fornecedor na v1). A seleção
de vencedor fecha o ciclo da cotação e prepara o dado para geração do Pedido de
Compra (Fase 4).

---

## Decisões de Negócio

| Regra                                           | Comportamento                                                              |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| Quem pode criar lances                          | COMPRADOR ou ADMIN_EMPRESA, em nome de um supplier convidado               |
| Cotação para aceitar lances                     | Deve estar com status OPEN                                                 |
| Fornecedor do lance                             | Deve estar na lista `quotation_suppliers` da cotação                       |
| Lance duplicado                                 | Um fornecedor pode ter apenas um lance por cotação (409 se duplicado)      |
| Edição de lance                                 | Apenas quando status = DRAFT (antes de submeter)                           |
| Submit do lance (`submit`)                      | DRAFT → SUBMITTED; requer ao menos 1 item de lance                        |
| Itens de lance                                  | Mapeados 1:1 com `quotation_items`; `quotationItemId` é unique por lance   |
| Seleção de vencedor (`select-winner`)           | Cotação deve estar CLOSED; marca bid como ACCEPTED, restantes REJECTED     |
| Após selecionar vencedor                        | Cotação permanece CLOSED (Pedido de Compra é gerado na Fase 4)            |
| Comparativo (`compare`)                         | Disponível para cotações OPEN, CLOSED; retorna matrix itens × fornecedores |

---

## Escopo

### In

- `apps/api/src/modules/bids/bids.module.ts`
- `apps/api/src/modules/bids/bids.controller.ts`
- `apps/api/src/modules/bids/bids.controller.spec.ts`
- `apps/api/src/modules/bids/bids.service.ts`
- `apps/api/src/modules/bids/bids.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `Bid`
- Modificação em `apps/api/src/app.module.ts` — importar `BidsModule`

### Out (não implementar nesta unidade)

- Geração automática de Pedido de Compra a partir do vencedor (→ Fase 4)
- Portal de submissão de lances pelo próprio fornecedor (fora do escopo v1)
- Notificação ao fornecedor sobre resultado (fora do escopo v1)
- UI de lances e comparativo (→ 3.5)

---

## Rotas

| Método | Caminho                                                             | Papel mínimo | Descrição                               |
| ------ | ------------------------------------------------------------------- | ------------ | --------------------------------------- |
| GET    | `/v1/companies/:cnpj/quotations/:quotationId/bids`                  | Autenticado  | Lista lances da cotação                 |
| POST   | `/v1/companies/:cnpj/quotations/:quotationId/bids`                  | `COMPRADOR`  | Cria lance em nome do fornecedor        |
| GET    | `/v1/companies/:cnpj/quotations/:quotationId/bids/compare`          | Autenticado  | Comparativo de lances (matrix)          |
| GET    | `/v1/companies/:cnpj/quotations/:quotationId/bids/:bidId`           | Autenticado  | Detalhe do lance com itens              |
| PATCH  | `/v1/companies/:cnpj/quotations/:quotationId/bids/:bidId`           | `COMPRADOR`  | Atualiza notas do lance (apenas DRAFT)  |
| DELETE | `/v1/companies/:cnpj/quotations/:quotationId/bids/:bidId`           | `COMPRADOR`  | Remove lance (apenas DRAFT)             |
| POST   | `/v1/companies/:cnpj/quotations/:quotationId/bids/:bidId/submit`    | `COMPRADOR`  | Submete lance (DRAFT → SUBMITTED)       |
| GET    | `/v1/companies/:cnpj/quotations/:quotationId/bids/:bidId/items`     | Autenticado  | Lista itens do lance                    |
| POST   | `/v1/companies/:cnpj/quotations/:quotationId/bids/:bidId/items`     | `COMPRADOR`  | Adiciona item ao lance (apenas DRAFT)   |
| PATCH  | `/v1/companies/:cnpj/quotations/:quotationId/bids/:bidId/items/:id` | `COMPRADOR`  | Atualiza item do lance (apenas DRAFT)   |
| DELETE | `/v1/companies/:cnpj/quotations/:quotationId/bids/:bidId/items/:id` | `COMPRADOR`  | Remove item do lance (apenas DRAFT)     |
| POST   | `/v1/companies/:cnpj/quotations/:quotationId/select-winner`         | `COMPRADOR`  | Seleciona lance vencedor (cotação CLOSED)|

> **Nota sobre `compare`:** a rota `/bids/compare` precisa ser registrada **antes**
> de `/bids/:bidId` no controller para que o NestJS não interprete a string literal
> `"compare"` como um UUID de `bidId`. Use `@Get('compare')` acima de `@Get(':bidId')`.

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    bids/
      bids.module.ts          ← criar
      bids.controller.ts      ← criar
      bids.controller.spec.ts ← criar
      bids.service.ts         ← criar
      bids.service.spec.ts    ← criar
  common/
    ability/
      ability.factory.ts      ← modificar (regras Bid)
  app.module.ts               ← modificar (importar BidsModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `Bid`

```typescript
// — dentro do switch(user.role) —

case 'ADMIN_EMPRESA':
  // já existentes
  can('read',   'Bid', { companyId })
  can('create', 'Bid', { companyId })
  can('update', 'Bid', { companyId })
  can('delete', 'Bid', { companyId })
  break

case 'COMPRADOR':
  can('read',   'Bid', { companyId })
  can('create', 'Bid', { companyId })
  can('update', 'Bid', { companyId })
  can('delete', 'Bid', { companyId })
  break

case 'ALMOXARIFE':
case 'ANALISTA_FINANCEIRO':
case 'TRANSPORTADOR':
  can('read', 'Bid', { companyId })
  break
```

> Adicionar `'Bid'` (string) e `Bid & ForcedSubject<'Bid'>` ao union `Subjects`,
> seguindo o padrão de `Quotation` (3.2).

---

### 2. `bids.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, eq, sql } from 'drizzle-orm'
import { subject } from '@casl/ability'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { bids, bidItems } from '../../db/schema/bids'
import { quotations, quotationItems, quotationSuppliers } from '../../db/schema/quotations'
import { suppliers } from '../../db/schema/suppliers'
import { auditLogs } from '../../db/schema/audit-logs'
import type {
  CreateBidDto,
  UpdateBidDto,
  CreateBidItemDto,
  UpdateBidItemDto,
  SelectWinnerDto,
} from '@elos/shared'

@Injectable()
export class BidsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertQuotationOpenAndBelongsToCompany(
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

    if (
      requiredStatus === 'OPEN_OR_CLOSED' &&
      !['OPEN', 'CLOSED'].includes(row.status)
    ) {
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

    await this.assertQuotationOpenAndBelongsToCompany(quotationId, user.companyId!)

    return this.db
      .select({
        id:           bids.id,
        quotationId:  bids.quotationId,
        supplierId:   bids.supplierId,
        supplierName: suppliers.name,
        companyId:    bids.companyId,
        status:       bids.status,
        notes:        bids.notes,
        submittedAt:  bids.submittedAt,
        createdAt:    bids.createdAt,
        updatedAt:    bids.updatedAt,
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

    await this.assertQuotationOpenAndBelongsToCompany(quotationId, user.companyId!)

    const [bid] = await this.db
      .select({
        id:           bids.id,
        quotationId:  bids.quotationId,
        supplierId:   bids.supplierId,
        supplierName: suppliers.name,
        companyId:    bids.companyId,
        status:       bids.status,
        notes:        bids.notes,
        submittedAt:  bids.submittedAt,
        createdAt:    bids.createdAt,
        updatedAt:    bids.updatedAt,
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

    // Buscar itens do lance com detalhes do item da cotação
    const items = await this.db
      .select({
        id:              bidItems.id,
        bidId:           bidItems.bidId,
        quotationItemId: bidItems.quotationItemId,
        description:     quotationItems.description,
        quantity:        quotationItems.quantity,
        unit:            quotationItems.unit,
        unitPrice:       bidItems.unitPrice,
        totalPrice: sql<string>`(${bidItems.unitPrice} * ${quotationItems.quantity})::text`,
        deliveryDays:    bidItems.deliveryDays,
        notes:           bidItems.notes,
        createdAt:       bidItems.createdAt,
        updatedAt:       bidItems.updatedAt,
      })
      .from(bidItems)
      .innerJoin(quotationItems, eq(bidItems.quotationItemId, quotationItems.id))
      .where(eq(bidItems.bidId, bidId))
      .orderBy(bidItems.createdAt)

    return { ...bid, items }
  }

  async create(quotationId: string, dto: CreateBidDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Bid')) {
      throw new ForbiddenException('Sem permissão para criar lance.')
    }

    await this.assertQuotationOpenAndBelongsToCompany(
      quotationId,
      user.companyId!,
      'OPEN',
    )

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
      throw new BadRequestException(
        'O fornecedor não está na lista de convidados desta cotação.',
      )
    }

    // Verificar lance duplicado
    const [existingBid] = await this.db
      .select({ id: bids.id })
      .from(bids)
      .where(
        and(
          eq(bids.quotationId, quotationId),
          eq(bids.supplierId, dto.supplierId),
        ),
      )
      .limit(1)

    if (existingBid) {
      throw new ConflictException(
        'Já existe um lance deste fornecedor para esta cotação.',
      )
    }

    const [created] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(bids)
        .values({
          quotationId,
          supplierId: dto.supplierId,
          companyId: user.companyId!,
          status: 'DRAFT',
          notes: dto.notes,
        })
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Bid',
        entityId: rows[0]!.id,
        action: 'CREATE',
        before: null,
        after: rows[0],
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!created) throw new BadRequestException('Falha ao criar lance.')
    return created
  }

  async update(
    quotationId: string,
    bidId: string,
    dto: UpdateBidDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)

    await this.assertQuotationOpenAndBelongsToCompany(quotationId, user.companyId!)

    const existing = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (ability.cannot('update', subject('Bid', existing))) {
      throw new ForbiddenException('Sem permissão para atualizar lance.')
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas lances com status DRAFT podem ser editados.',
      )
    }

    const [updated] = await this.db
      .update(bids)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(bids.id, bidId), eq(bids.quotationId, quotationId)))
      .returning()

    if (!updated) throw new NotFoundException('Lance não encontrado.')
    return updated
  }

  async remove(quotationId: string, bidId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    await this.assertQuotationOpenAndBelongsToCompany(quotationId, user.companyId!)

    const existing = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (ability.cannot('delete', subject('Bid', existing))) {
      throw new ForbiddenException('Sem permissão para remover lance.')
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas lances com status DRAFT podem ser removidos.',
      )
    }

    await this.db.delete(bids).where(eq(bids.id, bidId))
    return { success: true }
  }

  async submit(quotationId: string, bidId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    await this.assertQuotationOpenAndBelongsToCompany(
      quotationId,
      user.companyId!,
      'OPEN',
    )

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
    const [{ itemCount }] = await this.db
      .select({ itemCount: sql<number>`COUNT(*)` })
      .from(bidItems)
      .where(eq(bidItems.bidId, bidId))

    if (Number(itemCount) === 0) {
      throw new BadRequestException(
        'O lance precisa ter ao menos 1 item antes de ser submetido.',
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(bids)
        .set({ status: 'SUBMITTED', submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(bids.id, bidId))
        .returning()

      // Atualizar status do convite para RESPONDED
      await tx
        .update(quotationSuppliers)
        .set({ status: 'RESPONDED' })
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

  async findBidItems(quotationId: string, bidId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Bid')) {
      throw new ForbiddenException('Sem permissão.')
    }

    await this.assertQuotationOpenAndBelongsToCompany(quotationId, user.companyId!)
    await this.assertBidBelongsToQuotation(bidId, quotationId)

    return this.db
      .select({
        id:              bidItems.id,
        bidId:           bidItems.bidId,
        quotationItemId: bidItems.quotationItemId,
        description:     quotationItems.description,
        quantity:        quotationItems.quantity,
        unit:            quotationItems.unit,
        unitPrice:       bidItems.unitPrice,
        totalPrice: sql<string>`(${bidItems.unitPrice} * ${quotationItems.quantity})::text`,
        deliveryDays:    bidItems.deliveryDays,
        notes:           bidItems.notes,
        createdAt:       bidItems.createdAt,
        updatedAt:       bidItems.updatedAt,
      })
      .from(bidItems)
      .innerJoin(quotationItems, eq(bidItems.quotationItemId, quotationItems.id))
      .where(eq(bidItems.bidId, bidId))
      .orderBy(bidItems.createdAt)
  }

  async addBidItem(
    quotationId: string,
    bidId: string,
    dto: CreateBidItemDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Bid')) {
      throw new ForbiddenException('Sem permissão para adicionar item ao lance.')
    }

    await this.assertQuotationOpenAndBelongsToCompany(
      quotationId,
      user.companyId!,
      'OPEN',
    )
    const bid = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (bid.status !== 'DRAFT') {
      throw new BadRequestException(
        'Itens só podem ser adicionados a lances com status DRAFT.',
      )
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

    // Verificar item duplicado no lance
    const [existingItem] = await this.db
      .select({ id: bidItems.id })
      .from(bidItems)
      .where(
        and(
          eq(bidItems.bidId, bidId),
          eq(bidItems.quotationItemId, dto.quotationItemId),
        ),
      )
      .limit(1)

    if (existingItem) {
      throw new ConflictException('Este item da cotação já foi adicionado ao lance.')
    }

    const [item] = await this.db
      .insert(bidItems)
      .values({ ...dto, bidId })
      .returning()

    if (!item) throw new BadRequestException('Falha ao criar item do lance.')
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

    await this.assertQuotationOpenAndBelongsToCompany(quotationId, user.companyId!)
    const bid = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (bid.status !== 'DRAFT') {
      throw new BadRequestException(
        'Itens só podem ser editados em lances com status DRAFT.',
      )
    }

    const [updated] = await this.db
      .update(bidItems)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(bidItems.id, itemId), eq(bidItems.bidId, bidId)))
      .returning()

    if (!updated) throw new NotFoundException('Item do lance não encontrado.')
    return updated
  }

  async removeBidItem(
    quotationId: string,
    bidId: string,
    itemId: string,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Bid')) {
      throw new ForbiddenException('Sem permissão para remover item do lance.')
    }

    await this.assertQuotationOpenAndBelongsToCompany(quotationId, user.companyId!)
    const bid = await this.assertBidBelongsToQuotation(bidId, quotationId)

    if (bid.status !== 'DRAFT') {
      throw new BadRequestException(
        'Itens só podem ser removidos de lances com status DRAFT.',
      )
    }

    await this.db
      .delete(bidItems)
      .where(and(eq(bidItems.id, itemId), eq(bidItems.bidId, bidId)))

    return { success: true }
  }

  // ─── Comparison ────────────────────────────────────────────────────────────

  async compare(quotationId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Bid')) {
      throw new ForbiddenException('Sem permissão para visualizar comparativo.')
    }

    await this.assertQuotationOpenAndBelongsToCompany(
      quotationId,
      user.companyId!,
      'OPEN_OR_CLOSED',
    )

    // Buscar todos os itens da cotação
    const items = await this.db
      .select()
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, quotationId))
      .orderBy(quotationItems.createdAt)

    // Buscar todos os lances com nome do fornecedor
    const quotationBids = await this.db
      .select({
        id:           bids.id,
        supplierId:   bids.supplierId,
        supplierName: suppliers.name,
        status:       bids.status,
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

    // Buscar todos os bid_items de uma vez
    const allBidItems = await this.db
      .select({
        id:              bidItems.id,
        bidId:           bidItems.bidId,
        quotationItemId: bidItems.quotationItemId,
        unitPrice:       bidItems.unitPrice,
        totalPrice: sql<string>`(${bidItems.unitPrice} * ${quotationItems.quantity})::text`,
        deliveryDays:    bidItems.deliveryDays,
        notes:           bidItems.notes,
        status:          bids.status,
      })
      .from(bidItems)
      .innerJoin(bids, eq(bidItems.bidId, bids.id))
      .innerJoin(quotationItems, eq(bidItems.quotationItemId, quotationItems.id))
      .where(eq(bids.quotationId, quotationId))

    // Montar a matrix de comparação
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
          bidItemId:    bidItem?.id ?? null,
          unitPrice:    bidItem?.unitPrice ?? null,
          totalPrice:   bidItem?.totalPrice ?? null,
          deliveryDays: bidItem?.deliveryDays ?? null,
          notes:        bidItem?.notes ?? null,
          isWinner:     bid.status === 'ACCEPTED',
        }
      }

      return {
        quotationItemId: item.id,
        description:     item.description,
        quantity:        item.quantity,
        unit:            item.unit,
        bids:            cellsByBidId,
      }
    })

    return {
      quotationId,
      bids: quotationBids.map((b) => ({
        bidId:        b.id,
        supplierId:   b.supplierId,
        supplierName: b.supplierName,
        status:       b.status,
        totalPrice:   b.totalPrice,
      })),
      rows,
    }
  }

  // ─── Winner Selection ──────────────────────────────────────────────────────

  async selectWinner(
    quotationId: string,
    dto: SelectWinnerDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Bid')) {
      throw new ForbiddenException('Sem permissão para selecionar vencedor.')
    }

    await this.assertQuotationOpenAndBelongsToCompany(
      quotationId,
      user.companyId!,
      'CLOSED',
    )

    // Verificar que o lance pertence à cotação e está SUBMITTED
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

    // Verificar se já há um vencedor
    const [existingWinner] = await this.db
      .select({ id: bids.id })
      .from(bids)
      .where(
        and(eq(bids.quotationId, quotationId), eq(bids.status, 'ACCEPTED')),
      )
      .limit(1)

    if (existingWinner) {
      throw new ConflictException(
        'Esta cotação já possui um lance vencedor selecionado.',
      )
    }

    await this.db.transaction(async (tx) => {
      // Aceitar o lance vencedor
      await tx
        .update(bids)
        .set({ status: 'ACCEPTED', updatedAt: new Date() })
        .where(eq(bids.id, dto.bidId))

      // Rejeitar todos os outros lances SUBMITTED
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
        after: { status: 'ACCEPTED', notes: dto.notes },
        userId: user.id,
        companyId: user.companyId,
      })
    })

    return { success: true, winnerBidId: dto.bidId }
  }
}
```

---

### 3. `bids.controller.ts`

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  createBidSchema,
  updateBidSchema,
  createBidItemSchema,
  updateBidItemSchema,
  selectWinnerSchema,
} from '@elos/shared'
import type {
  CreateBidDto,
  UpdateBidDto,
  CreateBidItemDto,
  UpdateBidItemDto,
  SelectWinnerDto,
} from '@elos/shared'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { BidsService } from './bids.service'

@ApiTags('bids')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies/:cnpj/quotations/:quotationId')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  // ─── Bids ───────────────────────────────────────────────────────────────────

  @Get('bids')
  @ApiOperation({ summary: 'Listar lances da cotação' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  findAll(
    @Param('quotationId') quotationId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.findAll(quotationId, user)
  }

  @Post('bids')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar lance em nome do fornecedor (cotação OPEN)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 409 })
  create(
    @Param('quotationId') quotationId: string,
    @Body(new ZodValidationPipe(createBidSchema)) body: CreateBidDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.create(quotationId, body, user)
  }

  // IMPORTANTE: @Get('bids/compare') deve vir ANTES de @Get('bids/:bidId')
  @Get('bids/compare')
  @ApiOperation({ summary: 'Comparativo de lances (matrix itens × fornecedores)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Cotação não é OPEN nem CLOSED.' })
  @ApiResponse({ status: 403 })
  compare(
    @Param('quotationId') quotationId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.compare(quotationId, user)
  }

  @Get('bids/:bidId')
  @ApiOperation({ summary: 'Detalhe do lance com itens' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  findOne(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.findOne(quotationId, bidId, user)
  }

  @Patch('bids/:bidId')
  @ApiOperation({ summary: 'Atualizar notas do lance (apenas DRAFT)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  update(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @Body(new ZodValidationPipe(updateBidSchema)) body: UpdateBidDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.update(quotationId, bidId, body, user)
  }

  @Delete('bids/:bidId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover lance (apenas DRAFT)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT.' })
  @ApiResponse({ status: 403 })
  remove(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.remove(quotationId, bidId, user)
  }

  @Post('bids/:bidId/submit')
  @ApiOperation({ summary: 'Submeter lance (DRAFT → SUBMITTED)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT ou sem itens.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  submit(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.submit(quotationId, bidId, user)
  }

  // ─── Bid Items ──────────────────────────────────────────────────────────────

  @Get('bids/:bidId/items')
  @ApiOperation({ summary: 'Listar itens do lance' })
  findBidItems(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.findBidItems(quotationId, bidId, user)
  }

  @Post('bids/:bidId/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar item ao lance (apenas DRAFT)' })
  addBidItem(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @Body(new ZodValidationPipe(createBidItemSchema)) body: CreateBidItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.addBidItem(quotationId, bidId, body, user)
  }

  @Patch('bids/:bidId/items/:itemId')
  @ApiOperation({ summary: 'Atualizar item do lance (apenas DRAFT)' })
  updateBidItem(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateBidItemSchema)) body: UpdateBidItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.updateBidItem(quotationId, bidId, itemId, body, user)
  }

  @Delete('bids/:bidId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item do lance (apenas DRAFT)' })
  removeBidItem(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.removeBidItem(quotationId, bidId, itemId, user)
  }

  // ─── Winner Selection ───────────────────────────────────────────────────────

  @Post('select-winner')
  @ApiOperation({ summary: 'Selecionar lance vencedor (cotação CLOSED)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status inválido ou já há vencedor.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 409, description: 'Já existe vencedor selecionado.' })
  selectWinner(
    @Param('quotationId') quotationId: string,
    @Body(new ZodValidationPipe(selectWinnerSchema)) body: SelectWinnerDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.selectWinner(quotationId, body, user)
  }
}
```

---

### 4. `bids.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { BidsController } from './bids.controller'
import { BidsService } from './bids.service'

@Module({
  controllers: [BidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
```

---

### 5. Atualizar `app.module.ts`

```typescript
import { BidsModule } from './modules/bids/bids.module'

// Adicionar ao array imports:
BidsModule,
```

---

### 6. `bids.service.spec.ts`

Cobrir: create (happy path + 403 sem permissão + 400 cotação não OPEN + 400
fornecedor não convidado + 409 lance duplicado), submit (happy path + 400 sem itens
+ 400 status inválido), selectWinner (happy path + 400 cotação não CLOSED + 400
lance não SUBMITTED + 409 já há vencedor).

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import { BidsService } from './bids.service'
import type { SessionUser } from '../../common/types/session-user'

const compradorUser: SessionUser = {
  id: 'user-comprador',
  email: 'comprador@empresa.com',
  name: 'Comprador',
  role: 'COMPRADOR',
  companyId: 'company-1',
}

const mockQuotation = {
  id: 'quotation-1',
  companyId: 'company-1',
  status: 'OPEN' as const,
  title: 'Cotação Q4',
  number: 'COT-2024-0001',
  deadline: new Date('2024-12-31'),
  description: null,
  paymentTerms: null,
  createdBy: 'user-comprador',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockBid = {
  id: 'bid-1',
  quotationId: 'quotation-1',
  supplierId: 'supplier-1',
  companyId: 'company-1',
  status: 'DRAFT' as const,
  notes: null,
  submittedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('BidsService', () => {
  let service: BidsService
  let qb: Record<string, ReturnType<typeof vi.fn>>
  let mockDb: Record<string, unknown>
  let mockAbility: { cannot: ReturnType<typeof vi.fn> }

  function enqueue(result: unknown) {
    // biome-ignore lint/suspicious/noThenProperty: mock thenable para testes
    qb['then'] = vi.fn((resolve: (v: unknown) => void) => resolve([result]))
  }

  beforeEach(async () => {
    qb = {
      select:    vi.fn().mockReturnThis(),
      from:      vi.fn().mockReturnThis(),
      where:     vi.fn().mockReturnThis(),
      limit:     vi.fn().mockReturnThis(),
      orderBy:   vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      insert:    vi.fn().mockReturnThis(),
      values:    vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockBid]),
      update:    vi.fn().mockReturnThis(),
      set:       vi.fn().mockReturnThis(),
      delete:    vi.fn().mockReturnThis(),
      // biome-ignore lint/suspicious/noThenProperty: mock thenable para testes
      then: vi.fn((resolve: (v: unknown) => void) => resolve([null])),
    }

    mockDb = {
      select:      (...a: unknown[]) => qb['select']!(...a),
      insert:      (...a: unknown[]) => qb['insert']!(...a),
      update:      (...a: unknown[]) => qb['update']!(...a),
      delete:      (...a: unknown[]) => qb['delete']!(...a),
      transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(qb)),
    }

    mockAbility = { cannot: vi.fn().mockReturnValue(false) }

    const module = await Test.createTestingModule({
      providers: [
        BidsService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(BidsService)
  })

  describe('create', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })

    it('lança BadRequestException quando cotação não está OPEN', async () => {
      enqueue({ ...mockQuotation, status: 'DRAFT' })
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança NotFoundException quando cotação não encontrada', async () => {
      enqueue(undefined)
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(NotFoundException)
    })

    it('lança BadRequestException quando fornecedor não está convidado', async () => {
      enqueue(mockQuotation)    // cotação OK
      enqueue(undefined)        // convite não encontrado
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ConflictException quando lance duplicado', async () => {
      enqueue(mockQuotation)           // cotação OK
      enqueue({ id: 'invite-1' })      // convite existe
      enqueue({ id: 'bid-exists' })    // lance já existe
      await expect(
        service.create('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('submit', () => {
    it('lança BadRequestException quando status não é DRAFT', async () => {
      enqueue(mockQuotation)                         // cotação OK
      enqueue({ ...mockBid, status: 'SUBMITTED' })   // bid já submetido
      await expect(
        service.submit('quotation-1', 'bid-1', compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequestException quando lance não tem itens', async () => {
      enqueue(mockQuotation)              // cotação OK
      enqueue(mockBid)                   // bid DRAFT
      enqueue({ itemCount: 0 })          // sem itens
      await expect(
        service.submit('quotation-1', 'bid-1', compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockQuotation)
      enqueue(mockBid)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.submit('quotation-1', 'bid-1', compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('selectWinner', () => {
    it('lança BadRequestException quando cotação não está CLOSED', async () => {
      enqueue(mockQuotation)  // status OPEN, não CLOSED
      await expect(
        service.selectWinner('quotation-1', { bidId: 'bid-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança BadRequestException quando lance não está SUBMITTED', async () => {
      enqueue({ ...mockQuotation, status: 'CLOSED' })
      enqueue({ ...mockBid, status: 'DRAFT' })  // não submetido
      await expect(
        service.selectWinner('quotation-1', { bidId: 'bid-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ConflictException quando já há vencedor', async () => {
      enqueue({ ...mockQuotation, status: 'CLOSED' })
      enqueue({ ...mockBid, status: 'SUBMITTED' })
      enqueue({ id: 'winner-bid' })  // já existe ACCEPTED
      await expect(
        service.selectWinner('quotation-1', { bidId: 'bid-1' }, compradorUser),
      ).rejects.toThrow(ConflictException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue({ ...mockQuotation, status: 'CLOSED' })
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.selectWinner('quotation-1', { bidId: 'bid-1' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('addBidItem', () => {
    it('lança ConflictException quando item já adicionado ao lance', async () => {
      enqueue(mockQuotation)           // cotação OK
      enqueue(mockBid)                 // bid OK
      enqueue({ id: 'qitem-1' })       // quotation item existe
      enqueue({ id: 'existing' })      // bid item já existe
      await expect(
        service.addBidItem(
          'quotation-1',
          'bid-1',
          { quotationItemId: 'qitem-1', unitPrice: 10, deliveryDays: 5 },
          compradorUser,
        ),
      ).rejects.toThrow(ConflictException)
    })
  })
})
```

---

### 7. `bids.controller.spec.ts`

```typescript
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { BidsController } from './bids.controller'
import { BidsService } from './bids.service'

describe('BidsController', () => {
  let controller: BidsController
  let service: { [key: string]: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    service = {
      findAll:      vi.fn().mockResolvedValue([]),
      create:       vi.fn().mockResolvedValue({ id: 'bid-1' }),
      findOne:      vi.fn().mockResolvedValue({ id: 'bid-1' }),
      update:       vi.fn().mockResolvedValue({ id: 'bid-1' }),
      remove:       vi.fn().mockResolvedValue({ success: true }),
      submit:       vi.fn().mockResolvedValue({ id: 'bid-1', status: 'SUBMITTED' }),
      findBidItems: vi.fn().mockResolvedValue([]),
      addBidItem:   vi.fn().mockResolvedValue({ id: 'item-1' }),
      compare:      vi.fn().mockResolvedValue({ quotationId: 'q-1', bids: [], rows: [] }),
      selectWinner: vi.fn().mockResolvedValue({ success: true, winnerBidId: 'bid-1' }),
    }

    const module = await Test.createTestingModule({
      controllers: [BidsController],
      providers: [{ provide: BidsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(BidsController)
  })

  const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never

  it('findAll delega ao service', async () => {
    await controller.findAll('quotation-1', user)
    expect(service['findAll']).toHaveBeenCalledWith('quotation-1', user)
  })

  it('create delega ao service', async () => {
    const dto = { supplierId: '123e4567-e89b-12d3-a456-426614174000' }
    await controller.create('quotation-1', dto, user)
    expect(service['create']).toHaveBeenCalledWith('quotation-1', dto, user)
  })

  it('compare delega ao service', async () => {
    await controller.compare('quotation-1', user)
    expect(service['compare']).toHaveBeenCalledWith('quotation-1', user)
  })

  it('submit delega ao service', async () => {
    await controller.submit('quotation-1', 'bid-1', user)
    expect(service['submit']).toHaveBeenCalledWith('quotation-1', 'bid-1', user)
  })

  it('selectWinner delega ao service', async () => {
    const dto = { bidId: 'bid-1' }
    await controller.selectWinner('quotation-1', dto, user)
    expect(service['selectWinner']).toHaveBeenCalledWith('quotation-1', dto, user)
  })
})
```

---

## Verificação

- [ ] `pnpm vitest run --filter api` — todos os testes passando (contagem acumulada ≥ 110)
- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo
- [ ] Checklist de segurança:
  - [ ] `POST /v1/.../bids` retorna 400 quando cotação não está OPEN
  - [ ] `POST /v1/.../bids` retorna 400 quando fornecedor não está convidado
  - [ ] `POST /v1/.../bids/:bidId/submit` retorna 400 sem itens no lance
  - [ ] `POST /v1/.../select-winner` retorna 400 quando cotação não está CLOSED
  - [ ] `POST /v1/.../select-winner` retorna 400 quando lance não está SUBMITTED
  - [ ] `POST /v1/.../select-winner` retorna 409 quando já existe vencedor
  - [ ] `GET /v1/.../bids/compare` não interpreta "compare" como `:bidId`
  - [ ] Toda mutação gera registro em `audit_logs` (create, submit, select_winner)
  - [ ] `GET /v1/.../bids` retorna apenas lances do tenant correto (`companyId`)
- [ ] `GET /reference` exibe o grupo `bids` com todas as rotas
