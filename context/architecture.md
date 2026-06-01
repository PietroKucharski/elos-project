# Elos — Arquitetura

## Stack

| Camada         | Tecnologia                          | Papel                                                        |
| -------------- | ----------------------------------- | ------------------------------------------------------------ |
| Monorepo       | Turborepo + pnpm workspaces         | Build cache, task orchestration e múltiplas unidades deployáveis |
| API Framework  | NestJS + TypeScript                 | Servidor HTTP do backend (módulos, guards, DI container)     |
| Validação      | Zod + ZodValidationPipe             | Schema validation em runtime + geração de OpenAPI            |
| Rate limiting  | `@nestjs/throttler`                 | Proteção contra brute force nas rotas de auth                |
| Auth           | Better-Auth (sem 2FA)               | Autenticação completa: sessões, hash de senha, rotas de auth |
| ORM            | Drizzle ORM                         | Acesso type-safe ao banco; schema em TypeScript puro         |
| Schema helper  | drizzle-zod                         | Deriva schemas Zod das tabelas Drizzle (insert/select)       |
| Migrations     | Drizzle Kit                         | Geração e aplicação de migrations SQL                        |
| Banco          | Supabase (PostgreSQL 16)            | Banco gerenciado + storage de arquivos (NFs, documentos)     |
| Permissões     | CASL                                | RBAC com 6 papéis bem definidos                              |
| Frontend       | Next.js 15 + React 19               | Aplicação web                                                |
| Estilo         | Tailwind CSS 4 + shadcn/ui          | Componentes de UI                                            |
| HTTP Client    | ky                                  | Chamadas tipadas do frontend → backend                       |
| Auth Client    | Better-Auth client                  | Gerenciamento de sessão no frontend                          |
| Pacote Shared  | `packages/shared`                   | Schemas Zod e tipos TypeScript compartilhados                |
| Lint + Format  | Biome                               | Linter e formatter unificado (substitui ESLint + Prettier)   |
| Testes         | Vitest + React Testing Library      | Testes unitários e de componente                             |
| Testes E2E     | Playwright                          | Fluxos críticos end-to-end                                   |
| CI             | GitHub Actions                      | Lint + testes + build em todo PR                             |
| Documentação   | `@nestjs/swagger` + Scalar          | Geração de OpenAPI spec + UI de referência em `/reference`   |
| Containers     | Docker + Docker Compose             | Build e execução dos apps em container; dev local sem instalar Node globalmente |

---

## Estrutura do Monorepo (Turborepo)

```
elos/
  turbo.json                        ← Pipeline de tasks (build, dev, lint, test)
  package.json                      ← Scripts raiz (turbo run dev, build, lint, test)
  pnpm-workspace.yaml
  .nvmrc                            ← Node.js LTS version
  docker-compose.yml                ← Dev local: api + web + postgres
  docker-compose.prod.yml           ← Override de produção (sem postgres local)
  .dockerignore                     ← node_modules, .next, dist, .env
  apps/
    api/                            ← NestJS backend
      src/
        modules/
          auth/                     ← Better-Auth module + NestJS integration
            auth.module.ts
            auth.controller.ts      ← Monta as rotas HTTP do Better-Auth
            better-auth.ts          ← Instância configurada do Better-Auth
          users/
          companies/
          suppliers/
          products/
          quotations/
          purchase-orders/
          receipts/
          invoices/
          payments/
          warehouses/
          stock-movements/
          non-conformities/
          logistics/
          audit-logs/
        common/
          guards/
            auth.guard.ts           ← Verifica sessão via Better-Auth
            roles.guard.ts          ← Verifica permissão via CASL
          decorators/
            current-user.decorator.ts
            roles.decorator.ts
            public.decorator.ts     ← Marca rota como pública (sem auth)
          filters/
            global-exception.filter.ts  ← Mapeia exceções para HTTP codes
          interceptors/                   ← Reservado para interceptors transversais (logging HTTP, etc.)
          pipes/
            zod-validation.pipe.ts      ← Valida body/params com Zod schema
          ability/
            ability.factory.ts      ← CASL: cria AppAbility por usuário
            ability.module.ts
        db/
          schema/                   ← Definições de tabela Drizzle em TypeScript
            auth.ts                 ← Tabelas Better-Auth (user, session, account, verification)
            companies.ts
            suppliers.ts
            products.ts
            quotations.ts
            purchase-orders.ts
            receipts.ts
            invoices.ts
            payments.ts
            warehouses.ts
            stock-movements.ts
            non-conformities.ts
            logistics.ts
            audit-logs.ts
          relations.ts              ← Todas as relações Drizzle centralizadas
          index.ts                  ← Re-exporta schema completo
        db.module.ts                ← NestJS module global que provê instância Drizzle
        app.module.ts
        main.ts
      drizzle.config.ts             ← Configuração do Drizzle Kit
      .env.example
      Dockerfile                    ← Multi-stage: build → runner (node:22-alpine)
    web/                            ← Next.js frontend
      src/
        app/
          (app)/                    ← Layout protegido; requer sessão Better-Auth
            [cnpj]/
              dashboard/
              suppliers/
              products/
              quotations/
              purchase-orders/
              receipts/
              invoices/
              payments/
              warehouses/
              non-conformities/
              audit-logs/
              settings/
          (auth)/                   ← Páginas públicas
            sign-in/
            sign-up/
        components/
          ui/                       ← shadcn/ui — NÃO EDITAR DIRETAMENTE
          domain/                   ← Componentes de domínio compostos
        hooks/
        lib/
          auth-client.ts            ← Better-Auth client (createAuthClient)
          api-client.ts             ← ky com session token automático
      .env.example
      Dockerfile                    ← Multi-stage: build → runner (node:22-alpine)
  packages/
    shared/                         ← @elos/shared
      src/
        schemas/                    ← Schemas Zod por domínio (única fonte de verdade)
          auth.ts
          company.ts
          supplier.ts
          product.ts
          quotation.ts
          purchase-order.ts
          receipt.ts
          invoice.ts
          payment.ts
          warehouse.ts
          stock-movement.ts
          non-conformity.ts
          audit-log.ts
        types/                      ← z.infer<typeof schema> — tipos derivados
        enums.ts                    ← Enums compartilhados (Role, Status…)
```

---

## Turborepo — Pipeline de Tasks

`turbo.json` na raiz define a ordem e o cache de cada task:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

Scripts no `package.json` raiz:
```json
{
  "scripts": {
    "dev":        "turbo run dev",
    "build":      "turbo run build",
    "lint":       "turbo run lint",
    "test":       "turbo run test",
    "type-check": "turbo run type-check"
  }
}
```

---

## Fronteiras do Sistema

| Caminho                              | O que esta fronteira possui e é responsável por                       |
| ------------------------------------ | --------------------------------------------------------------------- |
| `apps/api/src/modules/auth/`         | Instância do Better-Auth, controller que monta as rotas de auth       |
| `apps/api/src/modules/[domain]/`     | Module + Controller + Service por domínio de negócio                  |
| `apps/api/src/common/guards/`        | AuthGuard (sessão + enriquecimento de role via Drizzle)               |
| `apps/api/src/common/filters/`       | GlobalExceptionFilter — mapeia exceções para HTTP codes               |
| `apps/api/src/common/ability/`       | AbilityFactory CASL — cria as regras por papel de usuário             |
| `apps/api/src/common/pipes/`         | ZodValidationPipe — valida DTOs com schemas de `packages/shared`      |
| `apps/api/src/db/schema/`            | Definições de tabela Drizzle (fonte de verdade do schema do banco)    |
| `apps/api/src/db/relations.ts`       | Todas as relações Drizzle centralizadas                               |
| `apps/api/db.module.ts`              | NestJS module que injeta a instância Drizzle em todo o app            |
| `apps/web/src/app/(app)/`            | Páginas protegidas; verificam sessão via Better-Auth server-side      |
| `apps/web/src/app/(auth)/`           | Páginas públicas de autenticação                                      |
| `apps/web/src/components/ui/`        | Primitivos shadcn — CLI only; nunca editar manualmente                |
| `apps/web/src/lib/auth-client.ts`    | Better-Auth client configurado para o frontend                        |
| `packages/shared/src/schemas/`       | **Única fonte de verdade** para contratos de API (Zod schemas)        |

---

## Modelo de Armazenamento

- **Supabase PostgreSQL**: Todos os dados de entidade — tabelas do Better-Auth
  (user, session, account, verification) + todas as entidades do domínio Elos
  (companies, suppliers, products, quotations, purchase-orders, etc.).
- **Supabase Storage**: Arquivos físicos de anexos — PDFs de notas fiscais,
  documentos de fornecedores, comprovantes de pagamento. Na v1, upload direto
  para Storage via signed URLs geradas pelo backend.
- **Drizzle ORM**: Acesso ao banco. Usa `postgres.js` como driver conectado ao
  pooler do Supabase. Schema definido em TypeScript em `apps/api/src/db/schema/`.
- **Drizzle Kit**: Geração e aplicação de migrations. Usa `DATABASE_URL` (direta,
  sem pgBouncer) para migrations. Sem necessidade de `DIRECT_URL` separada — 
  a variável de migrations é configurada em `drizzle.config.ts`.

### Estratégia de schemas: Drizzle → drizzle-zod → packages/shared

```
apps/api/src/db/schema/*.ts          ← Fonte de verdade do banco (Drizzle)
        ↓ drizzle-zod
apps/api (uso interno)               ← createInsertSchema / createSelectSchema
        ↓ .pick() / .omit() / extend
packages/shared/src/schemas/*.ts     ← Contratos de API (Zod puro, sem dep. do banco)
        ↓ z.infer<>
packages/shared/src/types/*.ts       ← Tipos TypeScript para frontend e backend
```

O frontend importa apenas de `packages/shared` — nunca enxerga tabelas Drizzle.

---

## Modelo de Auth e Controle de Acesso (Better-Auth)

### Autenticação

- **Better-Auth** gerencia todo o ciclo de autenticação: criação de conta,
  login com e-mail + senha, sessões, logout.
- **Sem autenticação de dois fatores** — plugin 2FA não é instalado.
- Better-Auth cria e gerencia suas próprias tabelas no banco via Drizzle adapter:
  `user`, `session`, `account`, `verification`. Essas tabelas são definidas em
  `apps/api/src/db/schema/auth.ts` usando os helpers do Better-Auth para Drizzle.
- As rotas HTTP do Better-Auth são montadas em `/api/auth/*` pelo NestJS
  controller de auth (via `auth.handler`).

### Variáveis de ambiente de auth

```
BETTER_AUTH_SECRET=your-secret-min-32-chars   ← Nunca hardcoded
BETTER_AUTH_URL=https://elos.com.br           ← URL base da aplicação
```

### Fluxo de sessão

```
Frontend (Better-Auth client)
  → POST /api/auth/sign-in/email  ← Rota gerenciada pelo Better-Auth
  → Better-Auth valida credentials → cria session no Supabase
  → Retorna session token via cookie httpOnly

Próximo request (rota protegida ex: POST /v1/companies/:cnpj/suppliers):
  → Cookie com session token enviado automaticamente
  → NestJS AuthGuard:
      1. auth.api.getSession({ headers })  → session.user (id, email, name)
      2. Lê params.cnpj do request
      3. Query Drizzle: busca papel do usuário na empresa com esse cnpj
      4. Valida que o usuário pertence à empresa → ForbiddenException se não
      5. Decora request.user = { ...session.user, role, companyId }
  → Sessão inválida ou empresa não encontrada → 401 / 403
```

> **Por que o AuthGuard faz query no banco?**
> O `session.user` do Better-Auth contém apenas campos padrão (`id`, `email`,
> `name`). Em Elos, o `role` é **por empresa** — o mesmo usuário pode ser
> COMPRADOR em uma empresa e ALMOXARIFE em outra. O AuthGuard precisa enriquecer
> o objeto `user` com o papel vigente na empresa ativa antes de qualquer
> verificação de permissão.

### Autorização (CASL)

- **CASL é o único mecanismo de autorização** — não usar `@Roles()` para
  lógica de permissão. O decorator `@Roles()` está removido.
- O `AbilityFactory` cria as regras do usuário a partir de `user.role` e
  `user.companyId` (ambos enriquecidos pelo `AuthGuard`).
- Todo Service verifica `ability.cannot('action', 'Subject')` antes de qualquer
  mutação — nunca delegar essa verificação ao Controller.
- Decorators disponíveis:
  - `@Public()` — rota não requer autenticação (ex: health check)
  - `@CurrentUser()` — injeta o `SessionUser` enriquecido no parâmetro

### Multi-tenancy

- Todas as queries Drizzle que acessam dados de uma empresa incluem
  `.where(eq(table.companyId, companyId))` obrigatoriamente.
- O `companyId` ativo é obtido pelo `AuthGuard` (via cnpj → query Drizzle)
  e injetado em `request.user.companyId`.
- Um usuário pode ter papéis diferentes em empresas diferentes — o contexto
  de empresa ativa (cnpj do URL) determina qual papel está vigente.

### Audit Log — estratégia de registro

O audit log é feito de forma **explícita dentro do Service**, nunca via interceptor.

**Por quê?** Um interceptor não tem contexto suficiente: não sabe qual entidade foi
mutada, não tem o estado "antes" da mutação, e não consegue fazer um diff real
sem uma query adicional. O Service tem tudo isso disponível.

```typescript
async approveSupplier(id: string, user: SessionUser) {
  const ability = this.abilityFactory.createForUser(user)
  if (ability.cannot('update', 'Supplier')) throw new ForbiddenException()

  // 1. Busca estado antes
  const [before] = await this.db.select().from(suppliers).where(eq(suppliers.id, id))
  if (!before) throw new NotFoundException()

  // 2. Executa mutação + audit log na mesma transação
  await this.db.transaction(async (tx) => {
    await tx.update(suppliers)
      .set({ status: 'APPROVED' })
      .where(eq(suppliers.id, id))

    await tx.insert(auditLogs).values({
      entity: 'Supplier',
      entityId: id,
      action: 'APPROVE',
      before: { status: before.status },
      after: { status: 'APPROVED' },
      userId: user.id,
      companyId: user.companyId,
    })
  })
}
```

### Transações Drizzle em NestJS

Para operações que tocam múltiplas tabelas atomicamente, use o padrão de
**passar `tx` como parâmetro opcional**:

```typescript
// No Service principal
async createPurchaseOrder(dto: CreatePurchaseOrderDto, user: SessionUser) {
  await this.db.transaction(async (tx) => {
    const [order] = await tx.insert(purchaseOrders).values({...}).returning()
    await this.stockService.reserveItems(order.id, dto.items, tx)  // ← passa tx
    await tx.insert(auditLogs).values({...})
  })
}

// No StockService
async reserveItems(orderId: string, items: Item[], tx?: DrizzleTransaction) {
  const db = tx ?? this.db  // usa tx se dentro de uma transação, db caso contrário
  await db.update(stock).set({...}).where(...)
}
```

**Tipo da transação:**
```typescript
import { PgTransaction } from 'drizzle-orm/pg-core'
import * as schema from './db/schema'

export type DrizzleTransaction = PgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>
```

---

## Fluxo de Dados

```
Browser
  → Next.js Server Component (verifica sessão Better-Auth via server-side)
  → Server Action / Client fetch
  → ky HTTP client (session cookie enviado automaticamente)
  → NestJS Controller (prefixo /v1/ — Better-Auth excluído desse prefix)
  → AuthGuard (getSession + enriquece user com role e companyId via Drizzle)
  → CASL check no Service (ForbiddenException se sem permissão)
  → ZodValidationPipe (valida body/params contra schema de packages/shared)
  → Service (lógica de negócio)
  → Drizzle (query escopada ao companyId via .where(eq(table.companyId, id)))
  → Supabase PostgreSQL
  → JSON response tipado
```

---

## Variáveis de Ambiente

### `apps/api/.env.example`

```bash
# Banco (Supabase)
# Usar conexão direta (sem pgBouncer) — Drizzle + postgres.js não precisam de pooler mode
DATABASE_URL="postgresql://user:password@db.supabase.com:5432/postgres"

# Migrations (Drizzle Kit — mesma URL, só explicitado para clareza)
DATABASE_MIGRATION_URL="postgresql://user:password@db.supabase.com:5432/postgres"

# Better-Auth
BETTER_AUTH_SECRET="your-secret-here-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# App
PORT=3333
NODE_ENV=development

# Frontend (para CORS)
FRONTEND_URL="http://localhost:3000"

# Supabase Storage (para uploads)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### `apps/web/.env.example`

```bash
# API
NEXT_PUBLIC_API_URL="http://localhost:3333"

# Better-Auth
BETTER_AUTH_URL="http://localhost:3000"

# Supabase (apenas se usar Supabase JS client para uploads diretos)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

---

## Docker

### Estratégia

- **Dev local**: `docker compose up` sobe `api`, `web` e `postgres`. O Postgres do
  container é o **banco primário de desenvolvimento** — Supabase não é usado em dev.
  O `docker-compose.yml` sobrescreve `DATABASE_URL` **e** `DIRECT_URL` do serviço `api`
  para o `postgres` local, então migrations e seed rodam dentro do container e nunca
  tocam o Supabase:
  - `docker compose exec api pnpm db:migrate`
  - `docker compose exec api pnpm db:seed`
- **Produção / staging**: `docker-compose.prod.yml` override — sem `postgres`
  local; `DATABASE_URL` (pooler) e `DIRECT_URL` (conexão direta) apontam para o
  Supabase, injetados pelo ambiente do servidor.
- **Builds**: cada app tem seu próprio `Dockerfile` multi-stage para imagens
  enxutas (~150 MB com `node:22-alpine`).

### `apps/api/Dockerfile`

```dockerfile
# ─── Estágio 1: dependências ──────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ─── Estágio 2: build ─────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter api build

# ─── Estágio 3: runner ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3333
CMD ["node", "dist/main.js"]
```

### `apps/web/Dockerfile`

```dockerfile
# ─── Estágio 1: dependências ──────────────────────────────────────────────
FROM node:22-alpine AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ─── Estágio 2: build ─────────────────────────────────────────────────────
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter web build

# ─── Estágio 3: runner ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

> O runner do `web` usa o **standalone output** do Next.js. Requer
> `output: 'standalone'` em `apps/web/next.config.ts`.

### `docker-compose.yml` (dev)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: elos
      POSTGRES_PASSWORD: elos
      POSTGRES_DB: elos
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U elos"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    env_file: apps/api/.env
    environment:
      DATABASE_URL: "postgresql://elos:elos@postgres:5432/elos"
    ports:
      - "3333:3333"
    depends_on:
      postgres:
        condition: service_healthy
    develop:
      watch:
        - action: sync
          path: ./apps/api/src
          target: /app/apps/api/src

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    env_file: apps/web/.env.local
    environment:
      NEXT_PUBLIC_API_URL: "http://api:3333"
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

> Em dev, o serviço `postgres` local substitui o Supabase. Para usar Supabase
> cloud, basta omitir o serviço `postgres` e apontar `DATABASE_URL` para a URL
> real — use `docker-compose.prod.yml` para isso.

### `docker-compose.prod.yml` (override de produção)

```yaml
services:
  postgres:
    profiles: ["disabled"]   # Remove o postgres local

  api:
    environment:
      DATABASE_URL: ""   # Sobrescrito via env real no deploy
    restart: always

  web:
    restart: always
```

### `.dockerignore` (raiz)

```
node_modules
.next
dist
build
coverage
.env
.env.local
.env.*.local
apps/*/node_modules
packages/*/node_modules
```

---

## Invariantes

As regras abaixo **nunca** devem ser violadas.

1. **`BETTER_AUTH_SECRET` sempre via env.** `process.env.BETTER_AUTH_SECRET` —
   nunca string literal no código.

2. **`DATABASE_URL` sempre via env.** Credenciais Supabase nunca commitadas
   (apenas `.env.example` com placeholders).

3. **CORS com whitelist explícita.**
   ```typescript
   app.enableCors({
     origin: [process.env.FRONTEND_URL!],
     credentials: true,
   })
   ```
   Nunca `enableCors()` sem opções.

4. **Drizzle logger apenas em development.**
   ```typescript
   drizzle(client, { logger: process.env.NODE_ENV === 'development' })
   ```

5. **Todas as rotas da API sob `/v1/`.** Global prefix configurado em `main.ts`
   com exclusão explícita das rotas do Better-Auth e do health check:
   ```typescript
   app.setGlobalPrefix('v1', {
     exclude: [{ path: 'api/auth/(.*)', method: RequestMethod.ALL }, 'health'],
   })
   ```

6. **Todo Controller/Service de domínio tem teste Vitest correspondente.** Mínimo:
   happy path + 403 sem permissão + 404 não encontrado + 400 input inválido.

7. **`catch {}` vazio é proibido.** Todo bloco catch loga ou relança.

8. **Better-Auth gerencia o hash de senha.** Nunca chamar bcrypt manualmente para
   senhas de usuário — o Better-Auth já usa bcrypt internamente com rounds seguros.

9. **Schemas Zod para contratos de API vivem exclusivamente em `packages/shared`.**
   Nenhuma duplicação entre apps/api e apps/web. O frontend nunca importa
   diretamente de `apps/api/src/db/schema/`.

10. **A verificação CASL precede qualquer mutação no banco.** Ordem obrigatória
    no Service: verificar ability → validar regras de negócio → escrever no banco.

11. **Multi-tenancy: toda query Drizzle que acessa dados de empresa inclui
    `.where(eq(table.companyId, companyId))`.** Nenhuma query retorna dados
    cross-tenant.

12. **Supabase `service_role` key apenas no backend.** A `SUPABASE_ANON_KEY`
    pode ir ao frontend; a `SUPABASE_SERVICE_ROLE_KEY` nunca.

13. **Plugin 2FA do Better-Auth não é instalado** — manter auth simples na v1.
    Se adicionado futuramente, documentar em `progress-tracker.md` antes.

14. **Schema do banco é definido em TypeScript (Drizzle), nunca editado
    diretamente no banco.** Toda mudança de schema passa por
    `drizzle-kit generate` → revisar SQL gerado → `drizzle-kit migrate`.
