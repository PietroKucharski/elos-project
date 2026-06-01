# Feature Spec — 0.4 Bootstrap da API (NestJS)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 0 — Fundação  
**Unidade:** 0.4  
**Pré-requisito:** 0.3 (schema Drizzle aplicado no banco; `DrizzleModule` e `db.module.ts` criados)  
**Commit convencional esperado:** `feat(api): bootstrap nestjs with auth, casl, guards and health`

---

## Objetivo

Levantar o servidor NestJS com toda a infraestrutura transversal configurada:
autenticação via Better-Auth, autorização via CASL, filtro de exceções padronizado,
pipe de validação Zod, documentação OpenAPI com Scalar UI e rota de health check.
Ao final desta unidade, `GET /health` retorna `200 OK` e `GET /reference` exibe a
documentação interativa. Todos os módulos de domínio das fases seguintes apenas
importam essa infraestrutura — nunca a reimplementam.

---

## Escopo

### In

- Instalação das dependências NestJS e CASL
- `apps/api/src/db/index.ts` — instância Drizzle standalone para Better-Auth
- `common/types/session-user.ts`
- `common/decorators/` — `@Public()`, `@CurrentUser()`
- `common/pipes/zod-validation.pipe.ts`
- `common/filters/global-exception.filter.ts`
- `common/ability/ability.factory.ts` + `ability.module.ts`
- `common/guards/auth.guard.ts` (com SUPER_ADMIN bypass)
- `common/guards/roles.guard.ts` (stub de coarse-grained check)
- `modules/auth/better-auth.ts` + `auth.controller.ts` + `auth.module.ts`
- `modules/health/health.controller.ts` + `health.module.ts`
- `app.module.ts`
- `main.ts`
- Testes Vitest: `auth.guard.spec.ts`, `ability.factory.spec.ts`,
  `global-exception.filter.spec.ts`, `health.controller.spec.ts`

### Out (não implementar nesta unidade)

- Módulos de domínio (→ Fases 1–7)
- Schemas Zod em `packages/shared` (→ junto com cada módulo de domínio)
- Supabase Storage (→ Fase 6)
- GitHub Actions CI (→ 0.6)
- Frontend (→ 0.5)

---

## Arquivos a Criar / Modificar

```
apps/api/
  src/
    db/
      index.ts                                  ← criar (instância standalone para Better-Auth)
    common/
      types/
        session-user.ts                         ← criar
      decorators/
        public.decorator.ts                     ← criar
        current-user.decorator.ts               ← criar
      pipes/
        zod-validation.pipe.ts                  ← criar
      filters/
        global-exception.filter.ts              ← criar
        global-exception.filter.spec.ts         ← criar
      ability/
        ability.factory.ts                      ← criar
        ability.factory.spec.ts                 ← criar
        ability.module.ts                       ← criar
      guards/
        auth.guard.ts                           ← criar
        auth.guard.spec.ts                      ← criar
        roles.guard.ts                          ← criar
    modules/
      auth/
        better-auth.ts                          ← criar
        auth.controller.ts                      ← criar
        auth.module.ts                          ← criar
      health/
        health.controller.ts                    ← criar
        health.controller.spec.ts               ← criar
        health.module.ts                        ← criar
    app.module.ts                               ← criar
    main.ts                                     ← criar
  db.module.ts                                  ← modificar (usar instância de src/db/index.ts)
```

---

## Implementação Detalhada

### 1. Instalar dependências

```bash
# Core NestJS
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs --filter api

# Rate limiting
pnpm add @nestjs/throttler --filter api

# CASL
pnpm add @casl/ability --filter api

# Better-Auth
pnpm add better-auth --filter api

# OpenAPI + Scalar
pnpm add @nestjs/swagger @scalar/nestjs-api-reference --filter api

# Zod (para o pipe)
pnpm add zod --filter api

# Dev
pnpm add -D @nestjs/testing vitest @types/node tsx --filter api
```

---

### 2. `apps/api/src/db/index.ts` — instância standalone

Better-Auth precisa de uma instância Drizzle na inicialização do módulo — antes
do NestJS DI estar disponível. Esta instância standalone serve esse propósito e
também é usada pelo seed.

O `DrizzleModule` passa a usar esta mesma instância em vez de criar uma nova.

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
})

export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})

export type DrizzleDB = typeof db
```

**Atualizar `apps/api/src/db.module.ts`** para usar esta instância:

```typescript
import { Global, Module } from '@nestjs/common'
import { db } from './db'

export const DRIZZLE = Symbol('DRIZZLE')
export type { DrizzleDB } from './db'

@Global()
@Module({
  providers: [{ provide: DRIZZLE, useValue: db }],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
```

> **Por que `useValue` em vez de `useFactory`?** A instância já está criada em
> `db/index.ts`. Usar `useValue` é mais simples e garante que Better-Auth e o
> NestJS DI compartilham a mesma conexão postgres, sem abrir duas pools.

---

### 3. `common/types/session-user.ts`

```typescript
import type { Role } from '@elos/shared'

export interface SessionUser {
  id: string           // Better-Auth user id (text no banco)
  email: string
  name: string
  role: Role | null    // papel na empresa ativa; null em rotas sem /:cnpj
  companyId: string | null  // uuid da empresa ativa no banco
}
```

---

### 4. `common/decorators/public.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
```

### 4b. `common/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { SessionUser } from '../types/session-user'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest()
    return request['user'] as SessionUser
  },
)
```

---

### 5. `common/pipes/zod-validation.pipe.ts`

Pipe usado **por parâmetro** (`@Body(new ZodValidationPipe(schema))`) — não como
pipe global, pois cada rota tem seu próprio schema Zod.

```typescript
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import type { ZodSchema } from 'zod'

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        message: 'Dados de entrada inválidos.',
        errors: result.error.flatten(),
      })
    }
    return result.data
  }
}
```

---

### 6. `common/filters/global-exception.filter.ts`

Captura todas as exceções não tratadas e retorna um shape de erro consistente.

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message: unknown = 'Erro interno do servidor.'
    let error = 'Internal Server Error'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      message =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as Record<string, unknown>).message ?? exceptionResponse
          : exceptionResponse
      error = exception.name
    } else if (exception instanceof Error) {
      // Erros inesperados — logar stack completo mas não expor ao cliente
      this.logger.error(exception.message, exception.stack)
    } else {
      this.logger.error('Exceção não esperada', String(exception))
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    })
  }
}
```

---

### 7. `common/ability/ability.factory.ts`

Cria as regras CASL por papel de usuário. As permissões são definidas aqui na
íntegra — os Services apenas chamam `ability.cannot(action, subject)`.

```typescript
import { Injectable } from '@nestjs/common'
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability'
import type { SessionUser } from '../types/session-user'

export type Actions =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'manage'    // shorthand para todas as ações
  | 'approve'
  | 'reject'
  | 'submit'
  | 'select'    // selecionar lance vencedor em cotação

export type Subjects =
  | 'Company'
  | 'CompanyMember'
  | 'Supplier'
  | 'SupplierContact'
  | 'SupplierBankAccount'
  | 'Product'
  | 'ProductSupplier'
  | 'Quotation'
  | 'QuotationItem'
  | 'QuotationInvite'
  | 'Bid'
  | 'BidItem'
  | 'PurchaseOrder'
  | 'PurchaseOrderItem'
  | 'Receipt'
  | 'Warehouse'
  | 'Inventory'
  | 'StockMovement'
  | 'NonConformity'
  | 'Invoice'
  | 'Payment'
  | 'Shipment'
  | 'AuditLog'
  | 'all'

export type AppAbility = MongoAbility<[Actions, Subjects]>

@Injectable()
export class AbilityFactory {
  createForUser(user: SessionUser): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

    switch (user.role) {
      case 'SUPER_ADMIN':
        can('manage', 'all')
        break

      case 'ADMIN_EMPRESA':
        can('manage', 'Company')
        can('manage', 'CompanyMember')
        can('manage', 'Supplier')
        can('manage', 'SupplierContact')
        can('manage', 'SupplierBankAccount')
        can('manage', 'Product')
        can('manage', 'ProductSupplier')
        can('manage', 'Quotation')
        can('manage', 'PurchaseOrder')
        can('manage', 'Warehouse')
        can('manage', 'Inventory')
        can('manage', 'StockMovement')
        can('manage', 'NonConformity')
        can('manage', 'Invoice')
        can('manage', 'Payment')
        can('manage', 'Shipment')
        can('read', 'AuditLog')
        break

      case 'COMPRADOR':
        can(['read', 'create', 'update'], 'Supplier')
        can('approve', 'Supplier')
        can('reject', 'Supplier')
        can('manage', 'SupplierContact')
        can('manage', 'SupplierBankAccount')
        can('manage', 'Product')
        can('manage', 'ProductSupplier')
        can('manage', 'Quotation')
        can('manage', 'QuotationItem')
        can('manage', 'QuotationInvite')
        can('read', 'Bid')
        can('select', 'Bid')
        can('manage', 'PurchaseOrder')
        can('approve', 'PurchaseOrder')
        can('read', 'Receipt')
        can('read', 'NonConformity')
        can('read', 'Invoice')
        can('read', 'AuditLog')
        break

      case 'ALMOXARIFE':
        can('read', 'PurchaseOrder')
        can('manage', 'Receipt')
        can('manage', 'Warehouse')
        can('manage', 'Inventory')
        can('manage', 'StockMovement')
        can('manage', 'NonConformity')
        break

      case 'ANALISTA_FINANCEIRO':
        can('read', 'PurchaseOrder')
        can('read', 'Receipt')
        can('manage', 'Invoice')
        can('manage', 'Payment')
        break

      case 'TRANSPORTADOR':
        can('read', 'PurchaseOrder')
        can('manage', 'Shipment')
        break

      default:
        // Sem papel — sem permissões
        break
    }

    return build()
  }
}
```

### 7b. `common/ability/ability.module.ts`

```typescript
import { Global, Module } from '@nestjs/common'
import { AbilityFactory } from './ability.factory'

@Global()
@Module({
  providers: [AbilityFactory],
  exports: [AbilityFactory],
})
export class AbilityModule {}
```

---

### 8. `common/guards/auth.guard.ts`

Responsável por **duas coisas**:
1. Verificar sessão via Better-Auth.
2. Enriquecer `request.user` com `role` e `companyId` via query Drizzle.

Inclui bypass para SUPER_ADMIN: se o usuário não tem `company_members` na empresa
do CNPJ, verifica se ele é SUPER_ADMIN em qualquer empresa — se sim, resolve o
`companyId` pelo CNPJ e dá acesso com `role: 'SUPER_ADMIN'`.

**Resolve a Open Question 0.3 — SUPER_ADMIN bypass:** não é necessário criar
membership para cada empresa. O AuthGuard detecta o papel globalmente.

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { and, eq } from 'drizzle-orm'
import { fromNodeHeaders } from 'better-auth/node'
import type { Role } from '@elos/shared'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import { companies, companyMembers } from '../../db/schema'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { auth } from '../../modules/auth/better-auth'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Rotas marcadas com @Public() são livres
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest()

    // 1. Verificar sessão Better-Auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })
    if (!session) throw new UnauthorizedException('Sessão inválida ou expirada.')

    // 2. Resolver empresa ativa (se rota tem /:cnpj)
    const cnpj: string | undefined = request.params?.cnpj
    let role: Role | null = null
    let companyId: string | null = null

    if (cnpj) {
      // Tenta encontrar membership direto na empresa
      const membership = await this.db
        .select({ role: companyMembers.role, companyId: companies.id })
        .from(companyMembers)
        .innerJoin(companies, eq(companies.id, companyMembers.companyId))
        .where(
          and(
            eq(companyMembers.userId, session.user.id),
            eq(companies.cnpj, cnpj),
          ),
        )
        .limit(1)
        .then((rows) => rows[0] ?? null)

      if (membership) {
        role = membership.role as Role
        companyId = membership.companyId
      } else {
        // Sem membership direto — verifica se é SUPER_ADMIN em qualquer empresa
        const isSuperAdmin = await this.db
          .select({ role: companyMembers.role })
          .from(companyMembers)
          .where(
            and(
              eq(companyMembers.userId, session.user.id),
              eq(companyMembers.role, 'SUPER_ADMIN'),
            ),
          )
          .limit(1)
          .then((rows) => rows.length > 0)

        if (!isSuperAdmin) {
          throw new ForbiddenException('Acesso negado a esta empresa.')
        }

        // Resolve o companyId pelo CNPJ para o SUPER_ADMIN
        const company = await this.db
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.cnpj, cnpj))
          .limit(1)
          .then((rows) => rows[0] ?? null)

        if (!company) throw new NotFoundException('Empresa não encontrada.')

        role = 'SUPER_ADMIN'
        companyId = company.id
      }
    }

    // 3. Enriquecer request.user
    request['user'] = {
      id:        session.user.id,
      email:     session.user.email,
      name:      session.user.name,
      role,
      companyId,
    }

    return true
  }
}
```

---

### 9. `common/guards/roles.guard.ts`

Guard de verificação coarse: garante que o usuário tem um papel definido em rotas
de empresa. Raramente necessário — `AuthGuard` cobre a maioria dos casos. Inclua
em rotas que precisam de membership mas ainda não têm CASL no Service.

```typescript
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import type { SessionUser } from '../types/session-user'

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request['user'] as SessionUser | undefined

    if (!user) return false

    const cnpj: string | undefined = request.params?.cnpj
    if (cnpj && !user.role) {
      throw new ForbiddenException('Usuário sem papel nesta empresa.')
    }

    return true
  }
}
```

---

### 10. `modules/auth/better-auth.ts`

Instância singleton do Better-Auth. Usa a instância standalone `db` de
`src/db/index.ts` — NestJS DI não está disponível no escopo de módulo.

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../../db'
import * as authSchema from '../../db/schema/auth'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  // Plugin 2FA NÃO instalado na v1 (invariante de segurança)
  secret:  process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  trustedOrigins: [process.env.FRONTEND_URL!],
})
```

### 10b. `modules/auth/auth.controller.ts`

Monta todas as rotas HTTP do Better-Auth em `/api/auth/*`. O guard `@Public()`
é obrigatório — estas rotas não passam pelo `AuthGuard`.

`toNodeHandler` converte o handler do Better-Auth para o formato Node.js/Express
de forma segura, incluindo cookies e redirects.

```typescript
import { All, Controller, Req, Res } from '@nestjs/common'
import { toNodeHandler } from 'better-auth/node'
import type { Request, Response } from 'express'
import { Public } from '../../common/decorators/public.decorator'
import { auth } from './better-auth'

// Handler pré-construído — evita recriar a closure a cada request
const authHandler = toNodeHandler(auth)

@Controller()
@Public()
export class AuthController {
  @All('api/auth/*')
  handler(@Req() req: Request, @Res() res: Response): void {
    authHandler(req, res)
  }
}
```

### 10c. `modules/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'

@Module({
  controllers: [AuthController],
})
export class AuthModule {}
```

---

### 11. `modules/health/health.controller.ts`

```typescript
import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Public } from '../../common/decorators/public.decorator'

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check da API' })
  @ApiResponse({ status: 200, description: 'API operacional.' })
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    }
  }
}
```

### 11b. `modules/health/health.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

---

### 12. `app.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { DrizzleModule } from './db.module'
import { AbilityModule } from './common/ability/ability.module'
import { AuthGuard } from './common/guards/auth.guard'
import { AuthModule } from './modules/auth/auth.module'
import { HealthModule } from './modules/health/health.module'

@Module({
  imports: [
    // Rate limiting global: 100 req/min por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Infraestrutura — ambos @Global, disponíveis em todo o app
    DrizzleModule,
    AbilityModule,

    // Módulos de feature
    AuthModule,
    HealthModule,
    // Fases 1–7: módulos de domínio adicionados aqui
  ],
  providers: [
    // AuthGuard aplicado globalmente — @Public() exclui rotas específicas
    { provide: APP_GUARD, useClass: AuthGuard },
    // ThrottlerGuard aplica rate limiting a todas as rotas
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
```

> **Por que `APP_GUARD` em vez de `@UseGuards(AuthGuard)` por controller?**
> Modelo opt-out: todas as rotas são protegidas por padrão. Uma rota esquecida
> sem `@UseGuards` continuaria protegida. No modelo opt-in, uma rota esquecida
> ficaria desprotegida — risco de segurança silencioso.

---

### 13. `main.ts`

```typescript
import { NestFactory } from '@nestjs/core'
import { RequestMethod } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  })

  // ─── CORS — nunca enableCors() sem opções (invariante) ────────────────────
  app.enableCors({
    origin: [process.env.FRONTEND_URL!],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })

  // ─── Prefixo global /v1 ───────────────────────────────────────────────────
  app.setGlobalPrefix('v1', {
    exclude: [
      { path: 'api/auth/(.*)', method: RequestMethod.ALL },
      { path: 'health',        method: RequestMethod.GET },
      { path: 'reference',     method: RequestMethod.GET },
      { path: 'openapi.json',  method: RequestMethod.GET },
    ],
  })

  // ─── Filtro global de exceções ────────────────────────────────────────────
  app.useGlobalFilters(new GlobalExceptionFilter())

  // ─── OpenAPI + Scalar ─────────────────────────────────────────────────────
  const openApiConfig = new DocumentBuilder()
    .setTitle('Elos API')
    .setDescription('API de gestão de cadeia de suprimentos B2B')
    .setVersion('1.0')
    .addCookieAuth('better-auth.session_token')
    .build()

  const document = SwaggerModule.createDocument(app, openApiConfig)

  // Scalar UI em /reference
  app.use(
    '/reference',
    apiReference({
      spec: { content: document },
      theme: 'default',
    }),
  )

  // Spec JSON em /openapi.json — para geração de client tipado
  app.use('/openapi.json', (_req: unknown, res: { json: (d: unknown) => void }) => {
    res.json(document)
  })

  // ─── Inicialização ────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3333
  await app.listen(port)
  console.log(`🚀 API rodando em http://localhost:${port}`)
  console.log(`📖 Docs em http://localhost:${port}/reference`)
}

bootstrap().catch((err: unknown) => {
  console.error('Falha ao inicializar a API:', err)
  process.exit(1)
})
```

> **`ZodValidationPipe` não é registrado via `useGlobalPipes`** pois cada rota
> precisa do seu schema específico. Uso por parâmetro:
> `@Body(new ZodValidationPipe(schema))`.

---

### 14. Testes Vitest

#### `common/filters/global-exception.filter.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpException, HttpStatus } from '@nestjs/common'
import type { ArgumentsHost } from '@nestjs/common'
import { GlobalExceptionFilter } from './global-exception.filter'

function makeHost(url = '/test'): ArgumentsHost {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  return {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest:  () => ({ url }),
    }),
  } as unknown as ArgumentsHost
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter

  beforeEach(() => { filter = new GlobalExceptionFilter() })

  it('retorna 400 para HttpException com shape correto', () => {
    const host = makeHost()
    const { status, json } = extractMocks(host)

    filter.catch(new HttpException('Dado inválido.', HttpStatus.BAD_REQUEST), host)

    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400, message: 'Dado inválido.', path: '/test' }),
    )
  })

  it('retorna 500 para erros inesperados sem expor o stack', () => {
    const host = makeHost()
    const { status, json } = extractMocks(host)

    filter.catch(new Error('db connection lost'), host)

    expect(status).toHaveBeenCalledWith(500)
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, message: 'Erro interno do servidor.' }),
    )
  })
})

function extractMocks(host: ArgumentsHost) {
  const res = host.switchToHttp().getResponse() as any
  return { status: res.status, json: res.status().json }
}
```

#### `common/ability/ability.factory.spec.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { AbilityFactory } from './ability.factory'
import type { SessionUser } from '../types/session-user'

const makeUser = (role: SessionUser['role']): SessionUser => ({
  id: 'u1', email: 'test@test.com', name: 'Test', role, companyId: 'c1',
})

describe('AbilityFactory', () => {
  let factory: AbilityFactory

  beforeEach(() => { factory = new AbilityFactory() })

  it('SUPER_ADMIN pode fazer tudo', () => {
    const ability = factory.createForUser(makeUser('SUPER_ADMIN'))
    expect(ability.can('manage', 'all')).toBe(true)
    expect(ability.can('delete', 'AuditLog')).toBe(true)
  })

  it('COMPRADOR pode criar cotação e aprovar fornecedor', () => {
    const ability = factory.createForUser(makeUser('COMPRADOR'))
    expect(ability.can('create', 'Quotation')).toBe(true)
    expect(ability.can('approve', 'Supplier')).toBe(true)
  })

  it('COMPRADOR não pode gerenciar pagamentos', () => {
    const ability = factory.createForUser(makeUser('COMPRADOR'))
    expect(ability.can('create', 'Payment')).toBe(false)
  })

  it('ALMOXARIFE pode criar recebimento mas não aprovar fornecedor', () => {
    const ability = factory.createForUser(makeUser('ALMOXARIFE'))
    expect(ability.can('create', 'Receipt')).toBe(true)
    expect(ability.can('approve', 'Supplier')).toBe(false)
  })

  it('ANALISTA_FINANCEIRO pode gerenciar invoice e payment', () => {
    const ability = factory.createForUser(makeUser('ANALISTA_FINANCEIRO'))
    expect(ability.can('manage', 'Invoice')).toBe(true)
    expect(ability.can('manage', 'Payment')).toBe(true)
  })

  it('TRANSPORTADOR pode gerenciar shipment mas não invoice', () => {
    const ability = factory.createForUser(makeUser('TRANSPORTADOR'))
    expect(ability.can('manage', 'Shipment')).toBe(true)
    expect(ability.can('manage', 'Invoice')).toBe(false)
  })

  it('usuário sem papel não pode fazer nada', () => {
    const ability = factory.createForUser(makeUser(null))
    expect(ability.can('read', 'Supplier')).toBe(false)
  })
})
```

#### `common/guards/auth.guard.spec.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

vi.mock('../../modules/auth/better-auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}))
vi.mock('better-auth/node', () => ({
  fromNodeHeaders: (h: unknown) => h,
}))

import { auth } from '../../modules/auth/better-auth'
import { AuthGuard } from './auth.guard'

const makeContext = (params: Record<string, string> = {}): ExecutionContext =>
  ({
    getHandler: () => ({}),
    getClass:   () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ params, headers: {} }),
    }),
  }) as unknown as ExecutionContext

describe('AuthGuard', () => {
  let guard: AuthGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) } as any
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from:   vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where:  vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
      then:   vi.fn().mockResolvedValue(null),
    }
    guard = new AuthGuard(mockDb as any, reflector)
  })

  it('permite rota @Public() sem verificar sessão', async () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(true)
    const result = await guard.canActivate(makeContext())
    expect(result).toBe(true)
    expect(auth.api.getSession).not.toHaveBeenCalled()
  })

  it('lança UnauthorizedException sem sessão válida', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException)
  })

  it('enriquece request.user com role e companyId quando membership encontrado', async () => {
    const mockSession = { user: { id: 'u1', email: 'a@b.com', name: 'A' } }
    vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any)

    const ctx = makeContext({ cnpj: '00000000000191' })
    const request = ctx.switchToHttp().getRequest() as any

    // Simula membership encontrado
    const mockDb = (guard as any).db
    mockDb.then.mockResolvedValueOnce({ role: 'COMPRADOR', companyId: 'c1' })

    await guard.canActivate(ctx)

    expect(request['user']).toMatchObject({ role: 'COMPRADOR', companyId: 'c1' })
  })

  it('lança ForbiddenException se sem membership e não é SUPER_ADMIN', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({
      user: { id: 'u1', email: 'a@b.com', name: 'A' },
    } as any)

    const mockDb = (guard as any).db
    mockDb.then
      .mockResolvedValueOnce(null)   // membership → null
      .mockResolvedValueOnce([])     // super admin check → []

    await expect(
      guard.canActivate(makeContext({ cnpj: '00000000000191' })),
    ).rejects.toThrow(ForbiddenException)
  })
})
```

#### `modules/health/health.controller.spec.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { Test } from '@nestjs/testing'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  it('retorna status ok com timestamp ISO válido', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()

    const controller = module.get(HealthController)
    const result = controller.check()

    expect(result.status).toBe('ok')
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp)
  })
})
```

---

## Checklist de Conclusão

- [ ] `pnpm build --filter api` compila sem erros TypeScript
- [ ] `pnpm test --filter api` — todos os 4 spec files passam
- [ ] `GET /health` → `200 { status: 'ok', timestamp: '...' }`
- [ ] `GET /reference` → Scalar UI carrega com spec OpenAPI
- [ ] `GET /openapi.json` → JSON do spec OpenAPI retornado corretamente
- [ ] Request sem autenticação para rota protegida → `401`
- [ ] `POST /api/auth/sign-in/email` com credenciais válidas → `200` + cookie de sessão
- [ ] Request com cookie válido para rota protegida → `404` (rota não existe ainda, não `401`)
- [ ] Request de origin diferente de `FRONTEND_URL` → bloqueado pelo CORS
- [ ] `GET /v1/health` → `404` (health está fora do prefixo `/v1`)

---

## Invariantes Verificadas

| Invariante                                        | Como esta unidade cumpre |
| ------------------------------------------------- | ------------------------ |
| `BETTER_AUTH_SECRET` sempre via `process.env`     | `better-auth.ts` usa `process.env.BETTER_AUTH_SECRET!` |
| CORS com whitelist explícita                      | `enableCors({ origin: [process.env.FRONTEND_URL!] })` |
| `catch {}` vazio proibido                         | `GlobalExceptionFilter` loga; `bootstrap()` tem `.catch()` |
| Nenhum secret hardcoded                           | Todos os envs lidos de `process.env` |
| `@Public()` como opt-out, não opt-in              | `APP_GUARD` protege globalmente; rotas abertas exigem decorator explícito |
| Plugin 2FA não instalado                          | Comentário explícito em `better-auth.ts` |
| Better-Auth rotas excluídas do prefixo `/v1`      | `setGlobalPrefix` com `exclude` explícito |
| SUPER_ADMIN bypass documentado e implementado     | `auth.guard.ts` verifica membership global antes de dar acesso à empresa |

---

## Notas de Implementação

**Por que `APP_GUARD` em vez de `@UseGuards(AuthGuard)` por controller?**
O modelo opt-out (global + `@Public()` para abrir) é mais seguro. Com `APP_GUARD`,
a proteção é default — o dev precisa fazer um ato consciente para abrir uma rota.
No modelo opt-in, uma rota esquecida sem `@UseGuards` ficaria exposta silenciosamente.

**Por que Better-Auth usa `db/index.ts` e não o DRIZZLE token do NestJS?**
`better-auth.ts` é executado no carregamento do arquivo — neste ponto, o container
NestJS ainda não inicializou. A instância standalone resolve o problema sem criar
uma segunda pool postgres: `DrizzleModule` passa a exportar `useValue: db`
(mesma referência de objeto).

**Por que `toNodeHandler(auth)` e não `toWebRequest/toNodeResponse`?**
`toNodeHandler` é a API de alto nível para Node.js/Express — internaliza a
conversão Web API ↔ Node.js incluindo cookies e redirects. As APIs de baixo nível
`toWebRequest/toNodeResponse` requerem gerenciamento manual de headers de resposta
e são mais propensas a bugs.

**Resolução da Open Question 0.3 — SUPER_ADMIN bypass:**
O AuthGuard verifica membership direto na empresa. Se não encontrar, verifica se
o usuário tem `role = 'SUPER_ADMIN'` em qualquer empresa. Se sim, resolve o
`companyId` via CNPJ e dá acesso. Isso evita criar memberships pré-configurados
para o SUPER_ADMIN em cada nova empresa. O `progress-tracker.md` deve ter esta
Open Question marcada como resolvida após implementação.
