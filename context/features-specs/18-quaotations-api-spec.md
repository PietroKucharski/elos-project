# Feature Spec — 3.2 Quotations API (NestJS)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 3 — Cotações e Lances  
**Unidade:** 3.2  
**Pré-requisito:** 3.1 concluído (schemas `CreateQuotationDto`, `QuotationResponse`, etc.)  
**Commit convencional esperado:** `feat(api): add quotations module with crud, status transitions and sub-resources`

---

## Objetivo

Criar o módulo NestJS `QuotationsModule` com rotas de gestão de cotações: CRUD
básico, transições de status (publicar, fechar, cancelar), sub-recurso de itens
e sub-recurso de fornecedores convidados. Audit log em todas as mutações. O módulo
é exportado para uso pelo `BidsModule` (3.3), que precisa validar que a cotação
está OPEN antes de aceitar lances.

---

## Decisões de Negócio

| Regra                                               | Comportamento                                                              |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| Número da cotação (`number`)                        | Gerado automaticamente: `COT-{ano}-{sequencial 4 dígitos por empresa}` ex: `COT-2024-0001` |
| Status DRAFT → OPEN (`publish`)                     | Requer ao menos 1 item e 1 fornecedor convidado                            |
| Status OPEN → CLOSED (`close`)                      | Encerra o período de lances; gatilha seleção de vencedor (3.3)             |
| Status OPEN/DRAFT → CANCELLED (`cancel`)            | Cancela a cotação; lances existentes são marcados como REJECTED            |
| Edição de itens e fornecedores                      | Permitida apenas quando status = DRAFT                                     |
| Exclusão de cotação                                 | Não existe — apenas cancelamento                                           |
| Fornecedor convidado deve ser APPROVED              | Validação no Service antes de adicionar ao convite                         |

---

## Escopo

### In

- `apps/api/src/modules/quotations/quotations.module.ts`
- `apps/api/src/modules/quotations/quotations.controller.ts`
- `apps/api/src/modules/quotations/quotations.controller.spec.ts`
- `apps/api/src/modules/quotations/quotations.service.ts`
- `apps/api/src/modules/quotations/quotations.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `Quotation`
- Modificação em `apps/api/src/app.module.ts` — importar `QuotationsModule`

### Out (não implementar nesta unidade)

- Submissão e gestão de lances (→ 3.3)
- Seleção de vencedor (→ 3.3)
- Geração automática de Pedido de Compra (→ Fase 4)
- Notificação de e-mail para fornecedores convidados (fora do escopo v1)
- UI de cotações (→ 3.4)

---

## Rotas

| Método | Caminho                                                        | Papel mínimo | Descrição                              |
| ------ | -------------------------------------------------------------- | ------------ | -------------------------------------- |
| GET    | `/v1/companies/:cnpj/quotations`                               | Autenticado  | Lista cotações (filtros opcionais)     |
| POST   | `/v1/companies/:cnpj/quotations`                               | `COMPRADOR`  | Cria cotação (status DRAFT)            |
| GET    | `/v1/companies/:cnpj/quotations/:id`                           | Autenticado  | Detalhe da cotação                     |
| PATCH  | `/v1/companies/:cnpj/quotations/:id`                           | `COMPRADOR`  | Atualiza cotação (apenas DRAFT)        |
| POST   | `/v1/companies/:cnpj/quotations/:id/publish`                   | `COMPRADOR`  | Publica cotação (DRAFT → OPEN)         |
| POST   | `/v1/companies/:cnpj/quotations/:id/close`                     | `COMPRADOR`  | Fecha cotação (OPEN → CLOSED)          |
| POST   | `/v1/companies/:cnpj/quotations/:id/cancel`                    | `COMPRADOR`  | Cancela cotação (DRAFT/OPEN → CANCELLED)|
| GET    | `/v1/companies/:cnpj/quotations/:id/items`                     | Autenticado  | Lista itens da cotação                 |
| POST   | `/v1/companies/:cnpj/quotations/:id/items`                     | `COMPRADOR`  | Adiciona item (apenas DRAFT)           |
| PATCH  | `/v1/companies/:cnpj/quotations/:id/items/:itemId`             | `COMPRADOR`  | Atualiza item (apenas DRAFT)           |
| DELETE | `/v1/companies/:cnpj/quotations/:id/items/:itemId`             | `COMPRADOR`  | Remove item (apenas DRAFT)             |
| GET    | `/v1/companies/:cnpj/quotations/:id/suppliers`                 | Autenticado  | Lista fornecedores convidados          |
| POST   | `/v1/companies/:cnpj/quotations/:id/suppliers`                 | `COMPRADOR`  | Convida fornecedor (apenas DRAFT)      |
| DELETE | `/v1/companies/:cnpj/quotations/:id/suppliers/:supplierId`     | `COMPRADOR`  | Remove convite (apenas DRAFT)          |

> **Query params em GET /quotations:** `status` (DRAFT|OPEN|CLOSED|CANCELLED),
> `search` (substring do título — usa `ilike`), `page` e `limit` (default limit=20, max=100).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    quotations/
      quotations.module.ts          ← criar
      quotations.controller.ts      ← criar
      quotations.controller.spec.ts ← criar
      quotations.service.ts         ← criar
      quotations.service.spec.ts    ← criar
  common/
    ability/
      ability.factory.ts            ← modificar (regras Quotation)
  app.module.ts                     ← modificar (importar QuotationsModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `Quotation`

```typescript
// — dentro do switch(user.role) —

case 'SUPER_ADMIN':
  // já existente: can('manage', 'all')
  break

case 'ADMIN_EMPRESA':
  // já existentes: Company, CompanyMember, Supplier, Product
  can('read',   'Quotation', { companyId })
  can('create', 'Quotation', { companyId })
  can('update', 'Quotation', { companyId })
  // publish, close, cancel tratados como ação 'update' no CASL
  break

case 'COMPRADOR':
  can('read',   'Quotation', { companyId })
  can('create', 'Quotation', { companyId })
  can('update', 'Quotation', { companyId })
  break

case 'ALMOXARIFE':
case 'ANALISTA_FINANCEIRO':
case 'TRANSPORTADOR':
  can('read', 'Quotation', { companyId })
  break
```

> Adicionar `'Quotation'` (string) e `Quotation & ForcedSubject<'Quotation'>` ao
> union `Subjects`, seguindo o padrão de `Supplier` (2.2) e `Product` (2.3).

---

### 2. `quotations.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import { subject } from '@casl/ability'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { quotations, quotationItems, quotationSuppliers } from '../../db/schema/quotations'
import { suppliers } from '../../db/schema/suppliers'
import { bids } from '../../db/schema/bids'
import { auditLogs } from '../../db/schema/audit-logs'
import type {
  CreateQuotationDto,
  UpdateQuotationDto,
  CreateQuotationItemDto,
  UpdateQuotationItemDto,
  InviteSupplierToQuotationDto,
} from '@elos/shared'

@Injectable()
export class QuotationsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private readonly abilityFactory: AbilityFactory,
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

    const limit = Math.min(query.limit ?? 20, 100)
    const offset = ((query.page ?? 1) - 1) * limit

    const validStatuses = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'] as const
    if (query.status && !validStatuses.includes(query.status as never)) {
      throw new BadRequestException('Status de cotação inválido.')
    }

    const conditions = [eq(quotations.companyId, user.companyId!)]

    if (query.status) {
      conditions.push(
        eq(quotations.status, query.status as (typeof validStatuses)[number]),
      )
    }

    if (query.search) {
      conditions.push(ilike(quotations.title, `%${query.search}%`))
    }

    // Lista com contagem de itens e lances via subquery
    const rows = await this.db
      .select({
        id:           quotations.id,
        companyId:    quotations.companyId,
        number:       quotations.number,
        title:        quotations.title,
        description:  quotations.description,
        deadline:     quotations.deadline,
        paymentTerms: quotations.paymentTerms,
        status:       quotations.status,
        createdBy:    quotations.createdBy,
        createdAt:    quotations.createdAt,
        updatedAt:    quotations.updatedAt,
        itemCount: sql<number>`(
          SELECT COUNT(*) FROM quotation_items
          WHERE quotation_items.quotation_id = ${quotations.id}
        )`.as('item_count'),
        bidCount: sql<number>`(
          SELECT COUNT(*) FROM bids
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

    // Gerar número sequencial por empresa: COT-{ano}-{4 dígitos}
    const year = new Date().getFullYear()
    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(quotations)
      .where(
        and(
          eq(quotations.companyId, user.companyId!),
          sql`EXTRACT(YEAR FROM ${quotations.createdAt}) = ${year}`,
        ),
      )

    const sequential = String(Number(count) + 1).padStart(4, '0')
    const number = `COT-${year}-${sequential}`

    const [created] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(quotations)
        .values({
          ...dto,
          number,
          companyId: user.companyId!,
          createdBy: user.id,
          status: 'DRAFT',
          deadline: new Date(dto.deadline),
        })
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Quotation',
        entityId: rows[0]!.id,
        action: 'CREATE',
        before: null,
        after: rows[0],
        userId: user.id,
        companyId: user.companyId,
      })

      return rows
    })

    if (!created) throw new BadRequestException('Falha ao criar cotação.')
    return created
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
      throw new BadRequestException(
        'Apenas cotações com status DRAFT podem ser editadas.',
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quotations)
        .set({
          ...dto,
          ...(dto.deadline ? { deadline: new Date(dto.deadline) } : {}),
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
    const [{ itemCount }] = await this.db
      .select({ itemCount: sql<number>`COUNT(*)` })
      .from(quotationItems)
      .where(eq(quotationItems.quotationId, id))

    if (Number(itemCount) === 0) {
      throw new BadRequestException(
        'A cotação precisa ter ao menos 1 item para ser publicada.',
      )
    }

    const [{ supplierCount }] = await this.db
      .select({ supplierCount: sql<number>`COUNT(*)` })
      .from(quotationSuppliers)
      .where(eq(quotationSuppliers.quotationId, id))

    if (Number(supplierCount) === 0) {
      throw new BadRequestException(
        'A cotação precisa ter ao menos 1 fornecedor convidado para ser publicada.',
      )
    }

    const [updated] = await this.db.transaction(async (tx) => {
      const rows = await tx
        .update(quotations)
        .set({ status: 'OPEN', updatedAt: new Date() })
        .where(eq(quotations.id, id))
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
        .set({ status: 'CLOSED', updatedAt: new Date() })
        .where(eq(quotations.id, id))
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
        .where(eq(quotations.id, id))

      // Rejeitar todos os lances não finalizados
      await tx
        .update(bids)
        .set({ status: 'REJECTED', updatedAt: new Date() })
        .where(
          and(
            eq(bids.quotationId, id),
            sql`${bids.status} NOT IN ('ACCEPTED', 'REJECTED')`,
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

  private async assertQuotationBelongsToCompany(
    quotationId: string,
    companyId: string,
  ) {
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

  async addItem(
    quotationId: string,
    dto: CreateQuotationItemDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para adicionar item.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(
      quotationId,
      user.companyId!,
    )

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Itens só podem ser adicionados em cotações com status DRAFT.',
      )
    }

    const [item] = await this.db
      .insert(quotationItems)
      .values({ ...dto, quotationId })
      .returning()

    if (!item) throw new BadRequestException('Falha ao criar item.')
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

    const quotation = await this.assertQuotationBelongsToCompany(
      quotationId,
      user.companyId!,
    )

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Itens só podem ser editados em cotações com status DRAFT.',
      )
    }

    const [updated] = await this.db
      .update(quotationItems)
      .set({ ...dto, updatedAt: new Date() })
      .where(
        and(
          eq(quotationItems.id, itemId),
          eq(quotationItems.quotationId, quotationId),
        ),
      )
      .returning()

    if (!updated) throw new NotFoundException('Item não encontrado.')
    return updated
  }

  async removeItem(quotationId: string, itemId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para remover item.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(
      quotationId,
      user.companyId!,
    )

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Itens só podem ser removidos em cotações com status DRAFT.',
      )
    }

    await this.db
      .delete(quotationItems)
      .where(
        and(
          eq(quotationItems.id, itemId),
          eq(quotationItems.quotationId, quotationId),
        ),
      )

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
        id:           quotationSuppliers.id,
        quotationId:  quotationSuppliers.quotationId,
        supplierId:   quotationSuppliers.supplierId,
        supplierName: suppliers.name,
        status:       quotationSuppliers.status,
        invitedAt:    quotationSuppliers.invitedAt,
      })
      .from(quotationSuppliers)
      .innerJoin(suppliers, eq(quotationSuppliers.supplierId, suppliers.id))
      .where(eq(quotationSuppliers.quotationId, quotationId))
      .orderBy(quotationSuppliers.invitedAt)
  }

  async inviteSupplier(
    quotationId: string,
    dto: InviteSupplierToQuotationDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para convidar fornecedor.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(
      quotationId,
      user.companyId!,
    )

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Fornecedores só podem ser convidados em cotações com status DRAFT.',
      )
    }

    // Verificar que o fornecedor pertence à empresa e está APPROVED
    const [supplier] = await this.db
      .select({ id: suppliers.id, status: suppliers.status })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, dto.supplierId),
          eq(suppliers.companyId, user.companyId!),
        ),
      )
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

    const [invite] = await this.db
      .insert(quotationSuppliers)
      .values({
        quotationId,
        supplierId: dto.supplierId,
        status: 'INVITED',
        invitedAt: new Date(),
      })
      .returning()

    if (!invite) throw new BadRequestException('Falha ao criar convite.')
    return invite
  }

  async removeInvite(
    quotationId: string,
    supplierId: string,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Quotation')) {
      throw new ForbiddenException('Sem permissão para remover convite.')
    }

    const quotation = await this.assertQuotationBelongsToCompany(
      quotationId,
      user.companyId!,
    )

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Convites só podem ser removidos em cotações com status DRAFT.',
      )
    }

    await this.db
      .delete(quotationSuppliers)
      .where(
        and(
          eq(quotationSuppliers.quotationId, quotationId),
          eq(quotationSuppliers.supplierId, supplierId),
        ),
      )

    return { success: true }
  }
}
```

---

### 3. `quotations.controller.ts`

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
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import {
  createQuotationSchema,
  updateQuotationSchema,
  createQuotationItemSchema,
  updateQuotationItemSchema,
  inviteSupplierToQuotationSchema,
} from '@elos/shared'
import type {
  CreateQuotationDto,
  UpdateQuotationDto,
  CreateQuotationItemDto,
  UpdateQuotationItemDto,
  InviteSupplierToQuotationDto,
} from '@elos/shared'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { QuotationsService } from './quotations.service'

@ApiTags('quotations')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies/:cnpj/quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  // ─── Quotations ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar cotações' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quotationsService.findAll(user, {
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar cotação (status DRAFT)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  create(
    @Body(new ZodValidationPipe(createQuotationSchema)) body: CreateQuotationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da cotação' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cotação (apenas DRAFT)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateQuotationSchema)) body: UpdateQuotationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.update(id, body, user)
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publicar cotação (DRAFT → OPEN)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT ou faltam itens/fornecedores.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  publish(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.publish(id, user)
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Fechar cotação (OPEN → CLOSED)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é OPEN.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  close(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.close(id, user)
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar cotação (DRAFT/OPEN → CANCELLED)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT nem OPEN.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  cancel(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.cancel(id, user)
  }

  // ─── Quotation Items ────────────────────────────────────────────────────────

  @Get(':id/items')
  @ApiOperation({ summary: 'Listar itens da cotação' })
  findItems(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.findItems(id, user)
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar item (apenas DRAFT)' })
  addItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createQuotationItemSchema)) body: CreateQuotationItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.addItem(id, body, user)
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Atualizar item (apenas DRAFT)' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateQuotationItemSchema)) body: UpdateQuotationItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.updateItem(id, itemId, body, user)
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item (apenas DRAFT)' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.removeItem(id, itemId, user)
  }

  // ─── Invited Suppliers ──────────────────────────────────────────────────────

  @Get(':id/suppliers')
  @ApiOperation({ summary: 'Listar fornecedores convidados' })
  findInvitedSuppliers(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.findInvitedSuppliers(id, user)
  }

  @Post(':id/suppliers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convidar fornecedor (apenas DRAFT, fornecedor APPROVED)' })
  inviteSupplier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inviteSupplierToQuotationSchema)) body: InviteSupplierToQuotationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.inviteSupplier(id, body, user)
  }

  @Delete(':id/suppliers/:supplierId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover convite (apenas DRAFT)' })
  removeInvite(
    @Param('id') id: string,
    @Param('supplierId') supplierId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.removeInvite(id, supplierId, user)
  }
}
```

---

### 4. `quotations.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { QuotationsController } from './quotations.controller'
import { QuotationsService } from './quotations.service'

@Module({
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
```

> `exports: [QuotationsService]` — o BidsService (3.3) precisará validar que a
> cotação está OPEN antes de aceitar lances, e CLOSED/OPEN antes de selecionar vencedor.

---

### 5. Atualizar `app.module.ts`

```typescript
import { QuotationsModule } from './modules/quotations/quotations.module'

// Adicionar ao array imports:
QuotationsModule,
```

---

### 6. `quotations.service.spec.ts`

Cobrir: create (happy path + 403 sem permissão), findOne (404), publish (happy path
+ 400 sem itens + 400 status inválido), close (happy path + 400 status inválido),
cancel (happy path + 400 status inválido), inviteSupplier (400 fornecedor não APPROVED
+ 409 duplicado).

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
import { QuotationsService } from './quotations.service'
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
  number: 'COT-2024-0001',
  title: 'Cotação de Materiais',
  description: null,
  deadline: new Date('2024-12-31'),
  paymentTerms: null,
  status: 'DRAFT' as const,
  createdBy: 'user-comprador',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('QuotationsService', () => {
  let service: QuotationsService
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
      offset:    vi.fn().mockReturnThis(),
      orderBy:   vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      insert:    vi.fn().mockReturnThis(),
      values:    vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([mockQuotation]),
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
        QuotationsService,
        { provide: DRIZZLE, useValue: mockDb },
        {
          provide: AbilityFactory,
          useValue: { createForUser: vi.fn().mockReturnValue(mockAbility) },
        },
      ],
    }).compile()

    service = module.get(QuotationsService)
  })

  describe('create', () => {
    it('lança ForbiddenException sem permissão', async () => {
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.create(
          { title: 'Cotação', deadline: '2024-12-31T23:59:59.000Z' },
          compradorUser,
        ),
      ).rejects.toThrow(ForbiddenException)
    })

    it('cria cotação com status DRAFT e número gerado', async () => {
      // count retorna 0 (primeira cotação do ano)
      enqueue({ count: 0 })
      const result = await service.create(
        { title: 'Cotação Q4', deadline: '2024-12-31T23:59:59.000Z' },
        compradorUser,
      )
      expect(result).toBeDefined()
    })
  })

  describe('findOne', () => {
    it('lança NotFoundException quando não encontrada', async () => {
      enqueue(undefined)
      await expect(service.findOne('nao-existe', compradorUser)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('update', () => {
    it('lança BadRequestException quando status não é DRAFT', async () => {
      enqueue({ ...mockQuotation, status: 'OPEN' })
      await expect(
        service.update('quotation-1', { title: 'Novo Título' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockQuotation)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(
        service.update('quotation-1', { title: 'Novo Título' }, compradorUser),
      ).rejects.toThrow(ForbiddenException)
    })
  })

  describe('publish', () => {
    it('lança NotFoundException quando cotação não encontrada', async () => {
      enqueue(undefined)
      await expect(service.publish('nao-existe', compradorUser)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('lança BadRequestException quando status não é DRAFT', async () => {
      enqueue({ ...mockQuotation, status: 'OPEN' })
      await expect(service.publish('quotation-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança BadRequestException sem itens', async () => {
      enqueue(mockQuotation)                  // findOne
      enqueue({ itemCount: 0 })              // count de itens
      await expect(service.publish('quotation-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })

    it('lança ForbiddenException sem permissão', async () => {
      enqueue(mockQuotation)
      mockAbility.cannot = vi.fn().mockReturnValue(true)
      await expect(service.publish('quotation-1', compradorUser)).rejects.toThrow(
        ForbiddenException,
      )
    })
  })

  describe('close', () => {
    it('lança BadRequestException quando status não é OPEN', async () => {
      enqueue({ ...mockQuotation, status: 'DRAFT' })
      await expect(service.close('quotation-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('cancel', () => {
    it('lança BadRequestException quando status é CLOSED', async () => {
      enqueue({ ...mockQuotation, status: 'CLOSED' })
      await expect(service.cancel('quotation-1', compradorUser)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('inviteSupplier', () => {
    it('lança BadRequestException quando fornecedor não está APPROVED', async () => {
      enqueue(mockQuotation)                                    // assertQuotation
      enqueue({ id: 'supplier-1', status: 'PENDING' })         // supplier lookup
      await expect(
        service.inviteSupplier('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(BadRequestException)
    })

    it('lança ConflictException quando fornecedor já convidado', async () => {
      enqueue(mockQuotation)                                    // assertQuotation
      enqueue({ id: 'supplier-1', status: 'APPROVED' })        // supplier lookup
      enqueue({ id: 'existing-invite' })                        // convite duplicado
      await expect(
        service.inviteSupplier('quotation-1', { supplierId: 'supplier-1' }, compradorUser),
      ).rejects.toThrow(ConflictException)
    })
  })
})
```

---

### 7. `quotations.controller.spec.ts`

```typescript
import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { QuotationsController } from './quotations.controller'
import { QuotationsService } from './quotations.service'

describe('QuotationsController', () => {
  let controller: QuotationsController
  let service: { [key: string]: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    service = {
      findAll:             vi.fn().mockResolvedValue([]),
      create:              vi.fn().mockResolvedValue({ id: 'quotation-1' }),
      findOne:             vi.fn().mockResolvedValue({ id: 'quotation-1' }),
      update:              vi.fn().mockResolvedValue({ id: 'quotation-1' }),
      publish:             vi.fn().mockResolvedValue({ id: 'quotation-1', status: 'OPEN' }),
      close:               vi.fn().mockResolvedValue({ id: 'quotation-1', status: 'CLOSED' }),
      cancel:              vi.fn().mockResolvedValue({ success: true }),
      findItems:           vi.fn().mockResolvedValue([]),
      addItem:             vi.fn().mockResolvedValue({ id: 'item-1' }),
      updateItem:          vi.fn().mockResolvedValue({ id: 'item-1' }),
      removeItem:          vi.fn().mockResolvedValue({ success: true }),
      findInvitedSuppliers: vi.fn().mockResolvedValue([]),
      inviteSupplier:      vi.fn().mockResolvedValue({ id: 'invite-1' }),
      removeInvite:        vi.fn().mockResolvedValue({ success: true }),
    }

    const module = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [{ provide: QuotationsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(QuotationsController)
  })

  const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never

  it('findAll delega ao service', async () => {
    await controller.findAll(user)
    expect(service['findAll']).toHaveBeenCalled()
  })

  it('create delega ao service', async () => {
    const dto = { title: 'Cotação Q4', deadline: '2024-12-31T23:59:59.000Z' }
    await controller.create(dto, user)
    expect(service['create']).toHaveBeenCalledWith(dto, user)
  })

  it('publish delega ao service', async () => {
    await controller.publish('quotation-1', user)
    expect(service['publish']).toHaveBeenCalledWith('quotation-1', user)
  })

  it('close delega ao service', async () => {
    await controller.close('quotation-1', user)
    expect(service['close']).toHaveBeenCalledWith('quotation-1', user)
  })

  it('cancel delega ao service', async () => {
    await controller.cancel('quotation-1', user)
    expect(service['cancel']).toHaveBeenCalledWith('quotation-1', user)
  })
})
```

---

## Verificação

- [ ] `pnpm vitest run --filter api` — todos os testes passando (contagem acumulada ≥ 90)
- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo
- [ ] Checklist de segurança:
  - [ ] `POST /v1/companies/:cnpj/quotations` retorna 403 para ALMOXARIFE
  - [ ] `POST /v1/companies/:cnpj/quotations/:id/publish` retorna 400 sem itens
  - [ ] `POST /v1/companies/:cnpj/quotations/:id/publish` retorna 400 sem fornecedores convidados
  - [ ] `POST /v1/companies/:cnpj/quotations/:id/items` retorna 400 quando status ≠ DRAFT
  - [ ] `POST /v1/companies/:cnpj/quotations/:id/suppliers` retorna 400 para fornecedor não APPROVED
  - [ ] `GET /v1/companies/:cnpj/quotations` retorna apenas cotações do tenant correto
  - [ ] Toda mutação gera registro em `audit_logs`
- [ ] `GET /reference` exibe o grupo `quotations` com todas as rotas
