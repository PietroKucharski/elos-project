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

---

## Em Progresso

- Nada ativo. Próximo: **0.6 — GitHub Actions (CI)**.

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

### 0.6 — GitHub Actions (CI) ⬅ próximo
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
