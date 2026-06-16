# Feature Spec — 7.2 Audit Logs Module (API)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 7 — Audit Log e Administração  
**Unidade:** 7.2  
**Pré-requisito:** 7.1 concluído (schemas `AuditLogQuery`, `AuditLogResponse`)  
**Commit convencional esperado:** `feat(api): add audit-logs module with query and filters`

---

## Objetivo

Criar o módulo NestJS `AuditLogsModule` para consulta de audit logs por empresa.
O audit log é **append-only** — os Services existentes já inserem registros na
tabela `audit_logs` em cada mutação. Este módulo expõe apenas endpoints de
**leitura** com filtros avançados.

---

## Decisões de Negócio

| Regra | Comportamento |
| ----- | ------------- |
| Quem consulta | ADMIN_EMPRESA e SUPER_ADMIN (papéis operacionais não veem audit log) |
| Escopo de dados | Sempre escopado a `companyId` (tenant isolation) |
| Filtros | `entity`, `entityId`, `action`, `userId`, `startDate`/`endDate`, paginação |
| Ordenação | Sempre `createdAt DESC` (mais recentes primeiro) |
| Imutabilidade | Sem create/update/delete — append-only, read-only neste módulo |
| Dados sensíveis | `before`/`after` nunca contêm senhas (Better-Auth gerencia hash) |
| IP address | v1 não registra IP (campo existe mas fica `null`); pode ser adicionado via interceptor futuro |

---

## Escopo

### In

- `apps/api/src/modules/audit-logs/audit-logs.module.ts`
- `apps/api/src/modules/audit-logs/audit-logs.controller.ts`
- `apps/api/src/modules/audit-logs/audit-logs.controller.spec.ts`
- `apps/api/src/modules/audit-logs/audit-logs.service.ts`
- `apps/api/src/modules/audit-logs/audit-logs.service.spec.ts`
- Modificação em `apps/api/src/common/ability/ability.factory.ts` — regras `AuditLog`
- Modificação em `apps/api/src/app.module.ts` — importar `AuditLogsModule`

### Out

- UI (→ 7.3)
- Dashboard (→ 7.4)
- Registro de IP address (interceptor futuro)
- Exportação de logs (CSV/JSON) — fora do escopo v1

---

## Rotas

| Método | Caminho | Papel mínimo | Descrição |
| ------ | ------- | ------------ | --------- |
| GET | `/v1/companies/:cnpj/audit-logs` | `ADMIN_EMPRESA` | Lista audit logs com filtros |
| GET | `/v1/companies/:cnpj/audit-logs/:id` | `ADMIN_EMPRESA` | Detalhe de um registro |
| GET | `/v1/companies/:cnpj/audit-logs/entities` | `ADMIN_EMPRESA` | Lista entidades distintas (para filtro) |
| GET | `/v1/companies/:cnpj/audit-logs/actions` | `ADMIN_EMPRESA` | Lista ações distintas (para filtro) |

> **Query params em GET /audit-logs:** `entity` (string), `entityId` (uuid),
> `action` (string), `userId` (string), `startDate` (ISO datetime),
> `endDate` (ISO datetime), `page` (default 1), `limit` (default 50, max 100).

---

## Arquivos a Criar / Modificar

```
apps/api/src/
  modules/
    audit-logs/
      audit-logs.module.ts           ← criar
      audit-logs.controller.ts       ← criar
      audit-logs.controller.spec.ts  ← criar
      audit-logs.service.ts          ← criar
      audit-logs.service.spec.ts     ← criar
  common/
    ability/
      ability.factory.ts             ← modificar (regras AuditLog)
  app.module.ts                      ← modificar (importar AuditLogsModule)
```

---

## Implementação Detalhada

### 1. Modificar `ability.factory.ts` — regras `AuditLog`

```typescript
// Adicionar ao union Subjects:
//   'AuditLog'

// Apenas strings — não precisa de ForcedSubject pois não há condições por objeto
// (o Service filtra por companyId direto na query, sem checagem CASL por instância)

case 'SUPER_ADMIN':
  can('manage', 'all')
  break

case 'ADMIN_EMPRESA':
  // regras já existentes ...
  can('read', 'AuditLog')
  break

// Todos os outros papéis: sem regra AuditLog (403 no Service)
```

---

### 2. `audit-logs.service.ts`

```typescript
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { and, desc, eq, gte, lte, SQL } from 'drizzle-orm'
import { AbilityFactory } from '../../common/ability/ability.factory'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { auditLogs } from '../../db/schema/audit-logs'
import { users } from '../../db/schema/auth'

@Injectable()
export class AuditLogsService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    @Inject(AbilityFactory) private abilityFactory: AbilityFactory,
  ) {}

  async findAll(
    user: SessionUser,
    query: {
      entity?:    string | undefined
      entityId?:  string | undefined
      action?:    string | undefined
      userId?:    string | undefined
      startDate?: string | undefined
      endDate?:   string | undefined
      page?:      string | undefined
      limit?:     string | undefined
    },
  ) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'AuditLog')) {
      throw new ForbiddenException('Sem permissão para consultar audit logs.')
    }

    const page  = Math.max(1, Number.isNaN(Number.parseInt(query.page ?? '1', 10))
      ? 1 : Number.parseInt(query.page ?? '1', 10))
    const limit = Math.min(100, Math.max(1, Number.isNaN(Number.parseInt(query.limit ?? '50', 10))
      ? 50 : Number.parseInt(query.limit ?? '50', 10)))
    const offset = (page - 1) * limit

    const conditions: SQL[] = [eq(auditLogs.companyId, user.companyId!)]
    if (query.entity)    conditions.push(eq(auditLogs.entity, query.entity))
    if (query.entityId)  conditions.push(eq(auditLogs.entityId, query.entityId))
    if (query.action)    conditions.push(eq(auditLogs.action, query.action))
    if (query.userId)    conditions.push(eq(auditLogs.userId, query.userId))
    if (query.startDate) conditions.push(gte(auditLogs.createdAt, new Date(query.startDate)))
    if (query.endDate)   conditions.push(lte(auditLogs.createdAt, new Date(query.endDate)))

    return this.db
      .select({
        id:         auditLogs.id,
        companyId:  auditLogs.companyId,
        userId:     auditLogs.userId,
        userName:   users.name,
        userEmail:  users.email,
        entity:     auditLogs.entity,
        entityId:   auditLogs.entityId,
        action:     auditLogs.action,
        before:     auditLogs.before,
        after:      auditLogs.after,
        ipAddress:  auditLogs.ipAddress,
        createdAt:  auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async findOne(id: string, user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'AuditLog')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const [log] = await this.db
      .select({
        id:         auditLogs.id,
        companyId:  auditLogs.companyId,
        userId:     auditLogs.userId,
        userName:   users.name,
        userEmail:  users.email,
        entity:     auditLogs.entity,
        entityId:   auditLogs.entityId,
        action:     auditLogs.action,
        before:     auditLogs.before,
        after:      auditLogs.after,
        ipAddress:  auditLogs.ipAddress,
        createdAt:  auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(
        and(
          eq(auditLogs.id, id),
          eq(auditLogs.companyId, user.companyId!),
        ),
      )
      .limit(1)

    if (!log) throw new NotFoundException('Registro de audit log não encontrado.')
    return log
  }

  async getDistinctEntities(user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'AuditLog')) {
      throw new ForbiddenException('Sem permissão.')
    }

    // Retorna entidades distintas já registradas para esta empresa
    const results = await this.db
      .selectDistinct({ entity: auditLogs.entity })
      .from(auditLogs)
      .where(eq(auditLogs.companyId, user.companyId!))
      .orderBy(auditLogs.entity)

    return results.map((r) => r.entity)
  }

  async getDistinctActions(user: SessionUser) {
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('read', 'AuditLog')) {
      throw new ForbiddenException('Sem permissão.')
    }

    const results = await this.db
      .selectDistinct({ action: auditLogs.action })
      .from(auditLogs)
      .where(eq(auditLogs.companyId, user.companyId!))
      .orderBy(auditLogs.action)

    return results.map((r) => r.action)
  }
}
```

---

### 3. `audit-logs.controller.ts`

```typescript
import {
  Controller, Get, Param, Query, UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { SessionUser } from '../../common/types/session-user'
import { AuditLogsService } from './audit-logs.service'

@ApiTags('audit-logs')
@ApiCookieAuth()
@Controller('companies/:cnpj/audit-logs')
@UseGuards(AuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // Rotas sem parâmetros dinâmicos ANTES de :id
  @Get('entities')
  @ApiOperation({ summary: 'Listar entidades distintas' })
  getEntities(@CurrentUser() user: SessionUser) {
    return this.auditLogsService.getDistinctEntities(user)
  }

  @Get('actions')
  @ApiOperation({ summary: 'Listar ações distintas' })
  getActions(@CurrentUser() user: SessionUser) {
    return this.auditLogsService.getDistinctActions(user)
  }

  @Get()
  @ApiOperation({ summary: 'Listar audit logs' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('entity')    entity?: string,
    @Query('entityId')  entityId?: string,
    @Query('action')    action?: string,
    @Query('userId')    userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate')   endDate?: string,
    @Query('page')      page?: string,
    @Query('limit')     limit?: string,
  ) {
    return this.auditLogsService.findAll(user, {
      entity, entityId, action, userId, startDate, endDate, page, limit,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do audit log' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.auditLogsService.findOne(id, user)
  }
}
```

---

### 4. `audit-logs.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { AuditLogsController } from './audit-logs.controller'
import { AuditLogsService } from './audit-logs.service'

@Module({
  imports:     [AbilityModule],
  controllers: [AuditLogsController],
  providers:   [AuditLogsService],
  exports:     [AuditLogsService],
})
export class AuditLogsModule {}
```

---

### 5. Testes

**Service spec (~8 testes):**
- `findAll`: retorna logs com filtros; 403 COMPRADOR sem permissão; aplica filtro de data; aplica filtro de entity
- `findOne`: retorna log; 404 não encontrado; 403 sem permissão
- `getDistinctEntities`: retorna lista; 403 sem permissão

**Controller spec (~4 testes):**
- GET / — lista logs
- GET /:id — detalhe
- GET /entities — lista entidades
- GET /actions — lista ações

---

## Checklist de Verificação

```bash
# Testes
pnpm vitest run   # espera ≥ 275 testes

# TypeScript
pnpm type-check

# Lint
pnpm --filter api lint

# Segurança (manual)
# [ ] CASL verifica antes de cada query
# [ ] Queries escopadas a companyId
# [ ] 403 COMPRADOR/ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR tentando consultar logs
# [ ] Sem endpoints de escrita (append-only)
# [ ] before/after não contêm senhas
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| Apenas ADMIN_EMPRESA e SUPER_ADMIN leem audit logs | Logs contêm dados sensíveis de negócio (valores, status, quem fez o quê); papéis operacionais não precisam dessa visibilidade |
| `getDistinctEntities`/`getDistinctActions` como endpoints separados | Permite ao frontend montar dropdowns de filtro sem carregar todos os logs; resultado leve (arrays de strings) |
| Rotas `entities`/`actions` registradas ANTES de `:id` | NestJS avalia rotas na ordem de registro; sem isso, "entities" seria interpretado como `:id` |
| `AuditLog` sem `ForcedSubject` | Não há checagem CASL por instância (não se faz `subject('AuditLog', row)`); a restrição é por tipo (`cannot('read', 'AuditLog')`) e as queries filtram por `companyId` |
| Sem delete/export na v1 | Logs são imutáveis; exportação (CSV) é feature de conveniência, fora do escopo |
