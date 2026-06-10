# Feature Spec — 6.3 Payments Module (API)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 6 — Financeiro (NF + Pagamentos)  
**Unidade:** 6.3  
**Pré-requisito:** 6.2 concluído (InvoicesModule funcional); 6.1 concluído (schemas `CreatePaymentDto`, etc.)  
**Commit convencional esperado:** `feat(api): add payments module with installments and reconciliation`

---

## Objetivo

Criar o módulo NestJS `PaymentsModule` para registro de pagamentos vinculados a
notas fiscais validadas. Inclui suporte a parcelas (`installments`) com controle
de vencimento e status individual. O fluxo:

```
PENDING → PAID (quando todas as parcelas forem PAID)
        ↘ CANCELLED
```

---

## Decisões de Negócio

| Regra | Comportamento |
| ----- | ------------- |
| Quem cria pagamento | ANALISTA_FINANCEIRO e ADMIN_EMPRESA |
| Quem lê | Todos os autenticados da empresa (COMPRADOR, ALMOXARIFE, etc.) |
| NF vinculada | Obrigatória; NF deve ter status `VALIDATED` |
| 1 pagamento por NF | Dedup por `invoiceId` — não permite criar segundo pagamento para a mesma NF |
| Parcelas | Mínimo 1; à vista = 1 parcela; soma das parcelas deve ser ≥ totalAmount |
| Pagar parcela | `POST :id/installments/:installmentId/pay` — marca parcela como PAID com `paidAt` |
| Auto-completar | Quando todas as parcelas estiverem PAID, o pagamento transiciona para PAID automaticamente |
| Cancelar | `POST :id/cancel` — cancela pagamento PENDING; parcelas já pagas impedem o cancelamento |
| Edição | Apenas `notes` em PENDING |
| Exclusão | Não na v1 |
| Parcela OVERDUE | Atualizado manualmente ou via job futuro (fora do escopo v1); o frontend mostra o cálculo visual |

---

## Escopo

### In

- `apps/api/src/modules/payments/payments.module.ts`
- `apps/api/src/modules/payments/payments.controller.ts`
- `apps/api/src/modules/payments/payments.controller.spec.ts`
- `apps/api/src/modules/payments/payments.service.ts`
- `apps/api/src/modules/payments/payments.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `Payment`
- Modificação em `apps/api/src/app.module.ts` — importar `PaymentsModule`

### Out

- UI (→ 6.5)
- Job de atualização de OVERDUE (fora do escopo v1)

---

## Rotas

| Método | Caminho | Papel mínimo | Descrição |
| ------ | ------- | ------------ | --------- |
| GET | `/v1/companies/:cnpj/payments` | Autenticado | Lista pagamentos com filtros |
| POST | `/v1/companies/:cnpj/payments` | `ANALISTA_FINANCEIRO` | Cria pagamento com parcelas |
| GET | `/v1/companies/:cnpj/payments/:id` | Autenticado | Detalhe com parcelas |
| PATCH | `/v1/companies/:cnpj/payments/:id` | `ANALISTA_FINANCEIRO` | Atualiza notes (apenas PENDING) |
| POST | `/v1/companies/:cnpj/payments/:id/cancel` | `ANALISTA_FINANCEIRO` | Cancela (PENDING, sem parcelas pagas) |
| POST | `/v1/companies/:cnpj/payments/:id/installments/:installmentId/pay` | `ANALISTA_FINANCEIRO` | Marca parcela como PAID |

> **Query params em GET /payments:** `status` (PENDING|PAID|CANCELLED),
> `method` (BOLETO|PIX|TRANSFER|CHECK), `invoiceId` (uuid),
> `search` (substring do número da NF), `page` (default 1), `limit` (default 20, max 100).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    payments/
      payments.module.ts           ← criar
      payments.controller.ts       ← criar
      payments.controller.spec.ts  ← criar
      payments.service.ts          ← criar
      payments.service.spec.ts     ← criar
  common/
    ability/
      ability.factory.ts           ← modificar (regras Payment + subject tagueado)
  app.module.ts                    ← modificar (importar PaymentsModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `Payment`

```typescript
// Adicionar ao union Subjects:
//   'Payment' | (Payment & ForcedSubject<'Payment'>)

case 'ADMIN_EMPRESA':
  // regras já existentes ...
  can('manage', 'Payment', { companyId })
  break

case 'COMPRADOR':
  // regras já existentes ...
  can('read', 'Payment', { companyId })
  break

case 'ALMOXARIFE':
  // regras já existentes ...
  can('read', 'Payment', { companyId })
  break

case 'ANALISTA_FINANCEIRO':
  // regras já existentes ...
  can('manage', 'Payment', { companyId })
  break

case 'TRANSPORTADOR':
  // regras já existentes ...
  can('read', 'Payment', { companyId })
  break
```

---

### 2. `payments.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, ilike, SQL } from 'drizzle-orm'
import { subject } from '@casl/ability'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { auditLogs } from '../../db/schema/audit-logs'
import { users } from '../../db/schema/auth'
import { invoices } from '../../db/schema/invoices'
import { paymentInstallments, payments } from '../../db/schema/payments'
import type {
  CreatePaymentDto,
  PayInstallmentDto,
  UpdatePaymentDto,
} from '@elos/shared'

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?:    string | undefined
      method?:    string | undefined
      invoiceId?: string | undefined
      search?:    string | undefined
      page?:      string | undefined
      limit?:     string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Payment')) {
      throw new ForbiddenException('Sem permissão para listar pagamentos.')
    }

    const page  = Math.max(1, Number.isNaN(Number.parseInt(query.page ?? '1', 10))
      ? 1 : Number.parseInt(query.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, Number.isNaN(Number.parseInt(query.limit ?? '20', 10))
      ? 20 : Number.parseInt(query.limit ?? '20', 10)))
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(payments.companyId, user.companyId!)]
    if (query.status)    conditions.push(eq(payments.status, query.status as 'PENDING'))
    if (query.method)    conditions.push(eq(payments.method, query.method as 'PIX'))
    if (query.invoiceId) conditions.push(eq(payments.invoiceId, query.invoiceId))
    if (query.search)    conditions.push(ilike(invoices.number, `%${query.search}%`))

    return this.db
      .select({
        id:            payments.id,
        companyId:     payments.companyId,
        invoiceId:     payments.invoiceId,
        invoiceNumber: invoices.number,
        totalAmount:   payments.totalAmount,
        method:        payments.method,
        status:        payments.status,
        paidAt:        payments.paidAt,
        notes:         payments.notes,
        createdById:   payments.createdById,
        createdByName: users.name,
        createdAt:     payments.createdAt,
        updatedAt:     payments.updatedAt,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(users, eq(users.id, payments.createdById))
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Payment')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [payment] = await this.db
      .select({
        id:            payments.id,
        companyId:     payments.companyId,
        invoiceId:     payments.invoiceId,
        invoiceNumber: invoices.number,
        totalAmount:   payments.totalAmount,
        method:        payments.method,
        status:        payments.status,
        paidAt:        payments.paidAt,
        notes:         payments.notes,
        createdById:   payments.createdById,
        createdByName: users.name,
        createdAt:     payments.createdAt,
        updatedAt:     payments.updatedAt,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .innerJoin(users, eq(users.id, payments.createdById))
      .where(
        and(eq(payments.id, id), eq(payments.companyId, user.companyId!)),
      )
      .limit(1)

    if (!payment) throw new NotFoundException('Pagamento não encontrado.')

    const installments = await this.db
      .select()
      .from(paymentInstallments)
      .where(eq(paymentInstallments.paymentId, id))
      .orderBy(paymentInstallments.installmentNumber)

    return { ...payment, installments }
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreatePaymentDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Payment')) {
      throw new ForbiddenException('Sem permissão para criar pagamento.')
    }

    // Validar NF (deve pertencer à empresa e estar VALIDATED)
    const [invoice] = await this.db
      .select({ id: invoices.id, status: invoices.status, companyId: invoices.companyId })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, dto.invoiceId),
          eq(invoices.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!invoice) throw new NotFoundException('Nota fiscal não encontrada.')
    if (invoice.status !== 'VALIDATED') {
      throw new BadRequestException(
        `A nota fiscal deve estar validada para registrar pagamento. Status atual: ${invoice.status}.`,
      )
    }

    // Dedup: verificar se já existe pagamento para esta NF
    const [existingPayment] = await this.db
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.invoiceId, dto.invoiceId),
          eq(payments.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (existingPayment) {
      throw new ConflictException('Já existe um pagamento registrado para esta nota fiscal.')
    }

    return this.db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(payments)
        .values({
          companyId:   user.companyId!,
          invoiceId:   dto.invoiceId,
          totalAmount: String(dto.totalAmount),
          method:      dto.method,
          status:      'PENDING',
          notes:       dto.notes ?? null,
          createdById: user.id,
        })
        .returning()

      if (!payment) throw new Error('Falha ao criar pagamento.')

      // Inserir parcelas
      for (const inst of dto.installments) {
        await tx.insert(paymentInstallments).values({
          paymentId:         payment.id,
          installmentNumber: String(inst.installmentNumber),
          amount:            String(inst.amount),
          dueDate:           new Date(inst.dueDate),
          status:            'PENDING',
        })
      }

      await tx.insert(auditLogs).values({
        entity: 'Payment', entityId: payment.id, action: 'CREATE',
        after: {
          invoiceId: dto.invoiceId,
          totalAmount: dto.totalAmount,
          method: dto.method,
          installmentCount: dto.installments.length,
          status: 'PENDING',
        },
        userId: user.id, companyId: user.companyId,
      })

      return payment
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdatePaymentDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(payments)
      .where(
        and(eq(payments.id, id), eq(payments.companyId, user.companyId!)),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Pagamento não encontrado.')
    if (ability.cannot('update', subject('Payment', existing))) {
      throw new ForbiddenException('Sem permissão para editar este pagamento.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Somente pagamentos pendentes podem ser editados.')
    }

    const [updated] = await this.db
      .update(payments)
      .set({ notes: dto.notes ?? null, updatedAt: new Date() })
      .where(and(eq(payments.id, id), eq(payments.companyId, user.companyId!)))
      .returning()

    return updated
  }

  // ─── cancel ───────────────────────────────────────────────────────────────

  async cancel(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(payments)
      .where(
        and(eq(payments.id, id), eq(payments.companyId, user.companyId!)),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Pagamento não encontrado.')
    if (ability.cannot('update', subject('Payment', existing))) {
      throw new ForbiddenException('Sem permissão para cancelar este pagamento.')
    }
    if (existing.status !== 'PENDING') {
      throw new BadRequestException('Somente pagamentos pendentes podem ser cancelados.')
    }

    // Verificar se alguma parcela já foi paga
    const paidInstallments = await this.db
      .select({ id: paymentInstallments.id })
      .from(paymentInstallments)
      .where(
        and(
          eq(paymentInstallments.paymentId, id),
          eq(paymentInstallments.status, 'PAID'),
        ),
      )
      .limit(1)

    if (paidInstallments.length > 0) {
      throw new BadRequestException(
        'Não é possível cancelar um pagamento com parcelas já pagas.',
      )
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(payments)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(and(eq(payments.id, id), eq(payments.companyId, user.companyId!)))
        .returning()

      if (!updated) throw new NotFoundException('Pagamento não encontrado.')

      // Cancelar todas as parcelas
      await tx
        .update(paymentInstallments)
        .set({ status: 'PENDING', updatedAt: new Date() })
        .where(eq(paymentInstallments.paymentId, id))

      await tx.insert(auditLogs).values({
        entity: 'Payment', entityId: id, action: 'CANCEL',
        before: { status: 'PENDING' },
        after: { status: 'CANCELLED' },
        userId: user.id, companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── payInstallment ───────────────────────────────────────────────────────

  async payInstallment(
    paymentId: string,
    installmentId: string,
    dto: PayInstallmentDto,
    user: SessionUser,
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('update', 'Payment')) {
      throw new ForbiddenException('Sem permissão.')
    }

    // Verificar que o pagamento pertence à empresa e está PENDING
    const [payment] = await this.db
      .select({ id: payments.id, status: payments.status })
      .from(payments)
      .where(
        and(eq(payments.id, paymentId), eq(payments.companyId, user.companyId!)),
      )
      .limit(1)

    if (!payment) throw new NotFoundException('Pagamento não encontrado.')
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Somente pagamentos pendentes aceitam pagamento de parcelas.')
    }

    return this.db.transaction(async (tx) => {
      const paidAt = dto.paidAt ? new Date(dto.paidAt) : new Date()

      const [updated] = await tx
        .update(paymentInstallments)
        .set({ status: 'PAID', paidAt, updatedAt: new Date() })
        .where(
          and(
            eq(paymentInstallments.id, installmentId),
            eq(paymentInstallments.paymentId, paymentId),
            eq(paymentInstallments.status, 'PENDING'),
          ),
        )
        .returning()

      if (!updated) {
        throw new BadRequestException('Parcela não encontrada ou já paga.')
      }

      await tx.insert(auditLogs).values({
        entity: 'PaymentInstallment', entityId: installmentId, action: 'PAY',
        before: { status: 'PENDING' },
        after: { status: 'PAID', paidAt: paidAt.toISOString() },
        userId: user.id, companyId: user.companyId,
      })

      // Verificar se todas as parcelas estão pagas → auto-completar pagamento
      const pendingInstallments = await tx
        .select({ id: paymentInstallments.id })
        .from(paymentInstallments)
        .where(
          and(
            eq(paymentInstallments.paymentId, paymentId),
            eq(paymentInstallments.status, 'PENDING'),
          ),
        )
        .limit(1)

      if (pendingInstallments.length === 0) {
        // Todas pagas → marcar pagamento como PAID
        await tx
          .update(payments)
          .set({ status: 'PAID', paidAt: new Date(), updatedAt: new Date() })
          .where(eq(payments.id, paymentId))

        await tx.insert(auditLogs).values({
          entity: 'Payment', entityId: paymentId, action: 'COMPLETE',
          before: { status: 'PENDING' },
          after: { status: 'PAID' },
          userId: user.id, companyId: user.companyId,
        })
      }

      return updated
    })
  }
}
```

---

### 3. `payments.controller.ts`

```typescript
import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import {
  createPaymentSchema, updatePaymentSchema, payInstallmentSchema,
  type CreatePaymentDto, type UpdatePaymentDto, type PayInstallmentDto,
} from '@elos/shared'
import { PaymentsService } from './payments.service'

@ApiTags('payments')
@ApiCookieAuth()
@Controller('companies/:cnpj/payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pagamentos' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status')    status?: string,
    @Query('method')    method?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('search')    search?: string,
    @Query('page')      page?: string,
    @Query('limit')     limit?: string,
  ) {
    return this.paymentsService.findAll(user, {
      status, method, invoiceId, search, page, limit,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar pagamento com parcelas' })
  @ApiResponse({ status: 201, description: 'Pagamento criado.' })
  @ApiResponse({ status: 400, description: 'NF não validada.' })
  @ApiResponse({ status: 409, description: 'Já existe pagamento para esta NF.' })
  create(
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.paymentsService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do pagamento com parcelas' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.paymentsService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar notas (apenas PENDING)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePaymentSchema)) body: UpdatePaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.paymentsService.update(id, body, user)
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pagamento (PENDING, sem parcelas pagas)' })
  cancel(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.paymentsService.cancel(id, user)
  }

  @Post(':id/installments/:installmentId/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar parcela como paga' })
  payInstallment(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body(new ZodValidationPipe(payInstallmentSchema)) body: PayInstallmentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.paymentsService.payInstallment(id, installmentId, body, user)
  }
}
```

---

### 4. `payments.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'

@Module({
  imports:     [AbilityModule],
  controllers: [PaymentsController],
  providers:   [PaymentsService],
  exports:     [PaymentsService],
})
export class PaymentsModule {}
```

---

### 5. Testes

**Service spec (~14 testes):**
- `create`: cria pagamento com sucesso; 403 sem permissão; 404 NF não encontrada; 400 NF não VALIDATED; 409 pagamento duplicado
- `update`: 400 se não PENDING; 403 sem permissão; 404 não encontrado
- `cancel`: cancela com sucesso; 400 se não PENDING; 400 se parcela já paga
- `payInstallment`: marca parcela como paga; auto-completa pagamento quando última parcela; 400 parcela já paga

**Controller spec (~6 testes):**
- GET / — lista pagamentos
- POST / — cria pagamento
- GET /:id — detalhe
- PATCH /:id — atualiza
- POST /:id/cancel — cancela
- POST /:id/installments/:instId/pay — paga parcela

---

## Checklist de Verificação

```bash
# Testes
pnpm vitest run   # espera ≥ 250 testes

# TypeScript
pnpm type-check

# Lint
pnpm --filter api lint

# Segurança (manual)
# [ ] CASL verifica antes de cada operação
# [ ] Queries escopadas a companyId
# [ ] 403 COMPRADOR tentando criar pagamento
# [ ] 400 NF fora de VALIDATED
# [ ] 409 pagamento duplicado por NF
# [ ] 400 cancelar com parcela paga
# [ ] Auto-completar PENDING → PAID quando última parcela é paga
# [ ] Audit log em create/cancel/payInstallment/complete
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| 1 pagamento por NF (dedup por `invoiceId`) | Simplifica o fluxo de conciliação na v1; renegociação de pagamento ficaria como novo pagamento após cancelar o anterior |
| Auto-completar pagamento | Quando a última parcela é paga, o pagamento transiciona automaticamente para PAID; evita ação manual redundante |
| Cancelamento bloqueado por parcela paga | Evita inconsistência financeira; para cancelar um pagamento parcialmente pago, seria necessário estorno (fora do escopo v1) |
| `OVERDUE` não é atualizado automaticamente | v1 não tem job/cron; o frontend calcula visualmente (dueDate < now && status === 'PENDING'); atualização automática fica para v2 |
| `cancel` não reatribui parcelas | Parcelas mantêm status `PENDING` (não `CANCELLED`) — simplifica; o pagamento é o que carrega o status `CANCELLED` |
