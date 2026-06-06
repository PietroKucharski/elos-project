# Feature Spec — 5.2 Warehouses API (NestJS)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 5 — Recebimento e Estoque  
**Unidade:** 5.2  
**Pré-requisito:** 5.1 concluído (schemas `CreateWarehouseDto`, `WarehouseResponse`, etc.)  
**Commit convencional esperado:** `feat(api): add warehouses module with crud and inventory view`

---

## Objetivo

Criar o módulo NestJS `WarehousesModule` com CRUD de armazéns e listagem de
inventário (saldo de estoque por produto/armazém). O módulo é exportado para
uso pelo `ReceiptsModule` (5.3) e pelo `StockMovementsModule` (interno ao 5.3),
que precisam validar que o armazém pertence à empresa antes de registrar
movimentações.

---

## Decisões de Negócio

| Regra | Comportamento |
| ----- | ------------- |
| Exclusão de armazém | Soft delete (`isActive = false`) — armazéns com estoque ou movimentações históricas não podem ser deletados (400); armazéns vazios podem ser desativados |
| Inventário | Leitura do saldo atual da tabela `inventory` (upsert feito pelo `ReceiptsService`); filtros por produto e armazém |
| Código do armazém | Opcional; se informado, deve ser único por empresa |
| Quem gerencia | ALMOXARIFE e ADMIN_EMPRESA criam/editam/desativam armazéns; todos os papéis autenticados podem listar |

---

## Escopo

### In

- `apps/api/src/modules/warehouses/warehouses.module.ts`
- `apps/api/src/modules/warehouses/warehouses.controller.ts`
- `apps/api/src/modules/warehouses/warehouses.controller.spec.ts`
- `apps/api/src/modules/warehouses/warehouses.service.ts`
- `apps/api/src/modules/warehouses/warehouses.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `Warehouse`
- Modificação em `apps/api/src/app.module.ts` — importar `WarehousesModule`
- Migration de banco se necessário (código de armazém único por empresa)

### Out

- Movimentações manuais de estoque (→ 5.3, no mesmo módulo de recebimento ou como módulo separado interno)
- Recebimento de mercadoria (→ 5.3)
- UI (→ 5.5)

---

## Rotas

| Método | Caminho | Papel mínimo | Descrição |
| ------ | ------- | ------------ | --------- |
| GET | `/v1/companies/:cnpj/warehouses` | Autenticado | Lista armazéns ativos |
| POST | `/v1/companies/:cnpj/warehouses` | `ALMOXARIFE` | Cria armazém |
| GET | `/v1/companies/:cnpj/warehouses/:id` | Autenticado | Detalhe do armazém |
| PATCH | `/v1/companies/:cnpj/warehouses/:id` | `ALMOXARIFE` | Atualiza armazém |
| POST | `/v1/companies/:cnpj/warehouses/:id/deactivate` | `ALMOXARIFE` | Desativa armazém (soft delete) |
| GET | `/v1/companies/:cnpj/warehouses/:id/inventory` | Autenticado | Saldo de estoque do armazém |
| GET | `/v1/companies/:cnpj/warehouses/inventory` | Autenticado | Saldo de estoque global (todos os armazéns) |

> **Query params em GET /warehouses:** `includeInactive` (boolean string `'true'`).  
> **Query params em GET /warehouses/inventory e /warehouses/:id/inventory:** `productId` (uuid),
> `search` (substring do nome ou código do produto), `page` (default 1), `limit` (default 50, max 200).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    warehouses/
      warehouses.module.ts           ← criar
      warehouses.controller.ts       ← criar
      warehouses.controller.spec.ts  ← criar
      warehouses.service.ts          ← criar
      warehouses.service.spec.ts     ← criar
  common/
    ability/
      ability.factory.ts             ← modificar (regras Warehouse)
  app.module.ts                      ← modificar (importar WarehousesModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `Warehouse`

```typescript
// Adicionar ao union Subjects:
//   'Warehouse' | (Warehouse & ForcedSubject<'Warehouse'>)
// (seguindo padrão de PurchaseOrder em 4.2)

case 'SUPER_ADMIN':
  can('manage', 'all')
  break

case 'ADMIN_EMPRESA':
  // regras já existentes ...
  can('manage', 'Warehouse', { companyId })
  break

case 'COMPRADOR':
  // regras já existentes ...
  can('read', 'Warehouse', { companyId })
  break

case 'ALMOXARIFE':
  // regras já existentes ...
  can('manage', 'Warehouse', { companyId })
  break

case 'ANALISTA_FINANCEIRO':
  // regras já existentes ...
  can('read', 'Warehouse', { companyId })
  break

case 'TRANSPORTADOR':
  // regras já existentes ...
  can('read', 'Warehouse', { companyId })
  break
```

---

### 2. `warehouses.service.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { subject } from '@casl/ability'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { auditLogs } from '../../db/schema/audit-logs'
import { products } from '../../db/schema/products'
import { inventory, warehouses } from '../../db/schema/warehouses'
import type {
  CreateWarehouseDto,
  UpdateWarehouseDto,
} from '@elos/shared'

@Injectable()
export class WarehousesService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  // ─── findAll ─────────────────────────────────────────────────────────────

  async findAll(
    user: SessionUser,
    query: { includeInactive?: string | undefined },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Warehouse')) {
      throw new ForbiddenException('Sem permissão para listar armazéns.')
    }

    const includeInactive = query.includeInactive === 'true'

    const conditions = [eq(warehouses.companyId, user.companyId!)]
    if (!includeInactive) {
      conditions.push(eq(warehouses.isActive, true))
    }

    return this.db
      .select()
      .from(warehouses)
      .where(and(...conditions))
      .orderBy(warehouses.name)
  }

  // ─── findOne ─────────────────────────────────────────────────────────────

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Warehouse')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [warehouse] = await this.db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, id),
          eq(warehouses.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!warehouse) throw new NotFoundException('Armazém não encontrado.')
    return warehouse
  }

  // ─── create ───────────────────────────────────────────────────────────────

  async create(dto: CreateWarehouseDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Warehouse')) {
      throw new ForbiddenException('Sem permissão para criar armazém.')
    }

    // Verificar código duplicado (opcional)
    if (dto.code) {
      const [existing] = await this.db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(
          and(
            eq(warehouses.companyId, user.companyId!),
            eq(warehouses.code, dto.code),
          ),
        )
        .limit(1)

      if (existing) {
        throw new ConflictException(
          `Já existe um armazém com o código "${dto.code}".`,
        )
      }
    }

    return this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(warehouses)
        .values({
          companyId: user.companyId!,
          name:      dto.name,
          code:      dto.code ?? null,
          location:  dto.location ?? null,
        })
        .returning()

      if (!created) throw new Error('Falha ao criar armazém.')

      await tx.insert(auditLogs).values({
        entity:    'Warehouse',
        entityId:  created.id,
        action:    'CREATE',
        after:     { name: dto.name, code: dto.code },
        userId:    user.id,
        companyId: user.companyId,
      })

      return created
    })
  }

  // ─── update ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateWarehouseDto, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, id),
          eq(warehouses.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Armazém não encontrado.')
    if (ability.cannot('update', subject('Warehouse', existing))) {
      throw new ForbiddenException('Sem permissão para editar este armazém.')
    }
    if (!existing.isActive) {
      throw new BadRequestException('Armazéns desativados não podem ser editados.')
    }

    // Verificar código duplicado (se mudou)
    if (dto.code && dto.code !== existing.code) {
      const [dup] = await this.db
        .select({ id: warehouses.id })
        .from(warehouses)
        .where(
          and(
            eq(warehouses.companyId, user.companyId!),
            eq(warehouses.code, dto.code),
          ),
        )
        .limit(1)

      if (dup) {
        throw new ConflictException(
          `Já existe um armazém com o código "${dto.code}".`,
        )
      }
    }

    return this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.name !== undefined) updateData.name = dto.name
      if (dto.code !== undefined) updateData.code = dto.code
      if (dto.location !== undefined) updateData.location = dto.location

      const [updated] = await tx
        .update(warehouses)
        .set(updateData)
        .where(
          and(
            eq(warehouses.id, id),
            eq(warehouses.companyId, user.companyId!),
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Armazém não encontrado.')

      await tx.insert(auditLogs).values({
        entity:    'Warehouse',
        entityId:  id,
        action:    'UPDATE',
        before:    { name: existing.name, code: existing.code },
        after:     updateData,
        userId:    user.id,
        companyId: user.companyId,
      })

      return updated
    })
  }

  // ─── deactivate ───────────────────────────────────────────────────────────

  async deactivate(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)

    const [existing] = await this.db
      .select()
      .from(warehouses)
      .where(
        and(
          eq(warehouses.id, id),
          eq(warehouses.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!existing) throw new NotFoundException('Armazém não encontrado.')
    if (ability.cannot('delete', subject('Warehouse', existing))) {
      throw new ForbiddenException('Sem permissão para desativar este armazém.')
    }
    if (!existing.isActive) {
      throw new BadRequestException('O armazém já está desativado.')
    }

    // Verificar se há estoque no armazém
    const [stockEntry] = await this.db
      .select({ id: inventory.id })
      .from(inventory)
      .where(
        and(
          eq(inventory.warehouseId, id),
          sql`${inventory.quantity}::numeric > 0`,
        ),
      )
      .limit(1)

    if (stockEntry) {
      throw new BadRequestException(
        'Não é possível desativar um armazém com estoque. ' +
        'Transfira ou baixe o estoque antes de desativar.',
      )
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(warehouses)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(warehouses.id, id),
            eq(warehouses.companyId, user.companyId!),
          ),
        )
        .returning()

      if (!updated) throw new NotFoundException('Armazém não encontrado.')

      await tx.insert(auditLogs).values({
        entity:    'Warehouse',
        entityId:  id,
        action:    'DEACTIVATE',
        before:    { isActive: true },
        after:     { isActive: false },
        userId:    user.id,
        companyId: user.companyId,
      })

      return { success: true }
    })
  }

  // ─── getInventory ─────────────────────────────────────────────────────────
  // Listagem de saldo de estoque — global (todos os armazéns) ou por armazém

  async getInventory(
    user: SessionUser,
    query: {
      warehouseId?: string | undefined
      productId?:   string | undefined
      search?:      string | undefined
      page?:        string | undefined
      limit?:       string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'Warehouse')) {
      throw new ForbiddenException('Sem permissão para visualizar estoque.')
    }

    const page  = Math.max(1, Number.isFinite(Number.parseInt(query.page ?? '1', 10)) ? Number.parseInt(query.page ?? '1', 10) : 1)
    const limit = Math.min(200, Math.max(1, Number.isFinite(Number.parseInt(query.limit ?? '50', 10)) ? Number.parseInt(query.limit ?? '50', 10) : 50))
    const offset = (page - 1) * limit

    const conditions = [eq(inventory.companyId, user.companyId!)]

    if (query.warehouseId) {
      conditions.push(eq(inventory.warehouseId, query.warehouseId))
    }
    if (query.productId) {
      conditions.push(eq(inventory.productId, query.productId))
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(products.name, `%${query.search}%`),
          ilike(products.code, `%${query.search}%`),
        )!,
      )
    }

    return this.db
      .select({
        id:            inventory.id,
        warehouseId:   inventory.warehouseId,
        warehouseName: warehouses.name,
        productId:     inventory.productId,
        productName:   products.name,
        productCode:   products.code,
        unit:          products.unit,
        quantity:      inventory.quantity,
        minStock:      inventory.minStock,
        updatedAt:     inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(warehouses, eq(warehouses.id, inventory.warehouseId))
      .innerJoin(products, eq(products.id, inventory.productId))
      .where(and(...conditions))
      .orderBy(warehouses.name, products.name)
      .limit(limit)
      .offset(offset)
  }
}
```

---

### 3. `warehouses.controller.ts`

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
  createWarehouseSchema,
  updateWarehouseSchema,
  type CreateWarehouseDto,
  type UpdateWarehouseDto,
} from '@elos/shared'
import { WarehousesService } from './warehouses.service'

@ApiTags('warehouses')
@ApiCookieAuth()
@Controller('companies/:cnpj/warehouses')
@UseGuards(AuthGuard)
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar armazéns' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.warehousesService.findAll(user, { includeInactive })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar armazém' })
  @ApiResponse({ status: 201, description: 'Armazém criado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 409, description: 'Código já cadastrado.' })
  create(
    @Body(new ZodValidationPipe(createWarehouseSchema)) body: CreateWarehouseDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.warehousesService.create(body, user)
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Saldo de estoque global (todos os armazéns)' })
  getGlobalInventory(
    @CurrentUser() user: SessionUser,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehousesService.getInventory(user, { productId, search, page, limit })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do armazém' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.warehousesService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar armazém' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema)) body: UpdateWarehouseDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.warehousesService.update(id, body, user)
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar armazém (soft delete)' })
  @ApiResponse({ status: 400, description: 'Armazém com estoque ou já desativado.' })
  deactivate(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.warehousesService.deactivate(id, user)
  }

  @Get(':id/inventory')
  @ApiOperation({ summary: 'Saldo de estoque do armazém' })
  getInventory(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehousesService.getInventory(user, {
      warehouseId: id,
      productId,
      search,
      page,
      limit,
    })
  }
}
```

> **Atenção à ordem das rotas:** `GET /warehouses/inventory` deve ser registrado
> **antes** de `GET /warehouses/:id` para que o Express não interprete `inventory`
> como um `id`. No controller acima isso é garantido pela posição do método
> `getGlobalInventory` antes de `findOne`.

---

### 4. `warehouses.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { WarehousesController } from './warehouses.controller'
import { WarehousesService } from './warehouses.service'

@Module({
  imports: [AbilityModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService],  // usado pelo ReceiptsService (5.3)
})
export class WarehousesModule {}
```

---

### 5. `warehouses.service.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { WarehousesService } from './warehouses.service'
import { DRIZZLE } from '../../db.module'
import { AbilityFactory } from '../../common/ability/ability.factory'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const companyId  = '00000000-0000-0000-0000-000000000001'
const warehouseId = '00000000-0000-0000-0000-000000000002'
const userId     = 'user-001'

const mockWarehouse = {
  id:        warehouseId,
  companyId,
  name:      'Armazém Central',
  code:      'AC01',
  location:  'Galpão A',
  isActive:  true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUser = {
  id: userId, email: 'test@test.com', name: 'Test',
  role: 'ALMOXARIFE', companyId,
} as any

// ─── Mock do Drizzle ─────────────────────────────────────────────────────────

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
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = {
    select:      () => qb,
    insert:      () => qb,
    update:      () => qb,
    transaction: vi.fn((cb: (tx: unknown) => unknown) => cb(mockDb)),
  }

  return { mockDb, enqueue }
}

// ─── Testes ──────────────────────────────────────────────────────────────────

describe('WarehousesService', () => {
  let service: WarehousesService
  let mockDb: ReturnType<typeof makeDb>['mockDb']
  let enqueue: ReturnType<typeof makeDb>['enqueue']

  const mockAbility        = { cannot: vi.fn().mockReturnValue(false) }
  const mockAbilityFactory = { createForUser: vi.fn().mockReturnValue(mockAbility) }

  beforeEach(async () => {
    const { mockDb: db, enqueue: eq } = makeDb()
    mockDb  = db
    enqueue = eq

    const module = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: AbilityFactory, useValue: mockAbilityFactory },
      ],
    }).compile()

    service = module.get(WarehousesService)
    mockAbility.cannot.mockReturnValue(false)
  })

  describe('findAll', () => {
    it('retorna lista de armazéns', async () => {
      enqueue(mockWarehouse)
      const result = await service.findAll(mockUser, {})
      expect(result).toBeDefined()
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.findAll(mockUser, {})).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findOne', () => {
    it('retorna armazém pelo id', async () => {
      enqueue(mockWarehouse)
      const result = await service.findOne(warehouseId, mockUser)
      expect(result).toMatchObject({ name: 'Armazém Central' })
    })

    it('retorna 404 se não encontrado', async () => {
      enqueue(undefined)
      await expect(service.findOne('nonexistent', mockUser)).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('cria armazém com sucesso', async () => {
      enqueue(undefined)       // sem código duplicado
      enqueue(mockWarehouse)   // insert returning
      const result = await service.create({ name: 'Armazém Central', code: 'AC01' }, mockUser)
      expect(result).toMatchObject({ name: 'Armazém Central' })
    })

    it('retorna 403 sem permissão', async () => {
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.create({ name: 'Armazém' }, mockUser)).rejects.toThrow(ForbiddenException)
    })

    it('retorna 409 se código já existe', async () => {
      enqueue(mockWarehouse) // código duplicado encontrado
      await expect(
        service.create({ name: 'Novo', code: 'AC01' }, mockUser),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('deactivate', () => {
    it('desativa armazém sem estoque', async () => {
      enqueue(mockWarehouse) // existing
      enqueue(undefined)     // sem estoque (stockEntry)
      enqueue({ ...mockWarehouse, isActive: false }) // update returning
      const result = await service.deactivate(warehouseId, mockUser)
      expect(result).toEqual({ success: true })
    })

    it('retorna 400 se há estoque no armazém', async () => {
      enqueue(mockWarehouse)               // existing
      enqueue({ id: 'inv-1' })             // stockEntry com quantidade > 0
      await expect(service.deactivate(warehouseId, mockUser)).rejects.toThrow(BadRequestException)
    })

    it('retorna 404 se armazém não encontrado', async () => {
      enqueue(undefined)
      await expect(service.deactivate('nonexistent', mockUser)).rejects.toThrow(NotFoundException)
    })

    it('retorna 403 sem permissão', async () => {
      enqueue(mockWarehouse)
      mockAbility.cannot.mockReturnValue(true)
      await expect(service.deactivate(warehouseId, mockUser)).rejects.toThrow(ForbiddenException)
    })
  })
})
```

---

### 6. `warehouses.controller.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Test } from '@nestjs/testing'
import { WarehousesController } from './warehouses.controller'
import { WarehousesService } from './warehouses.service'
import { AuthGuard } from '../../common/guards/auth.guard'

describe('WarehousesController', () => {
  let controller: WarehousesController
  const mockUser      = { id: 'u1', role: 'ALMOXARIFE', companyId: 'c1' } as any
  const mockWarehouse = { id: 'w1', name: 'Central', isActive: true }

  const mockService = {
    findAll:      vi.fn().mockResolvedValue([mockWarehouse]),
    findOne:      vi.fn().mockResolvedValue(mockWarehouse),
    create:       vi.fn().mockResolvedValue(mockWarehouse),
    update:       vi.fn().mockResolvedValue(mockWarehouse),
    deactivate:   vi.fn().mockResolvedValue({ success: true }),
    getInventory: vi.fn().mockResolvedValue([]),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers:   [{ provide: WarehousesService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(WarehousesController)
  })

  it('GET / — lista armazéns',         async () => expect(await controller.findAll(mockUser)).toEqual([mockWarehouse]))
  it('POST / — cria armazém',          async () => expect(await controller.create({ name: 'X' }, mockUser)).toMatchObject({ name: 'Central' }))
  it('GET /:id — detalhe',             async () => expect(await controller.findOne('w1', mockUser)).toMatchObject({ id: 'w1' }))
  it('PATCH /:id — atualiza',          async () => expect(await controller.update('w1', { name: 'Y' }, mockUser)).toMatchObject({ id: 'w1' }))
  it('POST /:id/deactivate — desativa',async () => expect(await controller.deactivate('w1', mockUser)).toEqual({ success: true }))
  it('GET /:id/inventory — inventário',async () => expect(await controller.getInventory('w1', mockUser)).toEqual([]))
})
```

---

### 7. Modificar `app.module.ts`

```typescript
import { WarehousesModule } from './modules/warehouses/warehouses.module'
// No array @Module({ imports: [...] }):
WarehousesModule,
```

---

## Checklist de Verificação

```bash
# Testes
pnpm vitest run   # espera ≥ 157 testes (146 anteriores + ~11 novos)

# TypeScript
pnpm type-check

# Lint
pnpm --filter api lint

# Segurança (manual)
# [ ] CASL verifica antes de cada mutação (create/update/deactivate)
# [ ] Queries incluem eq(warehouses.companyId, user.companyId!) — isolamento de tenant
# [ ] Audit log em create/update/deactivate
# [ ] 409 ao criar armazém com código duplicado
# [ ] 400 ao desativar armazém com estoque
# [ ] GET /inventory escopa por companyId — nunca retorna dados de outro tenant
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| `GET /warehouses/inventory` antes de `GET /warehouses/:id` | Express resolve rotas por ordem de declaração; `inventory` seria interpretado como `:id` se registrado depois |
| Soft delete via `/deactivate` | Consistência com `deactivate` de produtos (2.3); armazéns têm histórico de movimentações que não pode ser perdido |
| `WarehousesModule` exporta o Service | O `ReceiptsService` (5.3) precisa validar que o `warehouseId` pertence à empresa antes de inserir movimentações |
| Inventário sem `updatedAt` próprio da tabela | A tabela `inventory` tem `updatedAt`; o Service retorna esse campo diretamente |
| ALMOXARIFE e ADMIN_EMPRESA com `manage` | Os dois papéis são responsáveis pelo espaço físico; COMPRADOR e demais só leitura |
