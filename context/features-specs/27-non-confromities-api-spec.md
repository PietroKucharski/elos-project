# Feature Spec — 5.4 Non-Conformities API (NestJS)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 5 — Recebimento e Estoque  
**Unidade:** 5.4  
**Pré-requisito:** 5.3 concluído; 5.1 concluído (schemas `CreateNonConformityDto`, etc.)  
**Commit convencional esperado:** `feat(api): add non-conformities module with status flow and comments`

---

## Objetivo

Criar o módulo NestJS `NonConformitiesModule` para abertura, gestão e resolução
de não-conformidades (NCs). Uma NC pode ser aberta após um recebimento com
problema (ou manualmente) e segue o fluxo:

```
OPEN → ANALYZING → RESOLVED
                 ↘ REJECTED
```

Inclui sub-recurso de comentários (adição apenas — sem edição/exclusão de
comentário na v1). Sem upload real de anexos na v1: o campo `nc_attachments`
está no banco mas o endpoint de anexo é deixado para a Fase 6 (Financeiro tem
Supabase Storage configurado).

---

## Decisões de Negócio

| Regra | Comportamento |
| ----- | ------------- |
| Quem abre | ALMOXARIFE e COMPRADOR (e ADMIN_EMPRESA, SUPER_ADMIN) |
| Quem analisa/resolve | ADMIN_EMPRESA e COMPRADOR (não ALMOXARIFE — ALMOXARIFE cria, outros resolvem) |
| Edição | Apenas em status `OPEN` — tipo, severidade, descrição, notas |
| Analisar (`analyze`) | `OPEN → ANALYZING` |
| Resolver (`resolve`) | `ANALYZING → RESOLVED`; requer campo `resolution` (mínimo 10 chars) |
| Rejeitar (`reject`) | `ANALYZING → REJECTED`; requer campo `resolution` (motivo da rejeição) |
| Exclusão | Não existe — NCs são imutáveis como audit trail |
| Comentários | Qualquer membro autenticado da empresa pode comentar; sem edição/exclusão na v1 |
| `purchaseOrderId` opcional | NC pode ser aberta sem PO (inspeção de qualidade genérica) |
| `productId` opcional | NC pode ser aberta sem produto específico |

---

## Escopo

### In

- `apps/api/src/modules/non-conformities/non-conformities.module.ts`
- `apps/api/src/modules/non-conformities/non-conformities.controller.ts`
- `apps/api/src/modules/non-conformities/non-conformities.controller.spec.ts`
- `apps/api/src/modules/non-conformities/non-conformities.service.ts`
- `apps/api/src/modules/non-conformities/non-conformities.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `NonConformity`
- Modificação em `apps/api/src/app.module.ts` — importar `NonConformitiesModule`

### Out

- Upload de anexos (→ Fase 6)
- UI (→ 5.7)

---

## Rotas

| Método | Caminho | Papel mínimo | Descrição |
| ------ | ------- | ------------ | --------- |
| GET | `/v1/companies/:cnpj/non-conformities` | Autenticado | Lista NCs com filtros |
| POST | `/v1/companies/:cnpj/non-conformities` | `ALMOXARIFE` | Abre NC |
| GET | `/v1/companies/:cnpj/non-conformities/:id` | Autenticado | Detalhe com comentários |
| PATCH | `/v1/companies/:cnpj/non-conformities/:id` | `ALMOXARIFE` | Atualiza (apenas OPEN) |
| POST | `/v1/companies/:cnpj/non-conformities/:id/analyze` | `COMPRADOR` | OPEN → ANALYZING |
| POST | `/v1/companies/:cnpj/non-conformities/:id/resolve` | `COMPRADOR` | ANALYZING → RESOLVED |
| POST | `/v1/companies/:cnpj/non-conformities/:id/reject` | `COMPRADOR` | ANALYZING → REJECTED |
| POST | `/v1/companies/:cnpj/non-conformities/:id/comments` | Autenticado | Adiciona comentário |

> **Query params em GET /non-conformities:** `status` (OPEN|ANALYZING|RESOLVED|REJECTED),
> `type` (QUALITY|QUANTITY|DELIVERY|DOCUMENTATION|OTHER), `severity` (LOW|MEDIUM|HIGH|CRITICAL),
> `supplierId` (uuid), `purchaseOrderId` (uuid), `search` (substring da descrição),
> `page` (default 1), `limit` (default 20, max 100).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    non-conformities/
      non-conformities.module.ts           ← criar
      non-conformities.controller.ts       ← criar
      non-conformities.controller.spec.ts  ← criar
      non-conformities.service.ts          ← criar
      non-conformities.service.spec.ts     ← criar
  common/
    ability/
      ability.factory.ts                   ← modificar (regras NonConformity)
  app.module.ts                            ← modificar (importar NonConformitiesModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `NonConformity`

```typescript
// Adicionar ao union Subjects:
//   'NonConformity' | (NonConformity & ForcedSubject<'NonConformity'>)

case 'SUPER_ADMIN':
  can('manage', 'all')
  break

case 'ADMIN_EMPRESA':
  // regras já existentes ...
  can('manage', 'NonConformity', { companyId })
  break

case 'COMPRADOR':
  // regras já existentes ...
  can('read',   'NonConformity', { companyId })
  can('update', 'NonConformity', { companyId }) // analyze/resolve/reject usam 'update'
  break

case 'ALMOXARIFE':
  // regras já existentes ...
  can('read',   'NonConformity', { companyId })
  can('create', 'NonConformity', { companyId })
  can('update', 'NonConformity', { companyId }) // edição em OPEN
  break

case 'ANALISTA_FINANCEIRO':
  // regras já existentes ...
  can('read', 'NonConformity', { companyId })
  break

case 'TRANSPORTADOR':
  // regras já existentes ...
  can('read', 'NonConformity', { companyId })
  break
```

> **Nota:** `analyze`/`resolve`/`reject` usam a action `'update'` — não ações
> customizadas — porque a semântica é "atualizar o status", e COMPRADOR +
> ADMIN_EMPRESA já têm `update`. Não há diferenciação adicional de permissão
> entre essas transições na v1.

---

### 2. `non-conformities.service.ts`

```typescript
import {
  BadRequestException,
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
import { products } from '../../db/schema/products'
import { purchaseOrders } from '../../db/schema/purchase-orders'
import { suppliers } from '../../db/schema/suppliers'
import { ncComments, nonConformities } from '../../db/schema/non-conformities'
import type {
  AddNcCommentDto,
  AnalyzeNcDto,
  CreateNonConformityDto,
  RejectNcDto,
  ResolveNcDto,
  UpdateNonConformityDto,
} from '@elos/shared'

@Injectable()
export class NonConformitiesService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ──────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: {
      status?:          string | undefined
      type?:            string | undefined
      severity?:        string | undefined
      supplierId?:      string | undefined
      purchaseOrderId?: string | undefined
      search?:          string | undefined
      page?:            string | undefined
      limit?:           string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'NonConformity')) {
      throw new ForbiddenException('Sem permissão para listar não-conformidades.')
    }

    const page   = Math.max(1, Number.isFinite(Number.parseInt(query.page ?? '1', 10)) ? Number.parseInt(query.page ?? '1', 10) : 1)
    const limit  = Math.min(100, Math.max(1, Number.isFinite(Number.parseInt(query.limit ?? '20', 10)) ? Number.parseInt(query.limit ?? '20', 10) : 20))
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(nonConformities.companyId, user.companyId!)]
    if (query.status)          conditions.push(eq(nonConformities.status, query.status as 'OPEN'))
    if (query.type)            conditions.push(eq(nonConformities.type, query.type as 'QUALITY'))
    if (query.severity)        conditions.push(eq(nonConformities.severity, query.severity as 'LOW'))
    if (query.supplierId)      conditions.push(eq(nonConformities.supplierId, query.supplierId))
    if (query.purchaseOrderId) conditions.push(eq(nonConformities.purchaseOrderId, query.purchaseOrderId))
    if (query.search)          conditions.push(ilike(nonConformities.description, `%${query.search}%`))

    return this.db
      .select({
        id:                 nonConformities.id,
        companyId:          nonConformities.companyId,
        purchaseOrderId:    nonConformities.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        supplierId:         nonConformities.supplierId,
        supplierName:       suppliers.name,
        productId:          nonConformities.productId,
        productName:        products.name,
        type:               nonConformities.type,
        severity:           nonConformities.severity,
        description:        nonConformities.description,
        status:             nonConformities.status,
        resolution:         nonConformities.resolution,
        notes:              nonConformities.notes,
        resolvedAt:         nonConformities.resolvedAt,
        createdById:        nonConformities.createdById,
        createdByName:      users.name,
        createdAt:          nonConformities.createdAt,
        updatedAt:          nonConformities.updatedAt,
      })
      .from(nonConformities)
      .innerJoin(suppliers, eq(suppliers.id, nonConformities.supplierId))
      .leftJoin(purchaseOrders, eq(purchaseOrders.id, nonConformities.purchaseOrderId))
      .leftJoin(products, eq(products.id, nonConformities.productId))
      .innerJoin(users, eq(users.id, nonConformities.createdById))
      .where(and(...conditions))
      .orderBy(desc(nonConformities.createdAt))
      .limit(limit)
      .offset(offset)
  }

  // ─── findOne ──────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'NonConformity')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [nc] = await this.db
      .select({
        id:                 nonConformities.id,
        companyId:          nonConformities.companyId,
        purchaseOrderId:    nonConformities.purchaseOrderId,
        purchaseOrderNumber: purchaseOrders.number,
        supplierId:         nonConformities.supplierId,
        supplierName:       suppliers.name,
        productId:          nonConformities.productId,
        productName:        products.name,
        type:               nonConformities.type,
        severity:           nonConformities.severity,
        description:        nonConformities.description,
        status:             nonConformities.status,
        resolution:         nonConformities.resolution,
        notes:              nonConformities.notes,
        resolvedAt:         nonConformities.resolvedAt,
        createdById:        nonConformities.createdById,
        createdByName:      users.name,
        createdAt:          nonConformities.createdAt,
        updatedAt:          nonConformities.updatedAt,
      })
      .from(nonConformities)
      .innerJoin(suppliers, eq(suppliers.id, nonConformities.supplierId))
      .leftJoin(purchaseOrders, eq(purchaseOrders.id, nonConformities.purchaseOrderId))
      .leftJoin(products, eq(products.id, nonConformities.productId))
      .innerJoin(users, eq(users.id, nonConformities.createdById))
      .where(
        and(
          eq(nonConformities.id, id),
          eq(nonConformities.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!nc) throw new NotFoundException('Não-conformidade não encontrada.')

    const comments = await this.db
      .select({
        id:              ncComments.id,
        nonConformityId: ncComments.nonConformityId,
        userId:          ncComments.userId,
        userName:        users.name,
        text:            ncComments.text,
        createdAt:       ncComments.createdAt,
        updatedAt:       ncComments.updatedAt,
      })
      .from(ncComments)
      .innerJoin(users, eq(users.id, ncComments.userId))
      .where(eq(ncComments.nonConformityId, id))
      .orderBy(ncComments.createdAt)

    return { ...nc, comments }
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateNonConformityDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'NonConformity')) {
      throw new ForbiddenException('Sem permissão para abrir não-conformidade.')
    }

    // Validar fornecedor (deve pertencer à empresa)
    const [supplier] = await this.db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.id, dto.supplierId),
          eq(suppliers.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.')

    // Validar PO (opcional — se informado, deve pertencer à empresa)
    if (dto.purchaseOrderId) {
      const [po] = await this.db
        .select({ id: purchaseOrders.id })
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, dto.purchaseOrderId),
            eq(purchaseOrders.companyId, user.companyId!),
          ),
        )
        .limit(1)

      if (!po) throw new NotFoundException('Pedido de compra não encontrado.')
    }

    return this.db.transaction(async (tx) => {
      const [nc] = await tx
        .insert(nonConformities)
        .values({
          companyId:       user.companyId!,
          purchaseOrderId: dto.purchaseOrderId ?? null,
          supplierId:      dto.supplierId,
          productId:       dto.productId ?? null,
          type:            dto.type,
          severity:        dto.severity,
          description:     dto.description,
          notes:           dto.notes ?? null,
          status:          'OPEN',
          createdById:     user.id,
        })
        .returning()

      if (!nc) throw new Error('Falha ao criar não-conformidade.')

      await tx.insert(auditLogs).values({
        entity:    'NonConformity',
        entityId:  nc.id,
        action:    'CREATE',
        after: {
          type:      dto.type,
          severity:  dto.severity,
          status:    'OPEN',
          supplierId: dto.supplierId,
        },
        userId:    user.id,
        companyId: user.companyId,
      })

      return nc
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateNonConformityDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(nonConformities)
      .where(
        and(
          eq(nonConformities.id, id),
          eq(nonConformities.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Não-conformidade não encontrada.')
    if (ability.cannot('update', subject('NonConformity', existing))) {
      throw new ForbiddenException('Sem permissão para editar esta não-conformidade.')
    }
    if (existing.status !== 'OPEN') {
      throw new BadRequestException(
        'Somente não-conformidades abertas (OPEN) podem ser editadas.',
      )
    }

    return this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.type        !== undefined) updateData.type        = dto.type
      if (dto.severity    !== undefined) updateData.severity    = dto.severity
      if (dto.description !== undefined) updateData.description = dto.description
      if (dto.notes       !== undefined) updateData.notes       = dto.notes

      const [updated] = await tx
        .update(nonConformities)
        .set(updateData)
        .where(
          and(
            eq(nonConformities.id, id),
            eq(nonConformities.companyId, user.companyId!),
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Não-conformidade não encontrada.')

      await tx.insert(auditLogs).values({
        entity:    'NonConformity',
        entityId:  id,
        action:    'UPDATE',
        before: {
          type: existing.type, severity: existing.severity, description: existing.description,
        },
        after:     updateData,
        userId:    user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── analyze ──────────────────────────────────────────────────────────────

  async analyze(id: string, dto: AnalyzeNcDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(nonConformities)
      .where(
        and(
          eq(nonConformities.id, id),
          eq(nonConformities.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Não-conformidade não encontrada.')
    if (ability.cannot('update', subject('NonConformity', existing))) {
      throw new ForbiddenException('Sem permissão para analisar esta não-conformidade.')
    }
    if (existing.status !== 'OPEN') {
      throw new BadRequestException(
        `Apenas NCs abertas podem ser enviadas para análise. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status:    'ANALYZING',
        updatedAt: new Date(),
      }
      if (dto.notes) updateData.notes = dto.notes

      const [updated] = await tx
        .update(nonConformities)
        .set(updateData)
        .where(
          and(
            eq(nonConformities.id, id),
            eq(nonConformities.companyId, user.companyId!),
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Não-conformidade não encontrada.')

      await tx.insert(auditLogs).values({
        entity:    'NonConformity',
        entityId:  id,
        action:    'ANALYZE',
        before:    { status: 'OPEN' },
        after:     { status: 'ANALYZING' },
        userId:    user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── resolve ──────────────────────────────────────────────────────────────

  async resolve(id: string, dto: ResolveNcDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(nonConformities)
      .where(
        and(
          eq(nonConformities.id, id),
          eq(nonConformities.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Não-conformidade não encontrada.')
    if (ability.cannot('update', subject('NonConformity', existing))) {
      throw new ForbiddenException('Sem permissão para resolver esta não-conformidade.')
    }
    if (existing.status !== 'ANALYZING') {
      throw new BadRequestException(
        `Apenas NCs em análise podem ser resolvidas. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(nonConformities)
        .set({
          status:     'RESOLVED',
          resolution: dto.resolution,
          resolvedAt: now,
          updatedAt:  now,
        })
        .where(
          and(
            eq(nonConformities.id, id),
            eq(nonConformities.companyId, user.companyId!),
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Não-conformidade não encontrada.')

      await tx.insert(auditLogs).values({
        entity:    'NonConformity',
        entityId:  id,
        action:    'RESOLVE',
        before:    { status: 'ANALYZING' },
        after:     { status: 'RESOLVED', resolution: dto.resolution },
        userId:    user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── reject ───────────────────────────────────────────────────────────────

  async reject(id: string, dto: RejectNcDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(nonConformities)
      .where(
        and(
          eq(nonConformities.id, id),
          eq(nonConformities.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Não-conformidade não encontrada.')
    if (ability.cannot('update', subject('NonConformity', existing))) {
      throw new ForbiddenException('Sem permissão para rejeitar esta não-conformidade.')
    }
    if (existing.status !== 'ANALYZING') {
      throw new BadRequestException(
        `Apenas NCs em análise podem ser rejeitadas. Status atual: ${existing.status}.`,
      )
    }

    return this.db.transaction(async (tx) => {
      const now = new Date()
      const [updated] = await tx
        .update(nonConformities)
        .set({
          status:     'REJECTED',
          resolution: dto.resolution,
          resolvedAt: now,
          updatedAt:  now,
        })
        .where(
          and(
            eq(nonConformities.id, id),
            eq(nonConformities.companyId, user.companyId!),
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Não-conformidade não encontrada.')

      await tx.insert(auditLogs).values({
        entity:    'NonConformity',
        entityId:  id,
        action:    'REJECT',
        before:    { status: 'ANALYZING' },
        after:     { status: 'REJECTED', resolution: dto.resolution },
        userId:    user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── addComment ───────────────────────────────────────────────────────────

  async addComment(id: string, dto: AddNcCommentDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'NonConformity')) {
      throw new ForbiddenException('Sem permissão para comentar.')
    }

    // Verificar que a NC pertence à empresa
    const [nc] = await this.db
      .select({ id: nonConformities.id })
      .from(nonConformities)
      .where(
        and(
          eq(nonConformities.id, id),
          eq(nonConformities.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!nc) throw new NotFoundException('Não-conformidade não encontrada.')

    const [comment] = await this.db
      .insert(ncComments)
      .values({
        nonConformityId: id,
        userId:          user.id,
        text:            dto.text,
      })
      .returning()

    return comment
  }
}
```

---

### 3. `non-conformities.controller.ts`

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
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import {
  addNcCommentSchema,
  analyzeNcSchema,
  createNonConformitySchema,
  rejectNcSchema,
  resolveNcSchema,
  updateNonConformitySchema,
  type AddNcCommentDto,
  type AnalyzeNcDto,
  type CreateNonConformityDto,
  type RejectNcDto,
  type ResolveNcDto,
  type UpdateNonConformityDto,
} from '@elos/shared'
import { NonConformitiesService } from './non-conformities.service'

@ApiTags('non-conformities')
@ApiCookieAuth()
@Controller('companies/:cnpj/non-conformities')
@UseGuards(AuthGuard)
export class NonConformitiesController {
  constructor(private readonly ncService: NonConformitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar não-conformidades' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status')          status?: string,
    @Query('type')            type?: string,
    @Query('severity')        severity?: string,
    @Query('supplierId')      supplierId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('search')          search?: string,
    @Query('page')            page?: string,
    @Query('limit')           limit?: string,
  ) {
    return this.ncService.findAll(user, {
      status, type, severity, supplierId, purchaseOrderId, search, page, limit,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir não-conformidade' })
  @ApiResponse({ status: 201, description: 'NC aberta.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Fornecedor ou PO não encontrado.' })
  create(
    @Body(new ZodValidationPipe(createNonConformitySchema)) body: CreateNonConformityDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da NC com comentários' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.ncService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar NC (apenas OPEN)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateNonConformitySchema)) body: UpdateNonConformityDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.update(id, body, user)
  }

  @Post(':id/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar análise da NC (OPEN → ANALYZING)' })
  analyze(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(analyzeNcSchema)) body: AnalyzeNcDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.analyze(id, body, user)
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolver NC (ANALYZING → RESOLVED)' })
  @ApiResponse({ status: 400, description: 'NC não está em ANALYZING.' })
  resolve(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resolveNcSchema)) body: ResolveNcDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.resolve(id, body, user)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeitar NC (ANALYZING → REJECTED)' })
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectNcSchema)) body: RejectNcDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.reject(id, body, user)
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar comentário à NC' })
  addComment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addNcCommentSchema)) body: AddNcCommentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.addComment(id, body, user)
  }
}
```

---

### 4. `non-conformities.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { NonConformitiesController } from './non-conformities.controller'
import { NonConformitiesService } from './non-conformities.service'

@Module({
  imports:     [AbilityModule],
  controllers: [NonConformitiesController],
  providers:   [NonConformitiesService],
  exports:     [NonConformitiesService],
})
export class NonConformitiesModule {}
```

---

### 5. `non-conformities.service.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { NonConformitiesService } from './non-conformities.service'
import { DRIZZLE } from '../../db.module'
import { AbilityFactory } from '../../common/ability/ability.factory'

const companyId  = '00000000-0000-0000-0000-000000000001'
const ncId       = '00000000-0000-0000-0000-000000000002'
const supplierId = '00000000-0000-0000-0000-000000000003'
const userId     = 'user-001'

const mockNc = {
  id: ncId, companyId, supplierId, status: 'OPEN',
  type: 'QUALITY', severity: 'HIGH', description: 'Produto com defeito na embalagem',
  resolution: null, resolvedAt: null, notes: null, createdById: userId,
  createdAt: new Date(), updatedAt: new Date(),
}

const mockUser = { id: userId, email: 'almox@test.com', name: 'Almox', role: 'ALMOXARIFE', companyId } as any
const mockComprador = { ...mockUser, role: 'COMPRADOR' }

function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueue = (result: unknown) => resultsQueue.push([result])

  const qb: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(), leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(), offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(), values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select: () => qb, insert: () => qb, update: () => qb,
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }
  return { mockDb, enqueue }
}

describe('NonConformitiesService', () => {
  let service: NonConformitiesService
  let mockDb: ReturnType<typeof makeDb>['mockDb']
  let enqueue: ReturnType<typeof makeDb>['enqueue']
  const mockAbility        = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    mockDb = db; enqueue = eq
    const module = await Test.createTestingModule({
      providers: [
        NonConformitiesService,
        { provide: DRIZZLE,         useValue: mockDb },
        { provide: AbilityFactory,  useValue: mockAbilityFactory },
      ],
    }).compile()
    service = module.get(NonConformitiesService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('create', () => {
    const dto = { supplierId, type: 'QUALITY' as const, severity: 'HIGH' as const, description: 'Produto com defeito na embalagem' }

    it('cria NC com sucesso', async () => {
      enqueue({ id: supplierId })  // supplier
      enqueue(mockNc)              // insert returning
      const result = await service.create(dto, mockUser)
      expect(result).toMatchObject({ status: 'OPEN' })
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create(dto, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se fornecedor não encontrado', async () => {
      enqueue(undefined)
      await expect(service.create(dto, mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('update', () => {
    it('retorna 400 se NC não está OPEN', async () => {
      enqueue({ ...mockNc, status: 'ANALYZING' })
      await expect(service.update(ncId, { severity: 'LOW' as const }, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 403 sem permissão', async () => {
      enqueue(mockNc)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.update(ncId, {}, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 404 se não encontrada', async () => {
      enqueue(undefined)
      await expect(service.update('nonexistent', {}, mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('analyze', () => {
    it('transição OPEN → ANALYZING', async () => {
      enqueue(mockNc)                                // existing OPEN
      enqueue({ ...mockNc, status: 'ANALYZING' })   // update returning
      const result = await service.analyze(ncId, {}, mockComprador)
      expect(result.status).toBe('ANALYZING')
    })

    it('retorna 400 se NC não está OPEN', async () => {
      enqueue({ ...mockNc, status: 'ANALYZING' })
      await expect(service.analyze(ncId, {}, mockComprador)).rejects.toThrow(BadRequestException)
    })

    it('retorna 403 sem permissão', async () => {
      enqueue(mockNc)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.analyze(ncId, {}, mockUser)).rejects.toThrow(ForbiddenException)
    })
  })

  describe('resolve', () => {
    const analyzing = { ...mockNc, status: 'ANALYZING' }

    it('transição ANALYZING → RESOLVED', async () => {
      enqueue(analyzing)
      enqueue({ ...analyzing, status: 'RESOLVED' })
      const result = await service.resolve(ncId, { resolution: 'Produto devolvido ao fornecedor.' }, mockComprador)
      expect(result.status).toBe('RESOLVED')
    })

    it('retorna 400 se NC não está ANALYZING', async () => {
      enqueue(mockNc) // OPEN
      await expect(service.resolve(ncId, { resolution: 'OK' }, mockComprador)).rejects.toThrow(BadRequestException)
    })
  })

  describe('reject', () => {
    it('retorna 400 se NC não está ANALYZING', async () => {
      enqueue(mockNc) // OPEN
      await expect(service.reject(ncId, { resolution: 'Sem fundamento.' }, mockComprador)).rejects.toThrow(BadRequestException)
    })
  })

  describe('addComment', () => {
    it('adiciona comentário à NC', async () => {
      enqueue({ id: ncId })                         // NC encontrada
      enqueue({ id: 'cmt-1', text: 'Verificado.' }) // insert returning
      const result = await service.addComment(ncId, { text: 'Verificado.' }, mockUser)
      expect(result).toMatchObject({ text: 'Verificado.' })
    })

    it('retorna 404 se NC não encontrada', async () => {
      enqueue(undefined)
      await expect(service.addComment('nonexistent', { text: 'X' }, mockUser)).rejects.toThrow(NotFoundException)
    })
  })
})
```

---

### 6. `non-conformities.controller.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import { NonConformitiesController } from './non-conformities.controller'
import { NonConformitiesService } from './non-conformities.service'
import { AuthGuard } from '../../common/guards/auth.guard'

describe('NonConformitiesController', () => {
  let controller: NonConformitiesController
  const mockUser = { id: 'u1', role: 'ALMOXARIFE', companyId: 'c1' } as any
  const mockNc   = { id: 'nc1', status: 'OPEN' }

  const mockService = {
    findAll:    vi.fn().mockResolvedValue([mockNc]),
    findOne:    vi.fn().mockResolvedValue({ ...mockNc, comments: [] }),
    create:     vi.fn().mockResolvedValue(mockNc),
    update:     vi.fn().mockResolvedValue(mockNc),
    analyze:    vi.fn().mockResolvedValue({ ...mockNc, status: 'ANALYZING' }),
    resolve:    vi.fn().mockResolvedValue({ ...mockNc, status: 'RESOLVED' }),
    reject:     vi.fn().mockResolvedValue({ ...mockNc, status: 'REJECTED' }),
    addComment: vi.fn().mockResolvedValue({ id: 'cmt1', text: 'OK' }),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [NonConformitiesController],
      providers:   [{ provide: NonConformitiesService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(NonConformitiesController)
  })

  it('GET / — lista NCs',     async () => expect(await controller.findAll(mockUser)).toEqual([mockNc]))
  it('POST / — abre NC',      async () => {
    const dto = { supplierId: 's1', type: 'QUALITY' as const, severity: 'HIGH' as const, description: 'Problema na embalagem' }
    expect(await controller.create(dto, mockUser)).toMatchObject({ id: 'nc1' })
  })
  it('GET /:id — detalhe',    async () => expect(await controller.findOne('nc1', mockUser)).toMatchObject({ comments: [] }))
  it('POST /:id/analyze',     async () => expect(await controller.analyze('nc1', {}, mockUser)).toMatchObject({ status: 'ANALYZING' }))
  it('POST /:id/resolve',     async () => expect(await controller.resolve('nc1', { resolution: 'OK resolvido' }, mockUser)).toMatchObject({ status: 'RESOLVED' }))
  it('POST /:id/reject',      async () => expect(await controller.reject('nc1', { resolution: 'Sem fundamento' }, mockUser)).toMatchObject({ status: 'REJECTED' }))
  it('POST /:id/comments',    async () => expect(await controller.addComment('nc1', { text: 'Comentário' }, mockUser)).toMatchObject({ id: 'cmt1' }))
})
```

---

### 7. Modificar `app.module.ts`

```typescript
import { NonConformitiesModule } from './modules/non-conformities/non-conformities.module'
// No array @Module({ imports: [...] }):
NonConformitiesModule,
```

---

## Checklist de Verificação

```bash
# Testes
pnpm vitest run   # espera ≥ 215 testes (185 anteriores + ~30 novos)

# TypeScript
pnpm type-check

# Lint
pnpm --filter api lint

# Segurança (manual)
# [ ] CASL verifica antes de cada operação
# [ ] Queries escopadas a companyId
# [ ] 403 ALMOXARIFE tentando resolver/rejeitar (apenas 'update' CASL, mas COMPRADOR/ADMIN têm permissão)
# [ ] 400 em transições inválidas (OPEN→RESOLVED direto → deve ir por ANALYZING)
# [ ] Audit log em create/update/analyze/resolve/reject
# [ ] Comentário verifica que a NC pertence à empresa antes de inserir
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| `analyze`/`resolve`/`reject` usam action `'update'` no CASL | Não há diferenciação de permissão entre as três transições na v1; todos que podem `'update'` podem realizar qualquer transição válida; menos ações customizadas no union |
| ALMOXARIFE cria, COMPRADOR resolve | Separação de responsabilidade: almoxarife detecta o problema no recebimento; comprador (ou admin) tem visão do impacto financeiro e decide o tratamento |
| `resolvedAt` preenchido em `resolve` e `reject` | Ambos os estados finais marcam a data de encerramento; o campo nome indica "data de encerramento", não exclusivamente "resolvido positivamente" |
| Sem exclusão de comentários na v1 | Comentários são parte do audit trail da NC; edição/exclusão adicionam complexidade sem valor claro para v1 |
| `ncComments` sem `companyId` FK | Comentários herdam o escopo de empresa via `nonConformityId`; adicionar `companyId` seria redundante. O `addComment` verifica a NC antes de inserir |
| Upload de anexos fora do escopo | A tabela `nc_attachments` existe no banco (0.3), mas os endpoints de upload dependem de Supabase Storage, configurado na Fase 6 |
