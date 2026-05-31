# Elos — Padrões de Código

## Princípios Gerais

- Módulos pequenos e com responsabilidade única. Um Service faz uma coisa por domínio.
- Corrija a causa raiz — nunca adicione workarounds em cima de problemas existentes.
- Não misture concerns não relacionados em um único Controller ou Service.
- Legibilidade é mais importante que brevidade. Código é lido muito mais do que escrito.
- Quando em dúvida, consulte `architecture.md` antes de criar uma abstração nova.

---

## TypeScript

- **Strict mode é obrigatório** em todos os pacotes do monorepo (`"strict": true`).
- **Proibido usar `any`** — use tipos explícitos, `unknown` com narrowing, ou
  `z.infer<typeof schema>` de schemas Zod.
- **Valide toda entrada externa nas fronteiras do sistema.** Bodies, params e
  query strings devem passar pelo `ZodValidationPipe` antes de qualquer lógica.
- **Tipos derivados de schemas Zod** via `z.infer<typeof mySchema>` — não reescreva
  interfaces que já existem como schema.
- **Proibido `!` (non-null assertion)** exceto após verificação de auth no Guard.
- Nomeação: `camelCase` para variáveis/funções, `PascalCase` para tipos/interfaces/
  classes/decorators/componentes, `SCREAMING_SNAKE_CASE` para constantes de módulo,
  `kebab-case` para nomes de arquivo.

---

## Segurança (regras inegociáveis)

- **Nenhum secret hardcoded.** `BETTER_AUTH_SECRET`, `DATABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY` e qualquer credencial vêm exclusivamente de
  variáveis de ambiente.
- **`.env` com credenciais reais nunca é commitado.** Apenas `.env.example` com
  placeholders vai ao repositório.
- **Better-Auth gerencia o hash de senha.** Nunca chamar `bcrypt` manualmente para
  senhas de usuário — o lib já faz isso internamente com rounds seguros.
- **CORS sempre com whitelist explícita.**
- **`SUPABASE_SERVICE_ROLE_KEY` nunca no frontend** — apenas no backend.

---

## NestJS — Estrutura de Módulos

Cada domínio de negócio é um NestJS Module independente. Estrutura padrão:

```
modules/suppliers/
  suppliers.module.ts        ← Importa DrizzleModule, AbilityModule
  suppliers.controller.ts    ← Rotas HTTP; usa AuthGuard e ZodValidationPipe
  suppliers.service.ts       ← Lógica de negócio + CASL check + Drizzle
  dto/
    create-supplier.dto.ts   ← Tipo derivado do schema Zod shared
    update-supplier.dto.ts
```

### Controller

O Controller é fino: valida input, injeta usuário e delega ao Service.
**Não faz CASL check** — isso é responsabilidade do Service.

```typescript
@Controller('companies/:cnpj/suppliers')
@UseGuards(AuthGuard)   // AuthGuard já enriquece user com role e companyId
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    // cnpj não precisa mais ser passado — user.companyId já foi resolvido pelo AuthGuard
    return this.suppliersService.create(body, user)
  }

  @Get()
  findAll(@CurrentUser() user: SessionUser) {
    return this.suppliersService.findAll(user)
  }
}
```

### Service

O Service é onde vivem: CASL check, lógica de negócio, query Drizzle e audit log.

```typescript
@Injectable()
export class SuppliersService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  async create(dto: CreateSupplierDto, user: SessionUser) {
    // 1. CASL check — sempre antes de qualquer mutação
    const ability = this.abilityFactory.createForUser(user)
    if (ability.cannot('create', 'Supplier')) {
      throw new ForbiddenException('Sem permissão para criar fornecedor.')
    }

    // 2. Lógica de negócio + audit log na mesma transação
    const [supplier] = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(suppliers)
        .values({ ...dto, companyId: user.companyId })
        .returning()

      await tx.insert(auditLogs).values({
        entity: 'Supplier',
        entityId: created.id,
        action: 'CREATE',
        after: created,
        userId: user.id,
        companyId: user.companyId,
      })

      return [created]
    })

    return supplier
  }

  async findAll(user: SessionUser) {
    return this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyId, user.companyId))  // tenant scope obrigatório
      .orderBy(desc(suppliers.createdAt))
  }
}
```

---

## Guards, Decorators e Pipes

### AuthGuard

Faz **duas coisas**: verifica a sessão Better-Auth e enriquece `request.user`
com `role` e `companyId` via query Drizzle. Sem esse enriquecimento, o CASL
não tem dados suficientes para construir as regras do usuário.

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const isPublic = this.reflector.get(IS_PUBLIC_KEY, context.getHandler())
    if (isPublic) return true

    // 1. Verificar sessão Better-Auth
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })
    if (!session) throw new UnauthorizedException()

    // 2. Resolver empresa ativa e papel do usuário
    const cnpj = request.params?.cnpj
    let role: Role | null = null
    let companyId: string | null = null

    if (cnpj) {
      const membership = await this.db
        .select({
          role: companyMembers.role,
          companyId: companies.id,
        })
        .from(companyMembers)
        .innerJoin(companies, eq(companies.id, companyMembers.companyId))
        .where(
          and(
            eq(companyMembers.userId, session.user.id),
            eq(companies.cnpj, cnpj),
          )
        )
        .limit(1)
        .then(rows => rows[0] ?? null)

      if (!membership) {
        throw new ForbiddenException('Acesso negado a esta empresa.')
      }

      role = membership.role
      companyId = membership.companyId
    }

    // 3. Enriquecer request.user com dados de contexto do Elos
    request['user'] = {
      ...session.user,
      role,       // papel na empresa ativa (null para rotas sem cnpj, ex: /v1/companies)
      companyId,  // id da empresa ativa
    }

    return true
  }
}
```

### ZodValidationPipe

```typescript
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException(result.error.flatten())
    }
    return result.data
  }
}

// Uso no Controller:
@Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierDto
```

### Decorators disponíveis

```typescript
@Public()       // Marca rota como pública — sem autenticação (ex: health check)
@CurrentUser()  // Injeta SessionUser enriquecido (com role e companyId)
```

> **`@Roles()` foi removido.** CASL é o único mecanismo de autorização.
> Checks de permissão ficam no Service, nunca no Controller.

---

## Tratamento de Erros

### GlobalExceptionFilter

Registrado globalmente em `main.ts`. Mapeia exceções do NestJS e do domínio
para HTTP responses consistentes:

```typescript
// Usar exceções do NestJS — o filter mapeia automaticamente:
throw new BadRequestException('CNPJ inválido.')      // → 400
throw new UnauthorizedException()                    // → 401
throw new ForbiddenException('Sem permissão.')       // → 403
throw new NotFoundException('Fornecedor não encontrado.') // → 404
throw new ConflictException('CNPJ já cadastrado.')   // → 409

// Shape de resposta padronizado:
// { statusCode, message, error, timestamp, path }
```

### Frontend

```typescript
// ✅ Correto — erro sempre tratado
try {
  await createSupplier(data)
  toast.success('Fornecedor criado com sucesso.')
} catch (error) {
  console.error('[createSupplier]', error)
  toast.error('Erro ao criar fornecedor. Tente novamente.')
}

// ❌ Proibido — catch vazio
try {
  await getSession()
} catch {}
```

Toda página protegida deve ter `error.tsx` no mesmo nível para capturar erros
de fetch não tratados no Server Component.

---

## Better-Auth — Padrões de Integração

### Tipo SessionUser

O tipo que circula pelo sistema após o enriquecimento do AuthGuard:

```typescript
// common/types/session-user.ts
export interface SessionUser {
  id: string          // Better-Auth user id
  email: string
  name: string
  role: Role | null   // papel na empresa ativa (enum de packages/shared)
  companyId: string | null  // id da empresa ativa no banco
}
```

### Rate Limiting (`@nestjs/throttler`)

Configurado globalmente no `AppModule`, com override nas rotas de auth:

```typescript
// app.module.ts
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])

// auth.controller.ts — rotas de login têm limite mais restrito
@Throttle({ default: { limit: 5, ttl: 60_000 } })
@All('*') handler() { ... }
```

### Instância (apps/api/src/modules/auth/better-auth.ts)

```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '../../db'
import * as schema from '../../db/schema/auth'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,                          // Tabelas auth definidas em db/schema/auth.ts
  }),
  emailAndPassword: { enabled: true },
  // Sem plugin twoFactor — não instalar na v1
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
})
```

### Controller que monta as rotas HTTP do Better-Auth

```typescript
@Controller('api/auth')
@Public()
export class AuthController {
  @All('*')
  async handler(@Req() req: Request, @Res() res: Response) {
    const response = await auth.handler(toWebRequest(req))
    return toNodeResponse(response, res)
  }
}
```

### Client (apps/web/src/lib/auth-client.ts)

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL!,
})

export const { signIn, signUp, signOut, useSession } = authClient
```

### Verificação de sessão em Server Components

```typescript
// app/(app)/layout.tsx
import { auth } from '@/lib/server-auth'
import { headers } from 'next/headers'

const session = await auth.api.getSession({ headers: await headers() })
if (!session) redirect('/sign-in')
```

---

## Schemas Zod e Contratos de API

- **`packages/shared`** é a **única** fonte de verdade para schemas Zod de
  contratos de API.
- Tanto `apps/api` quanto `apps/web` importam de `@elos/shared`.
- **Nunca duplicar** um schema — importe de shared.
- DTOs no backend são tipos derivados via `z.infer<typeof schema>`:
  ```typescript
  // packages/shared/src/schemas/supplier.ts
  export const createSupplierSchema = z.object({
    name: z.string().min(2).max(255),
    cnpj: z.string().length(14),
    email: z.string().email().optional(),
  })
  export type CreateSupplierDto = z.infer<typeof createSupplierSchema>
  ```

---

## Banco de Dados e Drizzle

### DrizzleModule (NestJS)

```typescript
// apps/api/src/db.module.ts
import { Module, Global } from '@nestjs/common'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './db/schema'

export const DRIZZLE = Symbol('DRIZZLE')

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const client = postgres(process.env.DATABASE_URL!, {
          max: 10,
        })
        return drizzle(client, {
          schema,
          logger: process.env.NODE_ENV === 'development',
        })
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
```

### Injeção nos Services

```typescript
import { Inject, Injectable } from '@nestjs/common'
import { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { DRIZZLE } from '../../db.module'
import * as schema from '../../db/schema'

type DrizzleDB = NodePgDatabase<typeof schema>

@Injectable()
export class SuppliersService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}
}
```

### Padrões de Query

```typescript
import { eq, and, desc, ilike } from 'drizzle-orm'
import { suppliers } from '../../db/schema/suppliers'

// ✅ Correto — query sempre escopada ao tenant
const result = await this.db
  .select()
  .from(suppliers)
  .where(
    and(
      eq(suppliers.companyId, companyId),       // tenant scope obrigatório
      eq(suppliers.status, 'APPROVED'),
    )
  )
  .orderBy(desc(suppliers.createdAt))

// ✅ Insert
const [supplier] = await this.db
  .insert(suppliers)
  .values({ ...dto, companyId })
  .returning()

// ✅ Update
await this.db
  .update(suppliers)
  .set({ status: 'APPROVED' })
  .where(
    and(
      eq(suppliers.id, id),
      eq(suppliers.companyId, companyId),       // nunca esquecer o tenant scope
    )
  )

// ❌ Proibido — query sem filtro de tenant
const all = await this.db.select().from(suppliers)
```

### Definição de Tabelas (Schema)

```typescript
// apps/api/src/db/schema/suppliers.ts
import { pgTable, uuid, varchar, text, pgEnum, timestamp } from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const supplierStatusEnum = pgEnum('supplier_status', [
  'PENDING', 'APPROVED', 'REJECTED',
])

export const suppliers = pgTable('suppliers', {
  id:        uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name:      varchar('name', { length: 255 }).notNull(),
  cnpj:      varchar('cnpj', { length: 14 }).unique(),
  email:     varchar('email', { length: 255 }),
  status:    supplierStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type Supplier = typeof suppliers.$inferSelect
export type InsertSupplier = typeof suppliers.$inferInsert
```

### drizzle-zod — Derivação de Schemas

```typescript
// apps/api/src/db/schema/suppliers.ts (continuação)
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Schema de insert com validações de negócio adicionais
export const insertSupplierSchema = createInsertSchema(suppliers, {
  cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos'),
  email: z.string().email().optional(),
  name: z.string().min(2).max(255),
}).omit({ id: true, createdAt: true, updatedAt: true, companyId: true })

// Em packages/shared: schema de API (derivado ou escrito à mão)
// O shared schema pode ser mais restritivo que o DB schema
```

### Migrations (Drizzle Kit)

```typescript
// drizzle.config.ts (raiz de apps/api)
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

Comandos:
```bash
# Gerar migration a partir do schema TypeScript
pnpm drizzle-kit generate

# Revisar o SQL gerado em src/db/migrations/ antes de aplicar

# Aplicar migration no banco
pnpm drizzle-kit migrate

# Inspecionar banco via UI
pnpm drizzle-kit studio
```

Regras de migrations:
- **Nunca editar migrations geradas** — apenas gere novas.
- **Sempre revisar o SQL gerado** antes de aplicar em produção.
- **Seed separado** (`src/db/seed.ts`) — nunca misturar com migrations.
- **Sem `logger: true` em produção** (configurado no DrizzleModule).

---

## Supabase Storage — Padrões de Upload

- Uploads de arquivo (NFs, documentos de fornecedor) vão para Supabase Storage.
- O backend gera uma **signed URL** com tempo de expiração; o frontend faz upload
  direto para o Storage sem passar pelo backend.
- Apenas a `SUPABASE_SERVICE_ROLE_KEY` (backend) pode gerar signed URLs de upload.
- Metadados do arquivo (nome, tamanho, URL, bucket path) são salvos no banco
  via Drizzle após o upload confirmado.

---

## Testes

- **Todo Controller e Service tem testes Vitest.** Mínimo: happy path + 403 +
  404 + 400.
- **Drizzle mock** — injete uma instância fake via símbolo `DRIZZLE` no `TestingModule`:
  ```typescript
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([mockSupplier]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    transaction: vi.fn((cb) => cb(mockDb)),
  }

  const module = await Test.createTestingModule({
    providers: [
      SuppliersService,
      { provide: DRIZZLE, useValue: mockDb },
      { provide: AbilityFactory, useValue: { createForUser: vi.fn() } },
    ],
  }).compile()
  ```
- **React Testing Library** para componentes de formulário críticos.
- **Playwright** para fluxos E2E: sign-in, criar cotação, aprovar pedido.
- **Meta de cobertura**: ≥ 80% nos caminhos de lógica de negócio críticos.
- Testes ficam em `src/modules/[domain]/__tests__/` no backend e
  `__tests__/` ao lado do componente no frontend.

---

## Organização de Arquivos

| Pasta                                      | O que pertence aqui                                     |
| ------------------------------------------ | ------------------------------------------------------- |
| `apps/api/src/modules/[domain]/`           | Module + Controller + Service + DTOs por domínio        |
| `apps/api/src/db/schema/`                 | Definições de tabela Drizzle por domínio                |
| `apps/api/src/db/relations.ts`            | Todas as relações Drizzle                               |
| `apps/api/src/db/migrations/`             | Migrations geradas pelo Drizzle Kit (não editar)        |
| `apps/api/src/db.module.ts`               | DrizzleModule global — provê instância db               |
| `apps/api/src/common/guards/`             | AuthGuard, RolesGuard                                   |
| `apps/api/src/common/decorators/`         | @CurrentUser, @Roles, @Public                           |
| `apps/api/src/common/filters/`            | GlobalExceptionFilter                                   |
| `apps/api/src/common/pipes/`              | ZodValidationPipe                                       |
| `apps/api/src/common/ability/`            | AbilityFactory CASL + AbilityModule                     |
| `apps/api/src/modules/auth/`              | Better-Auth instance + NestJS controller de auth        |
| `apps/web/src/components/ui/`             | Primitivos shadcn — CLI only; nunca editar              |
| `apps/web/src/components/domain/`         | Componentes compostos de domínio                        |
| `packages/shared/src/schemas/`            | Schemas Zod de contratos de API                         |
| `packages/shared/src/types/`             | Tipos derivados (`type Supplier = z.infer<…>`)          |

---

## Convenções de Nomenclatura

| Tipo                        | Convenção                    | Exemplo                           |
| --------------------------- | ---------------------------- | --------------------------------- |
| NestJS Module               | `[domain].module.ts`         | `suppliers.module.ts`             |
| NestJS Controller           | `[domain].controller.ts`     | `suppliers.controller.ts`         |
| NestJS Service              | `[domain].service.ts`        | `suppliers.service.ts`            |
| DTO                         | `[verbo]-[domain].dto.ts`    | `create-supplier.dto.ts`          |
| Schema Zod (shared)         | `[domain].ts`                | `supplier.ts`                     |
| Componente React            | `[domain]-[papel].tsx`       | `supplier-form.tsx`               |
| Hook customizado            | `use-[nome].ts`              | `use-form-state.ts`               |
| Testes                      | `[arquivo].spec.ts(x)`       | `suppliers.service.spec.ts`       |

---

## Documentação de API (Swagger + Scalar)

A API expõe um OpenAPI spec gerado pelo `@nestjs/swagger`. A UI de referência é
servida pelo Scalar em `/reference` (substitui o Swagger UI padrão).

### Pacotes necessários

```bash
pnpm add @nestjs/swagger @scalar/nestjs-api-reference --filter api
```

> **Não instalar** `swagger-ui-express` nem `fastify-swagger-ui` — o Scalar os substitui.

### Setup em `main.ts`

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { apiReference } from '@scalar/nestjs-api-reference'

// Após criar o app NestJS:

const config = new DocumentBuilder()
  .setTitle('Elos API')
  .setDescription('API de gestão de cadeia de suprimentos')
  .setVersion('1.0')
  .addCookieAuth('better-auth.session_token')  // cookie httpOnly do Better-Auth
  .build()

const document = SwaggerModule.createDocument(app, config)

// Scalar UI — disponível em GET /reference
app.use(
  '/reference',
  apiReference({
    spec: { content: document },
    theme: 'default',
  }),
)

// Também expõe o JSON do spec em /openapi.json (útil para geração de client)
app.use('/openapi.json', (_req: unknown, res: { json: (d: unknown) => void }) => {
  res.json(document)
})
```

### Decorators de OpenAPI nos Controllers

Use os decorators do `@nestjs/swagger` para enriquecer o spec. Exemplos mínimos:

```typescript
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger'

@ApiTags('suppliers')        // Agrupa no Scalar por tag
@ApiCookieAuth()             // Indica que a rota requer o cookie de sessão
@Controller('companies/:cnpj/suppliers')
@UseGuards(AuthGuard)
export class SuppliersController {

  @Post()
  @ApiOperation({ summary: 'Criar fornecedor' })
  @ApiResponse({ status: 201, description: 'Fornecedor criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  create(
    @Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.create(body, user)
  }
}
```

### Zod → OpenAPI (schemas automáticos)

Como os DTOs são derivados de schemas Zod (`z.infer<typeof schema>`), use o
`@anatine/zod-openapi` para que o Swagger gere a documentação dos campos
automaticamente, sem precisar decorar cada propriedade com `@ApiProperty`.

```bash
pnpm add @anatine/zod-openapi --filter api
```

```typescript
// packages/shared/src/schemas/supplier.ts
import { extendApi } from '@anatine/zod-openapi'
import { z } from 'zod'

export const createSupplierSchema = extendApi(
  z.object({
    name: z.string().min(2).max(255),
    cnpj: z.string().length(14),
    email: z.string().email().optional(),
  }),
  { title: 'CreateSupplierDto' },  // aparece como nome do schema no Scalar
)

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>
```

```typescript
// main.ts — inicialização do OpenAPI
import { generateSchema } from '@anatine/zod-openapi'
import { SwaggerModule } from '@nestjs/swagger'

// Antes de chamar SwaggerModule.createDocument:
SwaggerModule.setup('docs', app, document)  // não usar — usar Scalar abaixo
```

> **Regra:** `extendApi` é aplicado apenas nos schemas em `packages/shared`.
> Nunca em schemas internos do banco (`apps/api/src/db/schema/`).

### Convenções

- Toda tag de `@ApiTags` usa o nome do domínio no plural em inglês: `'suppliers'`,
  `'products'`, `'purchase-orders'`.
- Rotas públicas (sem auth) usam `@Public()` + não incluem `@ApiCookieAuth()`.
- A rota `/api/auth/*` do Better-Auth **não é documentada** no Swagger — é gerenciada
  pelo Better-Auth e documentada separadamente se necessário.
- O endpoint `/reference` é excluído do global prefix `/v1`:
  ```typescript
  app.setGlobalPrefix('v1', {
    exclude: [
      { path: 'api/auth/(.*)', method: RequestMethod.ALL },
      'health',
      'reference',
      'openapi.json',
    ],
  })
  ```

---

## Tooling

| Ferramenta      | Status esperado                                                        |
| --------------- | ---------------------------------------------------------------------- |
| TypeScript      | Strict mode em todos os pacotes                                        |
| Biome           | Linter + formatter unificado na raiz do monorepo; zero warnings no CI |
| Husky           | Pre-commit: `lint-staged` (biome check); pre-push: type-check         |
| `.nvmrc`        | Node.js LTS na raiz                                                    |
| `.env.example`  | Em `apps/api/` e `apps/web/` com todos os vars + comentários inline   |
| GitHub Actions  | CI em PR: lint + type-check + test; CI em main: build completo        |
| Turborepo       | Cache de build e tasks paralelas — nunca rodar `tsc` por app isolado  |
