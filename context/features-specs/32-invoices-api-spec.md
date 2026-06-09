# Feature Spec — 6.2 Invoices Module (API)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 6 — Financeiro (NF + Pagamentos)  
**Unidade:** 6.2  
**Pré-requisito:** 6.1 concluído (schemas `CreateInvoiceDto`, etc.)  
**Commit convencional esperado:** `feat(api): add invoices module with crud, validation and file upload`

---

## Objetivo

Criar o módulo NestJS `InvoicesModule` para registro, validação e rejeição de
notas fiscais (NFs). Uma NF é vinculada a um pedido de compra (PO) com status
`SENT` ou `RECEIVED` e segue o fluxo:

```
PENDING → VALIDATED
        ↘ REJECTED
```

Inclui sub-recurso de itens (adição/remoção apenas em `PENDING`) e endpoint de
upload de arquivo PDF via Supabase Storage (signed URL).

---

## Decisões de Negócio

| Regra | Comportamento |
| ----- | ------------- |
| Quem cria NF | ANALISTA_FINANCEIRO e ADMIN_EMPRESA (COMPRADOR pode ler) |
| Quem valida/rejeita | ANALISTA_FINANCEIRO e ADMIN_EMPRESA |
| PO vinculado | Obrigatório; PO deve ter status `SENT` ou `RECEIVED` e pertencer à empresa |
| Fornecedor | Obrigatório; deve pertencer à empresa e estar `APPROVED` |
| Número da NF | Texto livre (número fiscal externo), único por empresa |
| Edição | Apenas em status `PENDING` — número, data de emissão, valores, itens |
| Validar (`validate`) | `PENDING → VALIDATED`; registra `validatedById` e `validatedAt` |
| Rejeitar (`reject`) | `PENDING → REJECTED`; exige `rejectionReason` (min 5 chars) |
| Exclusão | Não na v1 — NFs são documentos fiscais, imutáveis como audit trail |
| Upload de arquivo | Endpoint separado `POST :id/upload` que gera signed URL no Supabase Storage e grava `fileUrl` na NF |
| Itens | Opcionais no create; podem ser adicionados/removidos enquanto PENDING |
| Conciliação de valores | v1: apenas comparação visual no frontend (valor NF vs. valor PO); sem bloqueio automático por divergência |

---

## Escopo

### In

- `apps/api/src/modules/invoices/invoices.module.ts`
- `apps/api/src/modules/invoices/invoices.controller.ts`
- `apps/api/src/modules/invoices/invoices.controller.spec.ts`
- `apps/api/src/modules/invoices/invoices.service.ts`
- `apps/api/src/modules/invoices/invoices.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `Invoice`
- Modificação em `apps/api/src/app.module.ts` — importar `InvoicesModule`
- Migration se o schema do banco precisar de ajustes (ex.: unique em `number` por empresa)

### Out

- UI (→ 6.4)
- Pagamentos (→ 6.3)

---

## Rotas

| Método | Caminho | Papel mínimo | Descrição |
| ------ | ------- | ------------ | --------- |
| GET | `/v1/companies/:cnpj/invoices` | Autenticado | Lista NFs com filtros |
| POST | `/v1/companies/:cnpj/invoices` | `ANALISTA_FINANCEIRO` | Cria NF |
| GET | `/v1/companies/:cnpj/invoices/:id` | Autenticado | Detalhe com itens |
| PATCH | `/v1/companies/:cnpj/invoices/:id` | `ANALISTA_FINANCEIRO` | Atualiza (apenas PENDING) |
| POST | `/v1/companies/:cnpj/invoices/:id/validate` | `ANALISTA_FINANCEIRO` | PENDING → VALIDATED |
| POST | `/v1/companies/:cnpj/invoices/:id/reject` | `ANALISTA_FINANCEIRO` | PENDING → REJECTED |
| POST | `/v1/companies/:cnpj/invoices/:id/items` | `ANALISTA_FINANCEIRO` | Adiciona item (apenas PENDING) |
| DELETE | `/v1/companies/:cnpj/invoices/:id/items/:itemId` | `ANALISTA_FINANCEIRO` | Remove item (apenas PENDING) |
| POST | `/v1/companies/:cnpj/invoices/:id/upload` | `ANALISTA_FINANCEIRO` | Upload de arquivo PDF |

> **Query params em GET /invoices:** `status` (PENDING|VALIDATED|REJECTED),
> `supplierId` (uuid), `purchaseOrderId` (uuid), `search` (substring do número),
> `page` (default 1), `limit` (default 20, max 100).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    invoices/
      invoices.module.ts           ← criar
      invoices.controller.ts       ← criar
      invoices.controller.spec.ts  ← criar
      invoices.service.ts          ← criar
      invoices.service.spec.ts     ← criar
  common/
    ability/
      ability.factory.ts           ← modificar (regras Invoice + subject tagueado)
  app.module.ts                    ← modificar (importar InvoicesModule)
  db/
    schema/invoices.ts             ← modificar se necessário (unique index em number)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `Invoice`

```typescript
// Adicionar ao union Subjects:
//   'Invoice' | (Invoice & ForcedSubject<'Invoice'>)

case 'SUPER_ADMIN':
  can('manage', 'all')
  break

case 'ADMIN_EMPRESA':
  // regras já existentes ...
  can('manage', 'Invoice', { companyId })
  break

case 'COMPRADOR':
  // regras já existentes ...
  can('read', 'Invoice', { companyId })
  break

case 'ALMOXARIFE':
  // regras já existentes ...
  can('read', 'Invoice', { companyId })
  break

case 'ANALISTA_FINANCEIRO':
  // regras já existentes ...
  can('manage', 'Invoice', { companyId })
  break

case 'TRANSPORTADOR':
  // regras já existentes ...
  can('read', 'Invoice', { companyId })
  break
```

---

### 2. `invoices.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, ilike, inArray, SQL } from 'drizzle-orm'
import { subject } from '@casl/ability'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { auditLogs } from '../../db/schema/audit-logs'
import { users } from '../../db/schema/auth'
import { invoiceItems, invoices } from '../../db/schema/invoices'
import { products } from '../../db/schema/products'
import { purchaseOrders } from '../../db/schema/purchase-orders'
import { suppliers } from '../../db/schema/suppliers'
import type {
  CreateInvoiceDto,
  CreateInvoiceItemDto,
  RejectInvoiceDto,
  UpdateInvoiceDto,
  ValidateInvoiceDto,
} from '@elos/shared'

@Injectable()
export class InvoicesService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?:          string | undefined
      supplierId?:      string | undefined
      purchaseOrderId?: string | undefined
      search?:          string | undefined
      page?:            string | undefined
      limit?:           string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Invoice')) {
      throw new ForbiddenException('Sem permissão para listar notas fiscais.')
    }

    const page  = Math.max(1, Number.isNaN(Number.parseInt(query.page ?? '1', 10))
      ? 1 : Number.parseInt(query.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, Number.isNaN(Number.parseInt(query.limit ?? '20', 10))
      ? 20 : Number.parseInt(query.limit ?? '20', 10)))
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(invoices.companyId, user.companyId!)]
    if (query.status)          conditions.push(eq(invoices.status, query.status as 'PENDING'))
    if (query.supplierId)      conditions.push(eq(invoices.supplierId, query.supplierId))
    if (query.purchaseOrderId) conditions.push(eq(invoices.purchaseOrderId, query.purchaseOrderId))
    if (query.search)          conditions.push(ilike(invoices.number, `%${query.search}%`))

    return this.db
      .select({
        id:                  invoices.id,
        companyId:           invoices.companyId,
        purchaseOrderId:     invoices.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        supplierId:          invoices.supplierId,
        supplierName:        suppliers.name,
        number:              invoices.number,
        issueDate:           invoices.issueDate,
        totalAmount:         invoices.totalAmount,
        taxAmount:           invoices.taxAmount,
        status:              invoices.status,
        fileUrl:             invoices.fileUrl,
        rejectionReason:     invoices.rejectionReason,
        validatedById:       invoices.validatedById,
        validatedAt:         invoices.validatedAt,
        createdAt:           invoices.createdAt,
        updatedAt:           invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, invoices.purchaseOrderId))
      .innerJoin(suppliers, eq(suppliers.id, invoices.supplierId))
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Invoice')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [invoice] = await this.db
      .select({
        id:                  invoices.id,
        companyId:           invoices.companyId,
        purchaseOrderId:     invoices.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        supplierId:          invoices.supplierId,
        supplierName:        suppliers.name,
        number:              invoices.number,
        issueDate:           invoices.issueDate,
        totalAmount:         invoices.totalAmount,
        taxAmount:           invoices.taxAmount,
        status:              invoices.status,
        fileUrl:             invoices.fileUrl,
        rejectionReason:     invoices.rejectionReason,
        validatedById:       invoices.validatedById,
        validatedByName:     users.name,
        validatedAt:         invoices.validatedAt,
        createdAt:           invoices.createdAt,
        updatedAt:           invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, invoices.purchaseOrderId))
      .innerJoin(suppliers, eq(suppliers.id, invoices.supplierId))
      .leftJoin(users, eq(users.id, invoices.validatedById))
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')

    const items = await this.db
      .select({
        id:          invoiceItems.id,
        invoiceId:   invoiceItems.invoiceId,
        productId:   invoiceItems.productId,
        productName: products.name,
        description: invoiceItems.description,
        quantity:    invoiceItems.quantity,
        unitPrice:   invoiceItems.unitPrice,
        totalPrice:  invoiceItems.totalPrice,
        createdAt:   invoiceItems.createdAt,
        updatedAt:   invoiceItems.updatedAt,
      })
      .from(invoiceItems)
      .leftJoin(products, eq(products.id, invoiceItems.productId))
      .where(eq(invoiceItems.invoiceId, id))
      .orderBy(invoiceItems.createdAt)

    return { ...invoice, items }
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateInvoiceDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Invoice')) {
      throw new ForbiddenException('Sem permissão para criar nota fiscal.')
    }

    // Validar PO (deve pertencer à empresa e ter status SENT ou RECEIVED)
    const [po] = await this.db
      .select({ id: purchaseOrders.id, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, dto.purchaseOrderId),
          eq(purchaseOrders.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!po) throw new NotFoundException('Pedido de compra não encontrado.')
    if (!['SENT', 'RECEIVED'].includes(po.status)) {
      throw new BadRequestException(
        `O pedido de compra deve ter status SENT ou RECEIVED. Status atual: ${po.status}.`,
      )
    }

    // Validar fornecedor (deve pertencer à empresa e estar APPROVED)
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
      throw new BadRequestException('Apenas fornecedores aprovados podem ter NFs registradas.')
    }

    return this.db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          companyId:       user.companyId!,
          purchaseOrderId: dto.purchaseOrderId,
          supplierId:      dto.supplierId,
          number:          dto.number,
          issueDate:       new Date(dto.issueDate),
          totalAmount:     String(dto.totalAmount),
          taxAmount:       dto.taxAmount !== undefined ? String(dto.taxAmount) : null,
          fileUrl:         dto.fileUrl ?? null,
          status:          'PENDING',
        })
        .returning()

      if (!invoice) throw new Error('Falha ao criar nota fiscal.')

      // Inserir itens se fornecidos
      if (dto.items?.length) {
        for (const item of dto.items) {
          await tx.insert(invoiceItems).values({
            invoiceId:   invoice.id,
            productId:   item.productId ?? null,
            description: item.description,
            quantity:    String(item.quantity),
            unitPrice:   String(item.unitPrice),
            totalPrice:  String(item.totalPrice),
          })
        }
      }

      await tx.insert(auditLogs).values({
        entity:    'Invoice',
        entityId:  invoice.id,
        action:    'CREATE',
        after: {
          number:          dto.number,
          purchaseOrderId: dto.purchaseOrderId,
          supplierId:      dto.supplierId,
          totalAmount:     dto.totalAmount,
          status:          'PENDING',
        },
        userId:    user.id,
        companyId: user.companyId,
      })

      return invoice
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateInvoiceDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Nota fiscal não encontrada.')
    if (ability.cannot('update', subject('Invoice', existing))) {
      throw new ForbiddenException('Sem permissão para editar esta nota fiscal.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        'Somente notas fiscais pendentes (PENDING) podem ser editadas.',
      )
    }

    return this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.number      !== undefined) updateData.number      = dto.number
      if (dto.issueDate   !== undefined) updateData.issueDate   = new Date(dto.issueDate)
      if (dto.totalAmount !== undefined) updateData.totalAmount = String(dto.totalAmount)
      if (dto.taxAmount   !== undefined) updateData.taxAmount   = String(dto.taxAmount)
      if (dto.fileUrl     !== undefined) updateData.fileUrl     = dto.fileUrl

      const [updated] = await tx
        .update(invoices)
        .set(updateData)
        .where(
          and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)),
        )
        .returning()

      if (!updated) throw new NotFoundException('Nota fiscal não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'Invoice', entityId: id, action: 'UPDATE',
        before: { number: existing.number, totalAmount: existing.totalAmount },
        after: updateData,
        userId: user.id, companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── validate ─────────────────────────────────────────────────────────────

  async validate(id: string, dto: ValidateInvoiceDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Nota fiscal não encontrada.')
    if (ability.cannot('update', subject('Invoice', existing))) {
      throw new ForbiddenException('Sem permissão para validar esta nota fiscal.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Apenas NFs pendentes podem ser validadas. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(invoices)
        .set({
          status:        'VALIDATED',
          validatedById: user.id,
          validatedAt:   now,
          updatedAt:     now,
        })
        .where(
          and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)),
        )
        .returning()

      if (!updated) throw new NotFoundException('Nota fiscal não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'Invoice', entityId: id, action: 'VALIDATE',
        before: { status: 'PENDING' },
        after: { status: 'VALIDATED', validatedById: user.id },
        userId: user.id, companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── reject ───────────────────────────────────────────────────────────────

  async reject(id: string, dto: RejectInvoiceDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Nota fiscal não encontrada.')
    if (ability.cannot('update', subject('Invoice', existing))) {
      throw new ForbiddenException('Sem permissão para rejeitar esta nota fiscal.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException(
        `Apenas NFs pendentes podem ser rejeitadas. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(invoices)
        .set({
          status:          'REJECTED',
          rejectionReason: dto.rejectionReason,
          validatedById:   user.id,
          validatedAt:     now,
          updatedAt:       now,
        })
        .where(
          and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)),
        )
        .returning()

      if (!updated) throw new NotFoundException('Nota fiscal não encontrada.')

      await tx.insert(auditLogs).values({
        entity: 'Invoice', entityId: id, action: 'REJECT',
        before: { status: 'PENDING' },
        after: { status: 'REJECTED', rejectionReason: dto.rejectionReason },
        userId: user.id, companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── addItem ──────────────────────────────────────────────────────────────

  async addItem(invoiceId: string, dto: CreateInvoiceItemDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Invoice')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [invoice] = await this.db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.companyId, user.companyId!)),
      )
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException('Itens só podem ser adicionados a NFs pendentes.')
    }

    return this.db.transaction(async (tx) => {
      const [item] = await tx
        .insert(invoiceItems)
        .values({
          invoiceId,
          productId:   dto.productId ?? null,
          description: dto.description,
          quantity:    String(dto.quantity),
          unitPrice:   String(dto.unitPrice),
          totalPrice:  String(dto.totalPrice),
        })
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'InvoiceItem', entityId: item!.id, action: 'CREATE',
        after: { invoiceId, description: dto.description },
        userId: user.id, companyId: user.companyId,
      })

      return item
    })
  }

  // ─── removeItem ───────────────────────────────────────────────────────────

  async removeItem(invoiceId: string, itemId: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Invoice')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [invoice] = await this.db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(
        and(eq(invoices.id, invoiceId), eq(invoices.companyId, user.companyId!)),
      )
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException('Itens só podem ser removidos de NFs pendentes.')
    }

    return this.db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(invoiceItems)
        .where(
          and(eq(invoiceItems.id, itemId), eq(invoiceItems.invoiceId, invoiceId)),
        )
        .returning()

      if (!deleted) throw new NotFoundException('Item não encontrado.')

      await tx.insert(auditLogs).values({
        entity: 'InvoiceItem', entityId: itemId, action: 'DELETE',
        before: { description: deleted.description },
        userId: user.id, companyId: user.companyId,
      })

      return { success: true }
    })
  }

  // ─── uploadFile ───────────────────────────────────────────────────────────

  // Nota: na v1, o upload usa Supabase Storage.
  // O endpoint recebe o arquivo, faz upload para o bucket,
  // e grava a URL pública/signed em invoices.fileUrl.
  // Se Supabase Storage não estiver configurado, aceitar uma URL direta.
  async uploadFile(id: string, fileUrl: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Invoice')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [invoice] = await this.db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(
        and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)),
      )
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')
    if (invoice.status !== 'PENDING') {
      throw new BadRequestException('Upload só permitido em NFs pendentes.')
    }

    const [updated] = await this.db
      .update(invoices)
      .set({ fileUrl, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, user.companyId!)))
      .returning()

    return updated
  }
}
```

---

### 3. `invoices.controller.ts`

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import {
  createInvoiceSchema, createInvoiceItemSchema,
  updateInvoiceSchema, validateInvoiceSchema, rejectInvoiceSchema,
  type CreateInvoiceDto, type CreateInvoiceItemDto,
  type UpdateInvoiceDto, type ValidateInvoiceDto, type RejectInvoiceDto,
} from '@elos/shared'
import { InvoicesService } from './invoices.service'

@ApiTags('invoices')
@ApiCookieAuth()
@Controller('companies/:cnpj/invoices')
@UseGuards(AuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notas fiscais' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status')          status?: string,
    @Query('supplierId')      supplierId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('search')          search?: string,
    @Query('page')            page?: string,
    @Query('limit')           limit?: string,
  ) {
    return this.invoicesService.findAll(user, {
      status, supplierId, purchaseOrderId, search, page, limit,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nota fiscal' })
  @ApiResponse({ status: 201, description: 'NF criada.' })
  @ApiResponse({ status: 400, description: 'PO não está SENT/RECEIVED ou fornecedor não APPROVED.' })
  create(
    @Body(new ZodValidationPipe(createInvoiceSchema)) body: CreateInvoiceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da NF com itens' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.invoicesService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar NF (apenas PENDING)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInvoiceSchema)) body: UpdateInvoiceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.update(id, body, user)
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar NF (PENDING → VALIDATED)' })
  validate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(validateInvoiceSchema)) body: ValidateInvoiceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.validate(id, body, user)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeitar NF (PENDING → REJECTED)' })
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectInvoiceSchema)) body: RejectInvoiceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.reject(id, body, user)
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar item à NF (apenas PENDING)' })
  addItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createInvoiceItemSchema)) body: CreateInvoiceItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.addItem(id, body, user)
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remover item da NF (apenas PENDING)' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.removeItem(id, itemId, user)
  }

  @Post(':id/upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload de arquivo PDF da NF' })
  uploadFile(
    @Param('id') id: string,
    @Body('fileUrl') fileUrl: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.uploadFile(id, fileUrl, user)
  }
}
```

---

### 4. `invoices.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'

@Module({
  imports:     [AbilityModule],
  controllers: [InvoicesController],
  providers:   [InvoicesService],
  exports:     [InvoicesService],
})
export class InvoicesModule {}
```

---

### 5. Testes (service spec e controller spec)

Seguir exatamente o padrão de `non-conformities.service.spec.ts` (5.4):

**Service spec (~15 testes):**
- `create`: cria NF com sucesso; 403 sem permissão; 404 PO não encontrado; 400 PO não SENT/RECEIVED; 404 fornecedor não encontrado; 400 fornecedor não APPROVED
- `update`: 400 se NF não PENDING; 403 sem permissão; 404 não encontrada
- `validate`: transição PENDING → VALIDATED; 400 se não PENDING
- `reject`: transição PENDING → REJECTED; 400 se não PENDING
- `addItem`: adiciona item; 400 se NF não PENDING
- `removeItem`: remove item; 404 item não encontrado

**Controller spec (~7 testes):**
- GET / — lista NFs
- POST / — cria NF
- GET /:id — detalhe
- PATCH /:id — atualiza
- POST /:id/validate — valida
- POST /:id/reject — rejeita
- POST /:id/items — adiciona item

---

### 6. Schema de banco — ajuste potencial

Se `invoices.number` não tiver constraint `UNIQUE` por empresa, adicionar:

```typescript
// Em apps/api/src/db/schema/invoices.ts:
import { uniqueIndex } from 'drizzle-orm/pg-core'

// Ao final do pgTable:
// (table) => ({
//   companyNumberUnique: uniqueIndex('invoices_company_id_number_unique').on(table.companyId, table.number),
// })
```

Migration `0006_*.sql` com `CREATE UNIQUE INDEX`.

---

## Checklist de Verificação

```bash
# Testes
pnpm vitest run   # espera ≥ 230 testes

# TypeScript
pnpm type-check

# Lint
pnpm --filter api lint

# Segurança (manual)
# [ ] CASL verifica antes de cada operação
# [ ] Queries escopadas a companyId
# [ ] 403 COMPRADOR tentando criar NF
# [ ] 400 em transições inválidas
# [ ] 400 PO fora de SENT/RECEIVED
# [ ] 400 fornecedor não APPROVED
# [ ] Audit log em create/update/validate/reject/addItem/removeItem
# [ ] Itens só editáveis em PENDING
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| `validate`/`reject` usam action `'update'` no CASL | Sem diferenciação de permissão entre transições na v1; quem pode `update` pode realizar qualquer transição válida |
| Upload de arquivo via URL em vez de multipart | v1 simplifica: o frontend faz upload direto para Supabase Storage via signed URL e envia a URL ao backend; evita streaming de arquivo pelo NestJS |
| `validatedById` preenchido tanto em validate quanto em reject | O campo registra quem tomou a decisão (aprovação ou rejeição), não exclusivamente "quem validou" |
| Itens da NF são sub-recurso separado | Permite ao analista criar a NF primeiro (cabeçalho) e adicionar itens depois, ou copiar itens do PO no frontend |
| Número da NF texto livre + unique por empresa | O número fiscal é atribuído pelo fornecedor (número externo); o Elos não emite NF-e |
