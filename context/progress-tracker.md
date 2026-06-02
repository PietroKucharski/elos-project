# Elos — Progress Tracker

Atualize este arquivo após cada mudança de implementação relevante.

---

## Fase Atual

**Fase 1 — Auth e Empresas** · `Em andamento` (1.1 e 1.2 concluídas) → próxima: **1.3**

---

## Objetivo Atual

Scaffold do monorepo Turborepo, configuração de tooling, schema Drizzle completo e
bootstrap do servidor NestJS com Better-Auth e Supabase desde o primeiro commit.

---

## Concluído

- [x] Análise do projeto anterior (Supply-Mais) — ENGINEERING_REVIEW.md
- [x] Definição do nome: **Elos**
- [x] Preenchimento de todos os context files:
  - `context/project-overview.md`
  - `context/architecture.md`
  - `context/ui-context.md`
  - `context/code-standards.md`
  - `context/ai-workflow-rules.md`
  - `context/progress-tracker.md` (este arquivo)
  - `CLAUDE.md`
- [x] Revisão da stack: Better-Auth, Supabase, Turborepo, NestJS
  - `context/architecture.md` atualizado com nova stack completa
  - `context/code-standards.md` atualizado com convenções NestJS + Better-Auth
  - `CLAUDE.md` atualizado com novas invariantes
- [x] Substituição de Prisma por Drizzle ORM
  - `context/architecture.md` atualizado com DrizzleModule, drizzle-zod, estrutura de pastas
  - `context/code-standards.md` atualizado com padrões Drizzle (queries, schema, migrations)
  - `CLAUDE.md` stack table atualizada
- [x] Adição de Docker + Docker Compose à stack
  - `context/architecture.md`: seção Docker completa (Dockerfiles multi-stage api/web,
    `docker-compose.yml` dev, `docker-compose.prod.yml`, `.dockerignore`)
  - `CLAUDE.md` e `architecture.md`: tabela de stack + decisões atualizadas
  - Limpeza de referências obsoletas (Prisma→Drizzle, Fastify→NestJS) em
    `ai-workflow-rules.md`, `code-standards.md`, `CLAUDE.md` (regra 8 e mock Drizzle)
- [x] `context/git-workflow.md` — convenção de branch, commit (Conventional sem escopo,
  inglês, uma linha), PR (4 seções) e push manual
- [x] `context/features-specs/02-tooling-spec.md` — spec da unidade 0.2 (Biome, Husky,
  lint-staged, `.env.example`, Docker)
- [x] **0.1 — Scaffold do Monorepo (Turborepo + pnpm)** — spec `01-monorepo-setup-spec.md`
  - Commit `ce0579b` (`chore: scaffold turborepo monorepo with pnpm workspaces`)
  - `git init` + branches `main` (produção) e `development`
  - `.gitignore` (`.env` ignorado, `.env.example` permitido), `.nvmrc` (`lts/*`)
  - `package.json` raiz (`private: true`) + `pnpm-workspace.yaml` (`apps/*`, `packages/*`)
  - `turbo.json` com tasks `build`, `dev`, `lint`, `test`, `type-check` (chave `tasks`, turbo v2)
  - `tsconfig.base.json` raiz com `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
  - Workspaces `@elos/api`, `@elos/web`, `@elos/shared` com `package.json` + `tsconfig.json`
  - `packages/shared/src/index.ts` (barrel vazio)
  - `README.md` com setup local
  - **Verificado:** `pnpm install`, `turbo run build`, `type-check`, `lint`, `test` rodam sem erros
- [x] **0.2 — Tooling** — spec `02-tooling-spec.md`
  - `@biomejs/biome@1.9.4`, `husky@9`, `lint-staged@17` instalados na raiz (`-w`)
  - `biome.json` na raiz (linter + formatter; `noExplicitAny`/`noUnused*` error, `noNonNullAssertion` warn)
  - Scripts `lint` (`biome check .`) em `@elos/api`, `@elos/web`, `@elos/shared`
  - `package.json` raiz: `prepare: "husky"` + config `lint-staged`
  - Hooks Husky: `pre-commit` → `pnpm lint-staged`; `pre-push` → `pnpm type-check`
  - `.env.example` em `apps/api` (8 vars) e `apps/web` (4 vars)
  - `apps/api/Dockerfile` e `apps/web/Dockerfile` (multi-stage, `node:22-alpine`)
  - `apps/web/next.config.ts` com `output: 'standalone'`
  - `docker-compose.yml` (dev: api + web + postgres, hot reload) e `docker-compose.prod.yml`
  - `.dockerignore` na raiz
  - **Verificado:** `biome check .` limpo, `pnpm lint` e `pnpm type-check` verdes nos 3 workspaces,
    pre-commit dispara `lint-staged`. Docker (`compose up`/`build`) não executado neste ambiente.
- [x] **0.3 — Schema Drizzle e Banco** — spec `03-schema-drizzle-spec.md`
  - Deps em `@elos/api`: `drizzle-orm`, `postgres`, `drizzle-zod`, `zod` + `drizzle-kit`, `tsx` (dev)
  - `packages/shared/src/enums.ts` (16 enums) + re-export no barrel `index.ts`
  - 13 arquivos de schema em `apps/api/src/db/schema/` (auth + 12 domínios) + `relations.ts` + `index.ts`
  - `drizzle.config.ts` (`DIRECT_URL ?? DATABASE_URL`) + scripts `db:generate/migrate/studio/seed`
  - `db.module.ts` (`DrizzleModule` global, símbolo `DRIZZLE`, `postgres-js`, logger só em dev)
  - `seed.ts` (SUPER_ADMIN + empresa demo + ADMIN_EMPRESA via `auth.api.signUpEmail`)
  - Migration `0000_*.sql` gerada: **33 tabelas, 18 enums**, UNIQUE em
    `user.email`/`session.token`/`companies.cnpj`/`purchase_orders.number`, FKs cascade, timestamptz
  - **Verificado:** `pnpm db:generate`, `lint`, `type-check`, `build` verdes.
    Banco vivo (`db:migrate`/`db:studio`/`db:seed`/login) não executado — sem Supabase neste ambiente.
- [x] **0.4 — Bootstrap da API (NestJS)** — spec `04-bootstrap-api-spec.md`
  - Deps em `@elos/api`: `@nestjs/{common,core,platform-express}`, `@nestjs/throttler`,
    `@nestjs/swagger`, `@casl/ability`, `better-auth`, `@scalar/nestjs-api-reference`,
    `reflect-metadata`, `rxjs` + `@nestjs/testing`, `vitest`, `tsx` (dev)
  - `src/db/index.ts` — instância Drizzle standalone (pool única compartilhada com Better-Auth);
    `db.module.ts` passou a `useValue: db` dessa instância
  - `common/`: `types/session-user.ts`, decorators `@Public()`/`@CurrentUser()`,
    `pipes/zod-validation.pipe.ts`, `filters/global-exception.filter.ts`,
    `ability/ability.factory.ts` + `ability.module.ts` (6 papéis CASL),
    `guards/auth.guard.ts` (Better-Auth + enrich `request.user` + bypass SUPER_ADMIN) e `roles.guard.ts`
  - `modules/auth/` (`better-auth.ts` + controller `/api/auth/*` `@Public()` + module) e
    `modules/health/` (`GET /health` → `{ status, timestamp }`)
  - `app.module.ts` (Throttler 100/min, DrizzleModule/AbilityModule globais, `APP_GUARD` AuthGuard + ThrottlerGuard)
  - `main.ts` (CORS whitelist, prefixo `/v1` com exclude, GlobalExceptionFilter, Scalar `/reference`, `/openapi.json`)
  - `seed.ts` re-incluído no `tsconfig` (módulo de auth da 0.4 agora existe); guard de `company` undefined
  - 4 spec files Vitest (filter, ability factory, auth guard, health) — **14 testes passando**
  - **Verificado:** `tsc --noEmit`, `biome check`, `vitest run` verdes.
    Runtime vivo (`/health`, `/reference`, login com cookie) não executado — sem banco neste ambiente.
- [x] **0.5 — Bootstrap do Frontend (Next.js)** — spec `05-bootstrap-front-spec.md`
  - Deps em `@elos/web`: `next@15`, `react@19`, `react-dom@19`, `better-auth`, `ky`,
    `react-hook-form`, `@hookform/resolvers`, `zod`, `lucide-react`,
    `@fontsource-variable/inter`, `geist` + `typescript`, `@types/*`, `tailwindcss@4`,
    `@tailwindcss/postcss` (dev). shadcn trouxe `radix-ui`, `clsx`, `class-variance-authority`,
    `tailwind-merge`, `tw-animate-css`, `next-themes`, `sonner` (a CLI `shadcn` removida das deps)
  - shadcn/ui inicializado (`-t next -b radix -p nova`, `components.json` style `radix-nova`) +
    componentes `button`, `input`, `label`, `card`, `sonner`; `lib/utils.ts` (`cn`) criado à mão
    (a init abortou antes de gerá-lo). **`form` não foi gerado** — o registry `radix-nova` não envia
    arquivo para ele; as páginas usam `react-hook-form` direto (sem o primitivo `<Form>`), então é inócuo
  - `globals.css` com todos os tokens Elos do `ui-context.md` (light-only). `@theme inline` envolve
    cada token em `hsl(...)` para as utilities do Tailwind v4 renderizarem cor válida; `@custom-variant
    dark` ancorado a `.dark` (nunca aplicada) neutraliza o `dark:` default por `prefers-color-scheme`
  - `lib/auth-client.ts` (Better-Auth `createAuthClient`), `lib/server-auth.ts` (proxy `getSession`
    via `/api/auth/get-session`, sem banco no front), `lib/api-client.ts` (`ky` `credentials: 'include'`)
  - `app/layout.tsx` (Inter via `next/font/google` + Geist Mono via `next/font/local`, `Toaster`),
    `(auth)/layout.tsx` + `sign-in`/`sign-up` (react-hook-form + Zod inline), `(app)/layout.tsx`
    (sessão server-side + redirect) e `(app)/page.tsx` (placeholder pós-login)
  - `next.config.ts` (`output: 'standalone'`, `transpilePackages: ['@elos/shared']`, serverActions),
    `tsconfig.json` (spec) + `postcss.config.mjs`; `src/index.ts` placeholder removido
  - **Verificado:** `pnpm --filter web build` compila + checa tipos + gera as 6 rotas (✓);
    `type-check` e `lint` verdes nos 3 workspaces. **Pendências de ambiente:** (a) o passo final
    `standalone` (build traces) falha com `EPERM` ao criar symlinks no Windows (mesma classe de
    limitação já documentada em `pnpm-workspace.yaml`); (b) fluxo runtime de login/redirect não
    exercitado — requer API + banco vivos.
- [x] **0.6 — GitHub Actions (CI)** — spec `06-github-actions-ci.md`
  - `.github/workflows/ci.yml` — trigger em `pull_request` e `push` para `main`; `concurrency`
    cancela runs duplicadas; cache do pnpm store (`actions/setup-node` `cache: pnpm`) e do
    Turborepo (`actions/cache` em `.turbo`)
  - Job `quality` (`lint` → `type-check` → `test` via `turbo run`, com env de teste dummy) e
    job `build` (`turbo run build` com `NEXT_PUBLIC_*` placeholder + env da API), `build` com
    `needs: quality`; `timeout-minutes` 15/20; `fetch-depth: 2` para o diff do Turborepo
  - `.github/workflows/ci.env` — arquivo de **documentação** (não carregado) das env vars do CI
    e dos secrets futuros de CD, com a invariante `SUPABASE_SERVICE_ROLE_KEY` fora do job `web`
  - **Ajuste vs. spec:** removido o input `version` do `pnpm/action-setup@v4` (a spec passava
    `PNPM_VERSION: "9"`) — o campo `packageManager: pnpm@11.1.3` do `package.json` raiz já fixa a
    versão e a action falha com "Multiple versions of pnpm specified" se ambos forem informados
  - **Verificado localmente:** YAML válido (parser); `turbo run lint`/`type-check` verdes;
    `turbo run test -- --reporter=verbose` → 14 testes passando (flag repassada ao Vitest).
    Execução real no GitHub Actions e branch protection em `main` pendentes (config no GitHub UI).

- [x] **1.1 — Shared Schemas: Empresas e Membros** — spec `07-shared-schemas-companies-members-spec.md`
  - Commit convencional esperado: `feat: add company and member zod schemas`
  - `packages/shared/src/schemas/company.ts` — `createCompanySchema` (CNPJ 14 dígitos, CEP 8 dígitos,
    UF 2 chars, demais campos opcionais), `updateCompanySchema` (`omit cnpj` + `partial` — CNPJ imutável,
    chave de tenant) e `companyResponseSchema` (campos `nullable` + `createdAt`/`updatedAt` datetime);
    tipos `CreateCompanyDto`, `UpdateCompanyDto`, `CompanyResponse` via `z.infer`
  - `packages/shared/src/schemas/member.ts` — `assignableRoles` (5 papéis, **sem SUPER_ADMIN**),
    `inviteMemberSchema`, `updateMemberRoleSchema`, `memberResponseSchema` (shape aninhado com `user`),
    `myCompanySchema` (company switcher); tipos `InviteMemberDto`, `UpdateMemberRoleDto`,
    `MemberResponse`, `MyCompany` via `z.infer`
  - Barrel `packages/shared/src/index.ts` re-exporta `./schemas/company` e `./schemas/member`
  - `zod@^4.4.3` adicionado como `dependency` de `@elos/shared` (antes ausente; necessário sob layout
    estrito do pnpm para `import { z } from 'zod'` resolver)
  - **Verificado:** `pnpm --filter @elos/shared build`, `pnpm type-check` (3 workspaces) e
    `pnpm --filter @elos/shared lint` verdes. `assignableRoles` não inclui SUPER_ADMIN;
    `cnpjSchema` (`^\d{14}$`) rejeita pontuação e tamanhos ≠ 14
  - **Ajustes vs. spec (Zod 4):** `errorMap: () => ({ message })` → `error: () => '...'` (a chave
    `errorMap` foi removida na API de erros do Zod 4); `types/company.ts` (listado na árvore de
    arquivos mas sem conteúdo na implementação detalhada nem no barrel) **não criado** — os tipos
    de empresa são exportados direto de `schemas/company.ts` via `z.infer`, espelhando o tratamento
    dos tipos de membro; formatação de cadeias colapsada pelo `biome check --write` (lint-staged)

- [x] **1.2 — Companies Module (API)** — spec `08-companies-api-spec.md`
  - Commit convencional esperado: `feat(api): add companies module with crud endpoints`
  - `apps/api/src/modules/companies/`: `companies.module.ts` (exporta `CompaniesService`),
    `companies.controller.ts` (`POST/GET /v1/companies`, `GET/PATCH /v1/companies/:cnpj`,
    Swagger tags + `ZodValidationPipe` por rota), `companies.service.ts` (create/findAll/findByCnpj/update
    com CASL antes de cada mutação e checagem de CNPJ duplicado), `companies.service.spec.ts` (10 testes),
    `companies.controller.spec.ts` (4 testes) — **28 testes da API passando no total**
  - `auth.guard.ts` — bloco `else` (rotas sem `:cnpj`): eleva `role='SUPER_ADMIN'` (com `companyId=null`)
    se o usuário for SUPER_ADMIN em alguma empresa; demais usuários ficam `role/companyId=null`
  - `ability.factory.ts` — regras `Company`: ADMIN_EMPRESA `read`+`update` escopado a `{ id: companyId }`
    (era `manage` irrestrito — removido o poder de `create`, que fica só com SUPER_ADMIN via `manage all`);
    COMPRADOR/ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR ganham `read` escopado a `{ id: companyId }`
  - `app.module.ts` — `CompaniesModule` importado
  - **Verificado:** `vitest run` (28/28), `pnpm type-check` (3 workspaces) e `biome check` verdes.
    Checklist de segurança validado (ver Decisões Arquiteturais): 403 garantido pela combinação
    guard (zera `role` de não-SUPER_ADMIN em rotas sem `:cnpj`) + CASL no Service
  - **Ajustes vs. spec (CASL/tipos/runtime):** ver tabela de Decisões Arquiteturais (1.2) — tipagem
    tagueada do subject `Company`, helper `subject()` no Service, mock thenable do Drizzle separado do
    provider injetado, `overrideGuard` no teste do controller, e `DrizzleDB`/`db/types.ts`

---

## Em Progresso

- Nada ativo. **Fase 1.2 concluída**. Próximo: **1.3 — Membros de Empresa (endpoints de membros,
  `GET /v1/me/companies`, convites)**.

---

## Próximos Passos (Fase 0)

### 0.1 — Scaffold do Monorepo (Turborepo + pnpm) ✅ Concluído (`ce0579b`)
- [x] Inicializar repositório git com `.gitignore` correto
  (nunca commitar `.env`, apenas `.env.example`)
- [x] `package.json` raiz com `pnpm-workspace.yaml` e scripts Turborepo
- [x] `turbo.json` com pipeline: `build`, `dev`, `lint`, `test`, `type-check`
- [x] Workspaces: `apps/api`, `apps/web`, `packages/shared`
- [x] `packages/shared`: `tsconfig.json` + `package.json` com nome `@elos/shared`
- [x] `.nvmrc` na raiz apontando para Node.js LTS
- [x] `README.md` na raiz: o que é o projeto, pré-requisitos, como rodar localmente

### 0.2 — Tooling ✅ Concluído (spec `02-tooling-spec.md`)
- [x] Biome configurado na raiz do monorepo (`biome.json`) — linter + formatter
- [x] Husky + lint-staged: pre-commit (`biome check --write`), pre-push (type-check)
- [x] `.env.example` em `apps/api` com todos os vars:
  ```
  DATABASE_URL="postgresql://user:password@pooler.supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://user:password@db.supabase.com:5432/postgres"
  BETTER_AUTH_SECRET="your-secret-here-min-32-chars"
  BETTER_AUTH_URL="http://localhost:3000"
  FRONTEND_URL="http://localhost:3000"
  PORT=3333
  NODE_ENV=development
  SUPABASE_URL="https://your-project.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
  ```
- [ ] `.env.example` em `apps/web`:
  ```
  NEXT_PUBLIC_API_URL="http://localhost:3333"
  BETTER_AUTH_URL="http://localhost:3000"
  NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
  ```
- [x] `apps/api/Dockerfile` — multi-stage (deps-prod → builder → runner alpine)
- [x] `apps/web/Dockerfile` — multi-stage com Next.js standalone output + ARGs `NEXT_PUBLIC_*`
- [x] `docker-compose.yml` na raiz — serviços `api`, `web`, `postgres` (dev)
- [x] `docker-compose.prod.yml` — override de produção (sem postgres local)
- [x] `.dockerignore` na raiz
- [x] `apps/web/next.config.ts` com `output: 'standalone'`

### 0.3 — Schema Drizzle e Banco (Supabase) ✅ Concluído (spec `03-schema-drizzle-spec.md`)
- [~] Configurar projeto Supabase (ou Supabase CLI local para dev) — pendente (ambiente sem banco)
- [x] `drizzle.config.ts` em `apps/api/` (usa `DIRECT_URL ?? DATABASE_URL` para migrations)
- [x] Definir tabelas em `apps/api/src/db/schema/`:
  - `auth.ts` — tabelas Better-Auth (`user`, `session`, `account`, `verification`)
  - Todos os domínios Elos (companies, suppliers, products, quotations, etc.)
  - Enums como `pgEnum` por domínio
  - `relations.ts` — todas as relações Drizzle Kit centralizadas
  - `index.ts` — re-exporta schema completo
- [x] `DrizzleModule` (`apps/api/src/db.module.ts`) com `postgres.js` como driver
- [x] Gerar primeira migration: `pnpm db:generate` (33 tabelas, 18 enums)
- [~] Revisar SQL gerado em `src/db/migrations/` e aplicar: `pnpm db:migrate` — revisado; aplicar requer banco
- [x] Seed básico (`src/db/seed.ts`):
  - 1 SUPER_ADMIN
  - 1 empresa de exemplo
  - 1 ADMIN_EMPRESA
  - (execução `db:seed` requer banco + módulo de auth da 0.4)

### 0.4 — Bootstrap da API (NestJS) ✅ Concluído (spec `04-bootstrap-api-spec.md`)
- [x] `apps/api/src/app.module.ts` com:
  - DrizzleModule (global)
  - AbilityModule (global)
  - AuthModule (Better-Auth)
  - HealthModule
- [x] `apps/api/src/main.ts`:
  - CORS com `origin: [process.env.FRONTEND_URL!]` — nunca aberto
  - GlobalExceptionFilter registrado
  - ZodValidationPipe por parâmetro (não global — cada rota tem seu schema)
  - Swagger spec gerado com `@nestjs/swagger` + Scalar UI em `/reference`
  - JSON spec exposto em `/openapi.json`
  - Prefixo global `/v1` (exceto `/api/auth/*`, `/health`, `/reference`, `/openapi.json`)
- [x] `common/filters/global-exception.filter.ts`
- [x] `common/guards/auth.guard.ts` (integração Better-Auth + bypass SUPER_ADMIN)
- [x] `common/guards/roles.guard.ts` (coarse-grained role check)
- [x] `common/ability/ability.factory.ts` (CASL — 6 papéis)
- [x] `common/pipes/zod-validation.pipe.ts`
- [x] `common/decorators/` — @CurrentUser, @Public
- [x] `modules/auth/` — instância Better-Auth + controller que monta `/api/auth/*`
- [x] Rota de health check: `GET /health` → `{ status: 'ok', timestamp }`

### 0.5 — Bootstrap do Frontend (Next.js) ✅ Concluído (spec `05-bootstrap-front-spec.md`)
- [x] `apps/web` com Next.js 15 + TypeScript + Tailwind CSS 4 + shadcn/ui
- [x] Tokens de cor de `ui-context.md` configurados em `globals.css`
- [x] `lib/auth-client.ts` — Better-Auth client (`createAuthClient`)
- [x] `lib/api-client.ts` — ky com session cookie automático
- [x] Layout protegido `(app)/layout.tsx` com verificação de sessão server-side
- [x] Layout raiz com `Toaster`
- [x] Páginas de sign-in e sign-up funcionais via Better-Auth client

### 0.6 — GitHub Actions (CI) ✅ Concluído (spec `06-github-actions-ci.md`)
- [x] `.github/workflows/ci.yml`:
  - Trigger: `pull_request` (e `push`) para `main`
  - Jobs via Turborepo: `turbo run lint type-check test` (job `quality`)
  - Build verification: `turbo run build` (job `build`, `needs: quality`)
  - Cache do Turborepo (`.turbo`) + cache do pnpm store habilitados no CI
- [x] `.github/workflows/ci.env` — documentação das env vars/secrets (não carregado)
- [~] Branch protection rules em `main` — config manual no GitHub UI (pendente do owner)

---

## Backlog de Fases

| Fase | Nome                            | Status        |
| ---- | ------------------------------- | ------------- |
| 0    | Fundação                        | Concluída     |
| 1    | Auth e Empresas                 | Em andamento  |
| 2    | Fornecedores e Produtos         | Não iniciada  |
| 3    | Cotações e Lances               | Não iniciada  |
| 4    | Pedidos de Compra               | Não iniciada  |
| 5    | Recebimento e Estoque           | Não iniciada  |
| 6    | Financeiro (NF + Pagamentos)    | Não iniciada  |
| 7    | Audit Log e Administração       | Não iniciada  |

---

## Open Questions

- [ ] **Fornecedores no portal**: Fornecedores submetem lances diretamente no sistema
  ou via e-mail/link externo? (Impacto: se via portal, precisamos de auth para
  fornecedores — papel FORNECEDOR não está no escopo v1 atualmente)
- [ ] **Múltiplos vencedores por cotação**: Um pedido de compra pode ter itens de
  fornecedores diferentes (seleção por item) ou deve ser sempre um único fornecedor
  por cotação?
- [ ] **Armazenamento de anexos v1**: Upload real de arquivo (S3/equivalente) ou
  apenas registro de URL externa? Impacta se precisamos de blob storage na Fase 0.
- [ ] **Notificações**: E-mail de notificação (ex: fornecedor aprovado, PO gerado)
  está no escopo v1? Impacta dependência de serviço de e-mail (Resend/SendGrid).
- [x] **SUPER_ADMIN bypass no AuthGuard** (spec 0.3) — **Resolvido na 0.4**: o AuthGuard tenta
  primeiro o membership direto na empresa do `/:cnpj`; se não houver, verifica se o usuário tem
  `role = 'SUPER_ADMIN'` em qualquer empresa e, se sim, resolve o `companyId` via CNPJ e concede
  acesso com `role: 'SUPER_ADMIN'`. Não é preciso criar membership pré-configurado por empresa.
- [ ] **Numeração de PO** (spec 0.3): `purchase_orders.number` é `UNIQUE`/`NOT NULL`. Como gerar?
  `SERIAL`, sequência por empresa (`PO-2024-0001`) ou UUID abreviado? Impacto: schema + Service de PO.
- [ ] **`inventory` upsert** (spec 0.3): saldo atualizado a cada `stock_movement` via trigger PostgreSQL
  ou upsert explícito no Service? Preferência do projeto: lógica no Service (sem triggers).

---

## Decisões Arquiteturais

| Decisão                            | Motivo                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| Turborepo + pnpm workspaces        | Build cache inteligente + task orchestration paralela no monorepo                   |
| NestJS em vez de Fastify           | DI container, módulos, guards e interceptors nativos — melhor estrutura para projeto de longo prazo |
| Better-Auth (sem 2FA)              | Auth completa e type-safe sem código manual de JWT/bcrypt; extensível no futuro     |
| Supabase (PostgreSQL gerenciado)   | Banco + Storage sem overhead de infra; pooler nativo para SaaS multi-tenant         |
| `packages/shared` para Zod schemas | Source of truth única para contratos de API — corrige duplicação do projeto anterior |
| PostgreSQL em vez de MySQL         | Melhor suporte a JSON, arrays e índices parciais; Supabase usa PostgreSQL nativamente |
| CORS com whitelist explícita       | Corrige CORS aberto (`*`) do projeto anterior                                       |
| Rate limiting em auth              | Previne brute force — ausente no projeto anterior                                   |
| Versionamento `/v1/`               | Permite evolução de API sem breaking change para integrações externas               |
| Vitest obrigatório por Controller/Service | Corrige zero testes do projeto anterior — gate de qualidade mínimo           |
| GitHub Actions CI via Turborepo    | Gate automático com cache; impede código quebrado de ir para produção               |
| `SUPABASE_SERVICE_ROLE_KEY` só no backend | Chave de admin nunca exposta ao browser                                    |
| Drizzle ORM em vez de Prisma              | Schema em TypeScript puro; queries SQL-like; drizzle-zod para derivar schemas Zod; sem `DIRECT_URL` separada |
| Docker + Docker Compose                   | Ambientes reproduzíveis para dev e produção; **dev usa o Postgres do container como banco primário** (Supabase só em prod). Compose sobrescreve `DATABASE_URL` e `DIRECT_URL` para o `postgres` local; migrations/seed via `docker compose exec api` |
| drizzle-zod para schemas de API           | Deriva schemas Zod do schema Drizzle — reduz duplicação manual entre definição de tabela e validação de API |
| Scalar em vez de Swagger UI               | UI mais moderna e usável para referência de API; servida em `/reference` via `@scalar/nestjs-api-reference`; `@anatine/zod-openapi` gera schemas OpenAPI dos Zod schemas sem `@ApiProperty` manual |
| `packageManager` no `package.json` raiz (0.1) | Turborepo v2.9 recusa resolver workspaces sem o campo (`pnpm@11.1.3`). Necessário para `turbo run build` completar |
| Placeholder `src/index.ts` em `apps/api` e `apps/web` (0.1) | Scripts `tsc --noEmit` apontam para `src/**/*`; sem arquivos o TS falha com TS18003. Barrel vazio (`export {}`), substituído pelo código real nas specs 0.4/0.5 |
| Commit sem escopo / push manual           | Convenção em `context/git-workflow.md`: Conventional Commits sem parênteses, mensagem em inglês de uma linha, PR em 4 seções, push sempre manual |
| Biome fixado em `1.9.4` (0.2)             | O schema/config da spec é 1.9.x (`organizeImports`, `files.ignore`); Biome 2.x mudou o formato e quebraria a config. Pin garante fidelidade à spec |
| `.turbo` adicionado ao `files.ignore` do Biome (0.2) | Biome não lê `.gitignore` por padrão; sem ignorar `.turbo`, o cache do Turborepo (JSONs) falhava o `biome check .`. Mesmo padrão de `dist`/`.next`/`coverage` |
| `@nestjs/common` + `@types/node` instalados na 0.3 | `db.module.ts` (escopo 0.3) importa `@nestjs/common` e usa `process.env`; sem essas deps o `type-check` falha. NestJS completo virá na 0.4 |
| `seed.ts` re-incluído no `tsconfig` da API (0.4) | Com o módulo `modules/auth/better-auth` criado na 0.4, a exclusão temporária da 0.3 foi removida; `seed.ts` volta a ser type-checked. Guard de `company` undefined adicionado (exigência do `noUncheckedIndexedAccess`) |
| Ignore do Biome trocado para `**/db/migrations/**` (0.3) | Biome roda por workspace (cwd em cada app); o padrão antigo `apps/api/src/db/migrations/**` só casava a partir da raiz, deixando os JSONs de metadata da migration falharem o lint da API |
| Barrel `@elos/shared` re-exporta `enums.ts` (0.3) | Sem `export * from './enums'`, os enums ficariam inacessíveis pela raiz do pacote `@elos/shared` |
| shadcn CLI v4: `radix` + preset `nova` (0.5) | O wizard novo não tem mais "Default/Slate" — pede component library (`radix`/`base`) e preset. `radix-nova` (Lucide + Geist) é o mais próximo da intenção da spec; base color é irrelevante pois `globals.css` é sobrescrito com os tokens Elos |
| `@theme inline` envolve tokens em `hsl(...)` (0.5) | Os tokens Elos são triplets HSL crus; sem o `hsl()` no mapeamento, as utilities do Tailwind v4 (`bg-primary`, `border-border`, `ring-ring/50`) gerariam cor inválida. Correção necessária vs. a spec, que mapeava `var(--token)` direto |
| `@custom-variant dark (.dark)` no `globals.css` (0.5) | Os primitivos shadcn trazem classes `dark:`; ancorá-las a `.dark` (nunca aplicada) impede o default `prefers-color-scheme` de ativar estilos escuros — cumpre a invariante "sem dark mode na v1" sem editar `components/ui/*` |
| `form` do shadcn não instalado (0.5) | O registry `radix-nova` não envia arquivo para `form`. As páginas de auth usam `react-hook-form` direto (sem o primitivo `<Form>`), então não há perda funcional |
| `packageExtensions` para `@hookform/resolvers` (0.5) | O resolver@5 importa `zod/v4/core` mas não declara `zod` como peer; sob o layout estrito do pnpm o `next build` quebrava. Extensão de manifesto em `pnpm-workspace.yaml` declara o peer e cria o symlink do zod |
| ky 2.x: `prefix` + hook `afterResponse(state)` (0.5) | A spec foi escrita para ky 1.x. No ky 2.x `prefixUrl`→`prefix` e o hook recebe um único objeto `{ request, options, response }`. `lib/api-client.ts` adaptado mantendo o redirect 401→`/sign-in` |
| `exactOptionalPropertyTypes`/`declaration` off no web (0.5) | Herdados do `tsconfig.base.json`: o 1º quebra o `components/ui/sonner.tsx` gerado (não editável), o 2º dispara erro de portabilidade de tipo do better-auth client com os caminhos pnpm. Web é app, não pacote publicado — desligar é seguro |
| Biome ignora `**/components/ui/**` e `**/next-env.d.ts` (0.5) | `components/ui/*` é gerado pelo shadcn CLI (invariante: não editar à mão) e usa formatação própria; `next-env.d.ts` é gerado pelo Next. Ignorar evita o `--write` do lint-staged tocar nesses arquivos |
| `allowBuilds` msw/sharp = false (0.5) | Resolve o `ERR_PNPM_IGNORED_BUILDS` (exit 1) que abortava o shadcn CLI. Build scripts não são necessários: `sharp` é otimização de imagem opcional (Next faz fallback), `msw` é transitivo de teste |
| CI: `pnpm/action-setup@v4` sem input `version` (0.6) | A spec passava `PNPM_VERSION: "9"`, mas o `packageManager: pnpm@11.1.3` (campo do `package.json` raiz, exigido desde 0.1) já fixa a versão. Informar os dois faz a action falhar com "Multiple versions of pnpm specified" — removido o `version` e mantido o campo como fonte única |
| `.github/workflows/ci.env` como documentação (0.6) | Item do escopo "In" da spec, ausente da árvore "Arquivos a Criar"; criado como arquivo de referência (comentado, não carregado por nada) com base na tabela de secrets da seção 4 da spec, para honrar o escopo sem inventar um `.env` real consumido pelo workflow |
| `error` em vez de `errorMap` no `z.enum` (1.1) | A spec usava a API de erros do Zod 3 (`errorMap: () => ({ message })`), mas o projeto está em `zod@4.4.3`, onde a chave `errorMap` foi removida em favor de um único `error: string \| (issue) => string`. Sob `strict`/excess-property check o literal `{ errorMap }` falharia o type-check — trocado por `error: () => 'Papel inválido para atribuição'` preservando a mensagem |
| `zod` como dependency de `@elos/shared` (1.1) | A 0.3 instalou `zod` só em `@elos/api`/`@elos/web`; com `schemas/*.ts` importando `zod` no pacote shared, o layout estrito do pnpm não resolveria o módulo sem a declaração. Adicionado `zod@^4.4.3` ao manifesto do shared |
| `types/company.ts` não criado (1.1) | A árvore de arquivos da spec lista `types/company.ts`, mas a "Implementação Detalhada" define os tipos dentro de `schemas/company.ts` (via `z.infer`) e o barrel re-exporta apenas `./schemas/*`. Criar o arquivo deixaria-o órfão (fora do barrel) ou geraria export duplicado. Seguida a implementação detalhada — tipos vivem nos schema files, como já ocorre com os de membro |
| Subject `Company` tagueado no CASL (1.2) | O setup 0.4 usava subjects **só como strings** (`MongoAbility<[Actions, Subjects]>`), que não tipa condições por objeto (`{ id }`) nem aceita passar a row do Drizzle a `can`. 1.2 é a 1ª unidade a precisar de escopo por objeto. `Subjects` passou a incluir `'Company'` (checagem por tipo) **e** `Company & ForcedSubject<'Company'>` (condições + row tagueada). Como `can`/`cannot` usam `CanParameters` = `T[1]` cru, ambos os membros (string e objeto) são necessários no union |
| Helper `subject('Company', company)` no Service (1.2) | A spec escreve `ability.cannot('read', company)` passando a row crua. Sem tag, o CASL detecta o tipo via `constructor.name` (= `Object` numa row Drizzle), nunca casando as regras de `Company` — falha de tipo e de runtime. `subject()` do `@casl/ability` adiciona `__caslSubjectType__: 'Company'`, fazendo o CASL casar as regras condicionais corretamente |
| ADMIN_EMPRESA: `read`+`update` escopado em vez de `manage Company` (1.2) | A spec pede `can('read'/'update','Company',{id})`. O 0.4 tinha `can('manage','Company')` irrestrito — isso permitiria ADMIN_EMPRESA **criar** empresas (`create` ⊂ `manage`), violando "POST só para SUPER_ADMIN". Trocado por `read`+`update` escopado a `{ id: companyId }`; `create` fica exclusivo do SUPER_ADMIN (`manage all`) |
| `companyId = user.companyId ?? ''` nas condições (1.2) | `SessionUser.companyId` é `string \| null`; a condição CASL `{ id }` exige `string`. Coalescido para `''` (nunca casa um uuid real → deny seguro). SUPER_ADMIN tem `companyId=null` mas usa `manage all`, não as regras escopadas |
| `AuthGuard` fail-closed em rotas de plataforma + `@AllowPlatformRoute()` (1.2, ajuste pós-review) | Verificado empiricamente: uma regra **condicional** (`can('read','Company',{id})`) faz `ability.can('read','Company')` (checagem por tipo, sem instância) retornar `true` no CASL — logo o CASL sozinho **não** barra não-SUPER_ADMIN em rotas de lista. Em vez de deixar `role=null` e delegar ao Service (fail-open), o guard agora **rejeita** (`ForbiddenException`) em rotas sem `:cnpj` para quem não é SUPER_ADMIN, salvo opt-in explícito via `@AllowPlatformRoute()` (metadata `allowPlatformRoute`) — pensado para `GET /v1/me/companies` (1.3), que usa só `session.user.id`. As regras condicionais do CASL só atuam nas rotas `/:cnpj`, onde o guard popula `role`/`companyId` (defesa em profundidade no `findByCnpj`/`update`) |
| `CompaniesService.update` trata corrida de remoção (1.2, ajuste pós-review) | `const [updated] = …returning()` é `Company \| undefined` sob `noUncheckedIndexedAccess`. Se a empresa for removida entre o `select` e o `update`, o `returning` vem vazio. Adicionado `if (!updated) throw new NotFoundException(...)` para espelhar o `findByCnpj` e nunca retornar `undefined` (200 com corpo vazio) |
| `DrizzleDB` de `../../db`; `db/types.ts` não criado (1.2) | A nota da spec sugere criar `apps/api/src/db/types.ts` "se ainda não existir". O `DrizzleDB` já é exportado por `db/index.ts` (e re-exportado por `db.module.ts`), padrão já usado pelo `auth.guard.ts`. Criar `db/types.ts` duplicaria a definição — Service importa de `../../db`, fiel ao código existente |
| Mock do thenable Drizzle separado do provider injetado (1.2) | A spec monta `mockDb` com `then` direto no objeto passado a `useValue: mockDb`. O NestJS 11 **adota thenables** de `useValue` (faz `await` e substitui a instância pelo valor resolvido) → o `db` injetado virava o array resolvido e `this.db.select` deixava de existir (e, com `then` que ignora o `resolve`, o `beforeEach` travava 10s). Correção: `.limit()` retorna uma **folha thenable** separada (que honra o `resolve`, como o `auth.guard.spec`); o `mockDb` injetado **não** é thenable. Helper `setThenResult` + 1 `biome-ignore noThenProperty` |
| `overrideGuard(AuthGuard)` no teste do controller (1.2) | `@UseGuards(AuthGuard)` no controller faz o NestJS instanciar o guard via DI ao montar o `TestingModule`, exigindo `DRIZZLE` + `Reflector` (ausentes no módulo de teste do controller). A spec não previa isso. Adicionado `.overrideGuard(AuthGuard).useValue({ canActivate: () => true })` — o comportamento do guard é coberto pelo `auth.guard.spec` |

---

## Notas de Sessão

- Projeto anterior: **Supply-Mais** (supply-mais.com.br) — análise completa em
  `ENGINEERING_REVIEW.md`
- Novo nome: **Elos**
- Context files preenchidos e revisados com a stack final
- **Stack final confirmada:**
  - Monorepo: Turborepo + pnpm workspaces
  - Backend: NestJS + TypeScript
  - Auth: Better-Auth (sem 2FA) com Drizzle adapter
  - ORM: Drizzle ORM + drizzle-zod + Drizzle Kit
  - Banco: Supabase (PostgreSQL gerenciado)
  - Frontend: Next.js 15 + React 19 + Tailwind CSS 4 + shadcn/ui
  - Shared: packages/shared com Zod schemas de API
- **0.1 concluída** (commit `ce0579b`; turbo 2.9.16, pnpm 11.1.3, node 24): monorepo
  scaffold com os 3 workspaces; `install`/`build`/`type-check`/`lint`/`test` verdes
- Stack passou a incluir **Docker + Docker Compose** (seção em `architecture.md`)
- Convenção de git formalizada em `context/git-workflow.md`
- **0.2 concluída**: Biome 1.9.4 + Husky 9 + lint-staged 17, `.env.example` (api/web),
  Dockerfiles multi-stage, docker-compose dev/prod, `.dockerignore`, `next.config.ts` standalone.
  `biome check .`/`lint`/`type-check` verdes; Docker runtime não validado neste ambiente
- **0.3 concluída**: schema Drizzle completo (33 tabelas, 18 enums) em `apps/api/src/db/schema/`,
  `DrizzleModule`, `seed.ts`, migration `0000_*.sql` gerada e revisada; enums em `@elos/shared`.
  `db:generate`/`lint`/`type-check`/`build` verdes. Banco vivo não disponível no ambiente —
  `db:migrate`/`db:studio`/`db:seed`/login pendentes para execução local com Supabase
- Próximo passo: Fase 0.4 — Bootstrap da API (NestJS) — também provê o módulo de auth que o `seed.ts` importa
- **0.4 concluída**: NestJS (guards/CASL/Better-Auth/health), Scalar em `/reference`, prefixo `/v1`,
  14 testes Vitest verdes. Runtime vivo pendente (sem banco)
- **0.5 concluída**: Next.js 15 + Tailwind 4 + shadcn/ui (`radix-nova`), tokens Elos em `globals.css`,
  clients de auth (browser + proxy server-side) e `ky`, layouts root/auth/(app) e páginas sign-in/sign-up.
  `build` (compila + 6 rotas) / `type-check` / `lint` verdes. Caveats de ambiente: passo `standalone`
  falha por `EPERM` de symlink no Windows; fluxo de login não exercitado (sem API/banco vivos).
  Ajustes vs. spec por versões reais das libs (ky 2.x, shadcn CLI v4, peer zod do @hookform/resolvers) —
  ver tabela de Decisões Arquiteturais
- Próximo passo: Fase 0.6 — GitHub Actions (CI)
- **0.6 concluída**: `.github/workflows/ci.yml` (jobs `quality` + `build` via Turborepo, caches de
  pnpm store e `.turbo`, `concurrency`, triggers em PR/push para `main`) + `ci.env` (documentação).
  Validado localmente: YAML válido, `lint`/`type-check` verdes, `test -- --reporter=verbose` com 14
  testes passando. Ajuste vs. spec: `pnpm/action-setup` sem `version` (conflito com `packageManager`).
  Pendente do owner: execução real no GitHub Actions + branch protection rules em `main` (UI)
- **Fase 0 — Fundação concluída** (0.1–0.6). Próximo: **Fase 1 — Auth e Empresas**
- **1.1 concluída**: schemas Zod de empresa e membro em `packages/shared` (`schemas/company.ts`,
  `schemas/member.ts`), tipos via `z.infer`, barrel atualizado, `zod` declarado no shared.
  `build`/`type-check`/`lint` verdes. Ajustes vs. spec por Zod 4 (`error` vs `errorMap`) e por
  inconsistência da spec (`types/company.ts` órfão — não criado) — ver Decisões Arquiteturais.
  Próximo: **1.2 — Companies (NestJS Controller/Service/Module)**
- **1.2 concluída**: `CompaniesModule` NestJS (controller + service + module), CRUD em `/v1/companies`
  e `/v1/companies/:cnpj` (sem DELETE), CASL antes de cada mutação, ajustes cirúrgicos no `AuthGuard`
  (SUPER_ADMIN em rotas sem `:cnpj`) e no `AbilityFactory` (regras `Company`). 28 testes da API
  passando, `type-check`/`biome` verdes. Ajustes vs. spec por semântica real do CASL 7 (subject
  tagueado + helper `subject()`), por adoção de thenable do NestJS 11 nos mocks de teste, e por DI
  do guard no teste do controller — ver Decisões Arquiteturais (1.2). Checklist de segurança validado.
  Próximo: **1.3 — Membros de Empresa**
