# Elos — Progress Tracker

Atualize este arquivo após cada mudança de implementação relevante.

---

## Fase Atual

**Fase 0 — Fundação** · `Em progresso`

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

---

## Em Progresso

- Nada ativo. Próximo: **0.2 — Tooling** (spec `02-tooling-spec.md`).

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

### 0.2 — Tooling ⬅ próximo (spec `02-tooling-spec.md`)
- [ ] Biome configurado na raiz do monorepo (`biome.json`) — linter + formatter
- [ ] Husky + lint-staged: pre-commit (`biome check --write`), pre-push (type-check)
- [ ] `.env.example` em `apps/api` com todos os vars:
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
- [ ] `apps/api/Dockerfile` — multi-stage (deps → builder → runner alpine)
- [ ] `apps/web/Dockerfile` — multi-stage com Next.js standalone output
- [ ] `docker-compose.yml` na raiz — serviços `api`, `web`, `postgres` (dev)
- [ ] `docker-compose.prod.yml` — override de produção (sem postgres local)
- [ ] `.dockerignore` na raiz

### 0.3 — Schema Drizzle e Banco (Supabase)
- [ ] Configurar projeto Supabase (ou Supabase CLI local para dev)
- [ ] `drizzle.config.ts` em `apps/api/` apontando para `DATABASE_URL`
- [ ] Definir tabelas em `apps/api/src/db/schema/`:
  - `auth.ts` — tabelas Better-Auth (`user`, `session`, `account`, `verification`)
  - Todos os domínios Elos (companies, suppliers, products, quotations, etc.)
  - Enums como `pgEnum` por domínio
  - `relations.ts` — todas as relações Drizzle Kit centralizadas
  - `index.ts` — re-exporta schema completo
- [ ] `DrizzleModule` (`apps/api/src/db.module.ts`) com `postgres.js` como driver
- [ ] Gerar primeira migration: `pnpm drizzle-kit generate`
- [ ] Revisar SQL gerado em `src/db/migrations/` e aplicar: `pnpm drizzle-kit migrate`
- [ ] Seed básico (`src/db/seed.ts`):
  - 1 SUPER_ADMIN
  - 1 empresa de exemplo
  - 1 ADMIN_EMPRESA

### 0.4 — Bootstrap da API (NestJS)
- [ ] `apps/api/src/app.module.ts` com:
  - DrizzleModule (global)
  - AbilityModule (global)
  - AuthModule (Better-Auth)
  - HealthModule
- [ ] `apps/api/src/main.ts`:
  - CORS com `origin: [process.env.FRONTEND_URL!]` — nunca aberto
  - GlobalExceptionFilter registrado
  - ZodValidationPipe como pipe global
  - Swagger spec gerado com `@nestjs/swagger` + Scalar UI em `/reference`
  - JSON spec exposto em `/openapi.json`
  - Prefixo global `/v1` (exceto `/api/auth/*`, `/health`, `/reference`, `/openapi.json`)
- [ ] `common/filters/global-exception.filter.ts`
- [ ] `common/guards/auth.guard.ts` (integração Better-Auth)
- [ ] `common/guards/roles.guard.ts` (CASL)
- [ ] `common/ability/ability.factory.ts`
- [ ] `common/pipes/zod-validation.pipe.ts`
- [ ] `common/decorators/` — @CurrentUser, @Roles, @Public
- [ ] `modules/auth/` — instância Better-Auth + controller que monta `/api/auth/*`
- [ ] Rota de health check: `GET /health` → `{ status: 'ok', timestamp }`

### 0.5 — Bootstrap do Frontend (Next.js)
- [ ] `apps/web` com Next.js 15 + TypeScript + Tailwind CSS 4 + shadcn/ui
- [ ] Tokens de cor de `ui-context.md` configurados em `globals.css`
- [ ] `lib/auth-client.ts` — Better-Auth client (`createAuthClient`)
- [ ] `lib/api-client.ts` — ky com session cookie automático
- [ ] Layout protegido `(app)/layout.tsx` com verificação de sessão server-side
- [ ] Layout raiz com `Toaster`
- [ ] Páginas de sign-in e sign-up funcionais via Better-Auth client

### 0.6 — GitHub Actions (CI)
- [ ] `.github/workflows/ci.yml`:
  - Trigger: `pull_request` para `main`
  - Jobs via Turborepo: `turbo run lint type-check test`
  - Build verification: `turbo run build`
  - Cache do Turborepo habilitado no CI

---

## Backlog de Fases

| Fase | Nome                            | Status        |
| ---- | ------------------------------- | ------------- |
| 0    | Fundação                        | Em progresso  |
| 1    | Auth e Empresas                 | Não iniciada  |
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
| Docker + Docker Compose                   | Ambientes reproduzíveis para dev e produção; postgres local no docker-compose.yml evita dependência do Supabase cloud em dev offline |
| drizzle-zod para schemas de API           | Deriva schemas Zod do schema Drizzle — reduz duplicação manual entre definição de tabela e validação de API |
| Scalar em vez de Swagger UI               | UI mais moderna e usável para referência de API; servida em `/reference` via `@scalar/nestjs-api-reference`; `@anatine/zod-openapi` gera schemas OpenAPI dos Zod schemas sem `@ApiProperty` manual |
| `packageManager` no `package.json` raiz (0.1) | Turborepo v2.9 recusa resolver workspaces sem o campo (`pnpm@11.1.3`). Necessário para `turbo run build` completar |
| Placeholder `src/index.ts` em `apps/api` e `apps/web` (0.1) | Scripts `tsc --noEmit` apontam para `src/**/*`; sem arquivos o TS falha com TS18003. Barrel vazio (`export {}`), substituído pelo código real nas specs 0.4/0.5 |
| Commit sem escopo / push manual           | Convenção em `context/git-workflow.md`: Conventional Commits sem parênteses, mensagem em inglês de uma linha, PR em 4 seções, push sempre manual |

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
- Próximo passo: Fase 0.2 — Tooling (Biome, Husky/lint-staged, `.env.example`, Docker)
