# Elos — Progress Tracker

Atualize este arquivo após cada mudança de implementação relevante.

---

## Fase Atual

**Fase 7 — Audit Log e Administração** · `Em andamento` (7.1 e 7.2 concluídas) → próxima unidade: **7.3 — Audit Log UI**

> **Fase 6 — Financeiro (NF + Pagamentos):** concluída (6.1, 6.2, 6.3, 6.4 e 6.5) → fase financeira encerrada.

> **Fase 5 — Recebimento e Estoque:** concluída (5.1, 5.2, 5.3, 5.4, 5.5, 5.6 e 5.7).

> **Fase 4 — Pedidos de Compra:** concluída (4.1, 4.2 e 4.3).
**Fase 4 — Pedidos de Compra** · `Concluída` (4.1, 4.2 e 4.3 concluídas) → próxima fase: **Fase 5 — Recebimento e Estoque**

> **Fase 3 — Cotações e Lances:** concluída (todas as 5 unidades, incluindo a 3.5 — Lances e Comparativo UI).

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

- [x] **1.3 — Members Module (API)** — spec `09-members-api-spec.md`
  - Commit convencional esperado: `feat(api): add members module with invite and management endpoints`
  - `apps/api/src/modules/members/`: `members.module.ts`, `members.controller.ts` (`@Controller()` sem
    prefixo: `GET /v1/me/companies` + `GET/POST /v1/companies/:cnpj/members` e
    `PATCH/DELETE /v1/companies/:cnpj/members/:userId`, Swagger tags + `ZodValidationPipe` no invite/updateRole),
    `members.service.ts` (findAll/invite/updateRole/remove/getMyCompanies com CASL antes de cada ação),
    `members.service.spec.ts` (8 testes) e `members.controller.spec.ts` (5 testes) — **46 testes da API no total**
  - `ability.factory.ts` — regras `CompanyMember`: ADMIN_EMPRESA `read`+`create`+`update`+`delete` escopado a
    `{ companyId }` (era `manage CompanyMember` irrestrito); COMPRADOR/ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR
    ganham `read` escopado a `{ companyId }`. Subject `CompanyMember` tagueado (`& ForcedSubject`) como `Company`
  - `app.module.ts` — `MembersModule` importado
  - **Restrições de segurança implementadas:** ADMIN_EMPRESA não pode promover a SUPER_ADMIN (herdado dos
    `assignableRoles` de 1.1); membro não remove a si mesmo (400); não pode remover o último ADMIN_EMPRESA (400);
    não pode alterar o próprio papel (400). Convite v1: vincula usuário existente ou cria via
    `auth.api.signUpEmail` com senha temporária (reset pelo fluxo "esqueci a senha", futuro)
  - **Verificado:** `vitest run` (46/46), `pnpm type-check` (3 workspaces) e `pnpm lint` (exit 0) verdes
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (1.3) — `@AllowPlatformRoute()` adicionado ao
    `GET /me/companies` (a spec omitia; sem ele o `AuthGuard` fail-closed barraria não-SUPER_ADMIN),
    `DrizzleDB` importado de `../../db` (não `../../db/types`), subject `CompanyMember` tagueado, mock
    thenable-leaf no spec do service

- [x] **1.4 — App Shell e Company Switcher (Frontend)** — spec `10-app-shell-company-switcher-spec.md`
  - Commit convencional esperado: `feat: add app shell layout with topbar, sidebar and company switcher`
  - `apps/web/src/app/globals.css` — token set completo do design (surfaces/text/brand/borders/semantic,
    radii, shadows, layout `--sidebar-w`/`--row-h`, fontes), base reset, scrollbars, focus ring,
    keyframes (`popIn`/`pageIn`/`shimmer`/…), `.skeleton`, `.page-enter` e media query do brand panel
  - `lib/api.ts` — fetch server-side tipado (`getMyCompaniesServer`/`getCompanyServer`/`getMembersServer`/
    `getAllCompaniesServer`) com cookie de sessão via `headers()` e `cache: 'no-store'`
  - `components/domain/`: `logo.tsx` (SVG dos elos), `topbar.tsx` (64px, toggle sidebar via DOM, sino
    com ponto), `sidebar.tsx` (colapsável 240↔64, navegação agrupada por papel, item ativo + barra,
    card de ajuda), `company-switcher.tsx` (dropdown hand-rolled, check no ativo) e `user-menu.tsx`
    (avatar com inicial+cor gerada, sign-out)
  - Rotas: `(app)/layout.tsx` (guard de sessão passthrough), `(app)/page.tsx` (redirect p/ 1ª empresa ou
    `/no-company`), `(app)/no-company/page.tsx`, `(app)/[cnpj]/layout.tsx` (shell topbar+sidebar, SSR
    guard de membership), `[cnpj]/loading.tsx` (skeleton), `[cnpj]/error.tsx`, `[cnpj]/dashboard/page.tsx`
  - `(auth)/sign-in` e `(auth)/sign-up` redesenhados (split-screen com brand panel indigo + padrão de
    correntes SVG); `(auth)/layout.tsx` passou a wrapper full-bleed (`100vh`)
  - `@elos/shared` adicionado como `dependency` (`workspace:*`) de `@elos/web` — 1ª vez que o front
    importa os tipos/enums do pacote shared
  - **Verificado:** `pnpm type-check` (3 workspaces) e `pnpm lint` verdes (3 warnings `noNonNullAssertion`
    pré-existentes, do uso de `!` do próprio spec); `pnpm --filter web build` **compila + checa tipos +
    gera as 7 rotas** (✓). Mesma pendência de ambiente da 0.5: passo `output: 'standalone'` falha por
    `EPERM` de symlink no Windows; fluxo runtime (login→`/:cnpj/dashboard`, troca de empresa) não
    exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (1.4)

- [x] **1.5 — Companies Management UI (Frontend)** — spec `11-companies-management-ui-spec.md`
  - Commit convencional esperado: `feat(web): add company settings and members management ui`
  - shadcn via CLI: `sheet` + `alert-dialog` (únicos importados; pacote `radix-ui` unificado, `globals.css` intacto).
    `table`/`badge`/`select` listados na spec mas nunca importados (tabelas/badges/select são inline) — omitidos
  - `lib/api.ts` estendido com mutações client-side (`updateCompany`/`createCompany`/`inviteMember`/
    `updateMemberRole`/`removeMember`) via import dinâmico do ky client (export `api`); `next/headers` passou a
    import **dinâmico** dentro das funções server-side (helper `sessionHeaders`) — sem isso, Client Components
    que importam as mutações puxariam código server-only e o `next build` quebrava
  - `components/domain/`: `company-form.tsx` (form reutilizável create/edit, inline styles), `members-table.tsx`
    (avatar+nome+email, badge de papel, kebab menu, `RoleEditor`, `AlertDialog` de remoção) e
    `invite-member-sheet.tsx` (Sheet lateral 440px com preview de permissões do papel)
  - Rotas: `(app)/[cnpj]/settings/page.tsx` (2 colunas: logo + form), `[cnpj]/settings/members/page.tsx`
    (tabela + invite), `(app)/admin/layout.tsx` (shell de plataforma SUPER_ADMIN com `<Logo>`),
    `admin/companies/page.tsx` (listagem) e `admin/companies/new/page.tsx` (criação)
  - **Verificado:** `pnpm type-check` (3 workspaces) verde; `biome check` do web limpo (só os 10 warnings
    `noNonNullAssertion` pré-existentes); `pnpm --filter web build` **compila + checa tipos + gera as 9 rotas**
    (✓ 9/9) — passo `output: 'standalone'` falha por `EPERM` de symlink no Windows (mesma limitação de 0.5/1.4).
    Fluxo runtime (settings/members/admin) não exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (1.5)

- [x] **2.1 — Shared Schemas: Fornecedores e Produtos** — spec `12-shared-schemas-suppliers-product-spec.md`
  - Commit convencional esperado: `feat(shared): add supplier and product zod schemas`
  - `packages/shared/src/schemas/supplier.ts` — `supplierAddressSchema` (endereço inline),
    `createSupplierSchema` (`.superRefine` cruzando type↔documento: PJ exige CNPJ, PF exige CPF),
    `updateSupplierSchema` (sem `type` — imutável), `approveSupplierSchema` (rating 1–5),
    `rejectSupplierSchema` (motivo obrigatório, min 5), `supplierResponseSchema` (nullable + address
    aninhado); contatos (`create/update/responseSupplierContactSchema`) e contas bancárias
    (`bankAccountTypeValues` CHECKING/SAVINGS, `create/update/responseSupplierBankAccountSchema`) + tipos via `z.infer`
  - `packages/shared/src/schemas/product.ts` — `unitOfMeasureValues` (10 unidades),
    `createProductSchema` (`minStock` number no create), `updateProductSchema` (`.partial()`),
    `productResponseSchema` (`minStock` string nullable, `suppliers[]` opcional só no GET :id),
    vínculo produto↔fornecedor (`link/update/responseProductSupplierSchema`) + tipos via `z.infer`
  - Barrel `packages/shared/src/index.ts` re-exporta `./schemas/product` e `./schemas/supplier`
  - **Verificado:** `pnpm --filter @elos/shared build`, `pnpm type-check` (3 workspaces) verdes;
    `biome check` dos 2 arquivos novos limpo; 4 `safeParse` da spec confirmados (PJ sem CNPJ falha,
    PJ com CNPJ passa, produto válido passa, produto inválido falha). `pnpm lint` na raiz do pacote
    reporta apenas ruído CRLF pré-existente em arquivos não tocados (normalizado pelo `--write` do
    pre-commit / Linux no CI)
  - **Ajuste vs. spec:** ver Decisões Arquiteturais (2.1) — `export type UnitOfMeasure` removido de
    `product.ts` (colidia com o `UnitOfMeasure` já exportado por `enums.ts` no barrel)

- [x] **2.2 — Suppliers Module (API)** — spec `13-suppliers-api-spec.md`
  - Commit convencional esperado: `feat(api): add suppliers module with crud, approval and sub-resources`
  - `apps/api/src/modules/suppliers/`: `suppliers.module.ts` (exporta `SuppliersService` para o
    ProductsService de 2.3), `suppliers.controller.ts` (`@Controller('companies/:cnpj/suppliers')`:
    GET/POST lista+criação, GET/PATCH `:id`, POST `:id/approve` e `:id/reject`, sub-recursos
    `:id/contacts` e `:id/bank-accounts` com GET/POST/PATCH/DELETE; Swagger + `ZodValidationPipe` por rota),
    `suppliers.service.ts` (findAll com filtros `status`/`search`/paginação, findOne com endereço,
    create/update com upsert de endereço na mesma transação + dedup CNPJ/CPF, approve/reject com regra
    de status PENDING, contatos e contas bancárias com `isMain`/`isPrimary` Y/N; CASL antes de cada
    mutação e audit log em todas), `suppliers.service.spec.ts` (15 testes) e `suppliers.controller.spec.ts`
    — **61 testes da API passando no total**
  - `ability.factory.ts` — subject `Supplier` tagueado (`& ForcedSubject<'Supplier'>`) adicionado ao
    union `Subjects` para suportar `subject('Supplier', row)` no Service (as regras de papel `Supplier`
    já existiam desde a configuração inicial do AbilityFactory)
  - `app.module.ts` — `SuppliersModule` importado
  - **Verificado:** `vitest run` (61/61), `pnpm type-check` (3 workspaces) e `biome check` dos arquivos
    novos verdes (só warnings `noNonNullAssertion` de `companyId!`, severidade `warn`, padrão do projeto).
    Checklist de segurança coberto pelos testes: 403 sem permissão (read/create/update), 400 em
    approve/reject fora de PENDING, 409 CNPJ/CPF duplicado, queries escopadas a `companyId`, audit log
    em create/update/approve/reject
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (2.2) — `@Inject` explícito na DI, subject `Supplier`
    tagueado, `findAll` com `| undefined` (exactOptionalPropertyTypes), `enqueue` envolve em array,
    bracket-keys → dot (useLiteralKeys)

- [x] **2.3 — Products Module (API)** — spec `14-products-api-spec.md`
  - Commit convencional esperado: `feat(api): add products module with crud and supplier links`
  - `apps/api/src/modules/products/`: `products.module.ts` (exporta `ProductsService`),
    `products.controller.ts` (`@Controller('companies/:cnpj/products')`: GET/POST lista+criação,
    GET/PATCH/DELETE `:id` — DELETE é **soft delete** (`isActive=false`, retorna `{ success: true }`),
    sub-recurso de vínculos `:id/suppliers` com POST/PATCH/DELETE; Swagger + `ZodValidationPipe` por rota),
    `products.service.ts` (findAll com filtros `search`/`isActive`/`supplierId`/`unit`/paginação,
    findOne com fornecedores vinculados via `innerJoin`, create/update com dedup de `code` na transação,
    deactivate soft, link/update/unlink de fornecedor com regra **fornecedor APPROVED** e dedup do vínculo;
    CASL antes de cada mutação e audit log em create/update/deactivate),
    `products.service.spec.ts` (9 testes) e `products.controller.spec.ts` (7 testes) — **77 testes da API no total**
  - `ability.factory.ts` — subject `Product` tagueado (`& ForcedSubject<'Product'>`) adicionado ao union
    `Subjects` para suportar `subject('Product', row)` no `update`/`deactivate`; regra `read Product`
    adicionada a ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR (ADMIN_EMPRESA e COMPRADOR já tinham `manage Product`)
  - `app.module.ts` — `ProductsModule` importado
  - **Verificado:** `vitest run` (77/77), `pnpm type-check` (3 workspaces) e `biome check` dos arquivos
    novos verdes (só warnings `noNonNullAssertion` de `companyId!`, severidade `warn`, padrão do projeto).
    Checklist de segurança coberto pelos testes: 403 sem permissão (read/create/update/delete), 400 unit
    inválida, 409 código duplicado, soft delete preserva referências, queries escopadas a `companyId`,
    audit log em create/update/deactivate. `linkSupplier` valida fornecedor APPROVED (400) e vínculo
    duplicado (409)
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (2.3) — `@Inject` explícito, subject `Product` tagueado +
    `read` p/ papéis read-only (regras `manage` já existiam, sem reescrever `case`), `findAll` sem `import()`
    dinâmico (`inArray` no topo) + `| undefined`, ternário `isActive` simplificado, `enqueue` em array,
    deactivate com escopo `companyId` no update

- [x] **2.4 — Suppliers Management UI (Frontend)** — spec `15-suppliers-ui-spec.md`
  - Commit convencional esperado: `feat(web): add suppliers ui with list, form, detail and approval`
  - shadcn via CLI: `tabs` + `select` (pacote `radix-ui` unificado, `globals.css` intacto;
    `alert-dialog`/`sheet` já vinham de 1.5). `select` instalado conforme a spec mas **não importado**
    (o form usa `<select>` nativo, padrão de `invite-member-sheet`); `tabs` usado na página de detalhe
  - `lib/api.ts` estendido: 4 funções server-side (`getSuppliersServer` com query `status`/`search`,
    `getSupplierServer`, `getSupplierContactsServer`, `getSupplierBankAccountsServer`) + 12 client-side
    (`createSupplier`/`updateSupplier`/`approveSupplier`/`rejectSupplier`, contatos `addContact`/
    `updateContact`/`removeContact`, contas `addBankAccount`/`updateBankAccount`/`removeBankAccount`),
    no padrão `sessionHeaders()` (server) e `client()` ky (client); imports de tipos de `@elos/shared`
  - `components/domain/`: `supplier-status-badge.tsx` (badge por status), `supplier-form.tsx` (form
    reutilizável create/edit, `type` PJ/PF só no create define CNPJ↔CPF, cnpj/cpf readonly no edit),
    `suppliers-list-client.tsx` (Client Component: filtro de status por tabs + busca por nome client-side
    + tabela com kebab menu — Ver/Editar sempre, Aprovar/Rejeitar só em PENDING e só se `canMutate`),
    `approve-supplier-dialog.tsx` (rating opcional 1–5), `reject-supplier-dialog.tsx` (motivo obrigatório,
    bloqueia submit < 5 chars), `supplier-contacts-panel.tsx` e `supplier-bank-accounts-panel.tsx`
    (Client Components com estado local + AlertDialog de remoção), `add-contact-sheet.tsx` e
    `add-bank-account-sheet.tsx` (Sheets create/edit no padrão de `invite-member-sheet`)
  - Rotas `(app)/[cnpj]/suppliers/`: `page.tsx` (SSR lista + filtros via Client Component), `loading.tsx`
    (skeleton), `error.tsx` (boundary), `new/page.tsx` (form create), `[id]/page.tsx` (detalhe + tabs
    Info/Contatos/Contas Bancárias), `[id]/edit/page.tsx` (form edit). Sidebar (1.4) já tinha o item
    "Fornecedores" — nenhuma mudança necessária
  - **Verificado:** `pnpm --filter @elos/web type-check` (3 workspaces) verde; `biome check` dos arquivos
    novos limpo (só 1 warning `noNonNullAssertion` em `supplier-form`, mesmo `supplierId!` que o `cnpj!`
    de `company-form` — padrão do projeto); `pnpm --filter web build` **compila + gera as 4 rotas de
    suppliers** (`page`/`new`/`[id]`/`[id]/edit` confirmados em `.next/server/app`). Passo `output:
    'standalone'` falha por `EPERM` de symlink no Windows (mesma limitação de 0.5/1.4/1.5). Fluxo runtime
    (criar/editar/aprovar/rejeitar, tabs, painéis de contato/conta) não exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (2.4) — role via membership (não `session.user.role`),
    `Resolver` cast nos forms com `.default()`, narrowing em vez de `!` nos sheets, `console.error` nos catch

- [x] **2.5 — Products Management UI (Frontend)** — spec `16-products-ui-spec.md`
  - Commit convencional esperado: `feat(web): add products ui with list, form, detail and supplier links`
  - `lib/api.ts` estendido: 2 funções server-side (`getProductsServer` com query `search`/`isActive`/`unit`,
    `getProductServer`) + 6 client-side (`createProduct`/`updateProduct`/`deactivateProduct`,
    `linkSupplierToProduct`/`updateProductSupplierLink`/`unlinkSupplierFromProduct`), no padrão
    `sessionHeaders()` (server) e `client()` ky (client); imports de tipos de `@elos/shared`
    (`CreateProductDto`/`UpdateProductDto`/`ProductResponse`/`LinkProductSupplierDto`/
    `UpdateProductSupplierDto`/`ProductSupplierResponse`)
  - `components/domain/`: `product-form.tsx` (form reutilizável create/edit, inline styles, select nativo de
    unidade, `minStock` decimal `step="0.001"`, checkbox "ativo" só no edit), `products-list-client.tsx`
    (Client Component: tabs Ativos/Inativos + filtro de unidade + busca por nome/código client-side, tabela
    com kebab menu — Ver/Editar e Desativar só em produtos ativos e só se `canMutate`, linha esmaecida
    `opacity 0.5` + badge "Inativo", `AlertDialog` antes de desativar), `product-suppliers-panel.tsx`
    (Client Component com estado local, toggle de preferido via Star, `AlertDialog` de desvínculo) e
    `link-supplier-sheet.tsx` (Sheet 440px com select de fornecedor APPROVED, preview do selecionado)
  - Rotas `(app)/[cnpj]/products/`: `page.tsx` (SSR lista + filtros via Client Component), `loading.tsx`
    (skeleton), `error.tsx` (boundary com `console.error`), `new/page.tsx` (form create), `[id]/page.tsx`
    (detalhe + painel de fornecedores vinculados), `[id]/edit/page.tsx` (form edit). Sidebar (1.4) já tinha
    o item "Produtos" — nenhuma mudança necessária
  - **Verificado:** `pnpm --filter web type-check` + `pnpm --filter @elos/shared type-check` verdes;
    `biome lint` dos arquivos novos limpo (só warnings `noNonNullAssertion` — `productId!` em `product-form`,
    idêntico ao `cnpj!`/`supplierId!` dos outros forms, e o `API_URL` pré-existente — severidade `warn`,
    padrão do projeto); `pnpm --filter web build` **compila + checa tipos + gera as rotas de products**
    (✓ Compiled successfully, ✓ 9/9 static pages). Passo `output: 'standalone'` falha por `EPERM` de symlink
    no Windows (mesma limitação de 0.5/1.4/1.5/2.4). Fluxo runtime (criar/editar/desativar, vincular/
    desvincular fornecedor, toggle preferido) não exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (2.5) — role via membership (não `session.user.role`),
    lista busca ativos+inativos em paralelo para filtro client-side, `Resolver` cast no `link-supplier-sheet`,
    sem o wrapper de `padding` extra (o `[cnpj]/layout` já aplica), `error.tsx` com `console.error`

- [x] **3.1 — Shared Schemas: Cotações e Lances** — spec `17-shared-schemas-quotations-bids.md`
  - Commit convencional esperado: `feat(shared): add quotation and bid zod schemas`
  - `packages/shared/src/schemas/quotation.ts` — `quotationStatusValues` (DRAFT/OPEN/CLOSED/CANCELLED),
    `createQuotationSchema` (`deadline` ISO datetime), `updateQuotationSchema`, `quotationResponseSchema`
    (`itemCount`/`bidCount` opcionais — lista vs. detalhe); itens (`create/update/responseQuotationItemSchema`,
    `quantity` string no response = numeric do postgres.js, `unit` texto livre); convite de fornecedor
    (`quotationSupplierStatusValues` INVITED/RESPONDED/DECLINED, `inviteSupplierToQuotationSchema`,
    `quotationSupplierResponseSchema`) + tipos via `z.infer`
  - `packages/shared/src/schemas/bid.ts` — `bidStatusValues` (DRAFT/SUBMITTED/ACCEPTED/REJECTED),
    `createBidSchema` (**comprador cria em nome do fornecedor** — `supplierId` obrigatório, portal de
    fornecedor fora do escopo v1), `updateBidSchema`, `bidResponseSchema` (`totalPrice` string nullable,
    calculado pelo backend); itens (`create/update/responseBidItemSchema`, `unitPrice` nonnegative,
    `deliveryDays` int positive); comparativo (`bidComparisonCellSchema`/`bidComparisonRowSchema` com
    `z.record(uuid, cell)`/`bidComparisonResponseSchema`); seleção de vencedor v1 por lance único
    (`selectWinnerSchema`) + tipos via `z.infer`
  - Barrel `packages/shared/src/index.ts` re-exporta `./schemas/bid` e `./schemas/quotation`
  - **Verificado:** `pnpm --filter @elos/shared build` + `pnpm type-check` (3 workspaces) verdes;
    `biome check` dos 3 arquivos (bid/quotation/index) limpo; 5 `safeParse` da spec confirmados
    (cotação com título curto+data inválida falha; cotação válida passa; bid com `supplierId` não-uuid
    falha; bid item com preço negativo falha; selectWinner com uuid válido passa). `pnpm lint` na raiz do
    pacote reporta apenas ruído CRLF pré-existente em arquivos não tocados (`core.autocrlf` no Windows;
    repo armazena LF — normalizado pelo `--write` do pre-commit / Linux no CI)
  - **Ajuste vs. spec:** ver Decisões Arquiteturais (3.1) — `export type QuotationStatus` e
    `export type BidStatus` removidos dos schema files (colidiam com os tipos homônimos já exportados por
    `enums.ts` no barrel)

- [x] **3.2 — Quotations Module (API)** — spec `18-quaotations-api-spec.md`
  - Commit convencional esperado: `feat(api): add quotations module with crud, status transitions and sub-resources`
  - `apps/api/src/modules/quotations/`: `quotations.module.ts` (exporta `QuotationsService` para o
    BidsService de 3.3), `quotations.controller.ts` (`@Controller('companies/:cnpj/quotations')`:
    GET/POST lista+criação, GET/PATCH `:id`, POST `:id/publish|close|cancel`, sub-recursos `:id/items`
    e `:id/suppliers` com GET/POST/PATCH/DELETE; Swagger + `ZodValidationPipe` por rota),
    `quotations.service.ts` (findAll com filtros `status`/`search`/paginação + subqueries de `itemCount`/
    `bidCount`, findOne, create com **número sequencial por empresa** `COT-{ano}-{4 dígitos}`, update/publish/
    close/cancel com regras de transição de status, itens e convites editáveis apenas em DRAFT, convite só
    de fornecedor **APPROVED** e dedup; CASL antes de cada mutação e audit log em create/update/publish/
    close/cancel), `quotations.service.spec.ts` (13 testes) e `quotations.controller.spec.ts` (5 testes)
    — **95 testes da API passando no total**
  - `ability.factory.ts` — subject `Quotation` tagueado (`& ForcedSubject<'Quotation'>`) para
    `subject('Quotation', row)` no update/publish/close/cancel; `read Quotation` adicionado a
    ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR (ADMIN_EMPRESA e COMPRADOR já tinham `manage Quotation`)
  - `app.module.ts` — `QuotationsModule` importado
  - **Reconciliação de schema (decisão do owner):** a spec 3.2 e os schemas shared da 3.1 assumiam um
    schema de banco diferente do gerado na 0.3. O DB schema foi **ajustado à spec** (fonte de verdade =
    `@elos/shared`): `quotations` ganhou `number` (UNIQUE por empresa via `quotations_company_number_unique`)
    e `payment_terms`, e `created_by_id`→`created_by`; `quotation_items` teve `product_id` tornado nullable,
    `description` tornado NOT NULL, `notes` adicionado e `unit` ampliado p/ `varchar(20)`; a tabela
    `quotation_invites` (enum `invite_status` PENDING/ACCEPTED/DECLINED, `sent_at`) foi renomeada para
    `quotation_suppliers` (enum `quotation_supplier_status` INVITED/RESPONDED/DECLINED, `invited_at`).
    `relations.ts` atualizado. Migration `0002_quotations_module_schema.sql` + snapshot/journal v7 gerados
  - **Verificado:** `vitest run` (95/95), `pnpm type-check` (3 workspaces) e `biome check` dos arquivos
    novos verdes (só warnings `noNonNullAssertion` de `companyId!`, severidade `warn`, padrão do projeto);
    `drizzle-kit check` ✅ ("Everything's fine") e `drizzle-kit generate` reporta **"No schema changes"**
    (snapshot 0002 confere exatamente com o schema TS). Checklist de segurança coberto pelos testes/regras:
    403 sem permissão (ALMOXARIFE não cria), 400 em publish sem itens/sem fornecedores, 400 em item/convite
    fora de DRAFT, 400 fornecedor não APPROVED, 409 convite duplicado, queries escopadas a `companyId`,
    audit log em toda mutação. Banco vivo (`db:migrate`) não executado — sem Supabase neste ambiente
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (3.2) — bids importados de `db/schema/quotations`
    (não há `db/schema/bids.ts`), `cancel` rejeita lances `NOT IN ('SELECTED','REJECTED')` (enum canônico
    usa SELECTED, não ACCEPTED), `quantity` numeric convertido p/ string no insert/update de item, `set`
    de update montado explicitamente (deadline destruturado p/ não colidir string×Date), `@Inject` explícito
    na DI (padrão do projeto), migration 0002 escrita à mão + snapshot via script (drizzle-kit `generate`
    exige TTY p/ prompts de rename, indisponível no ambiente), `enqueue` do service spec virou fila
    sequencial (a versão da spec sobrescrevia e quebrava o fluxo multi-select do inviteSupplier)

- [x] **3.3 — Bids Module (API)** — spec `19-bids-api-spec.md`
  - Commit convencional esperado: `feat(api): add bids module with crud, comparison and winner selection`
  - `apps/api/src/modules/bids/`: `bids.module.ts` (exporta `BidsService`), `bids.controller.ts`
    (`@Controller('companies/:cnpj/quotations/:quotationId')`: GET/POST `bids`, GET `bids/compare`
    **registrado antes** de GET `bids/:bidId`, GET/PATCH/DELETE `bids/:bidId`, POST `bids/:bidId/submit`,
    sub-recurso `bids/:bidId/items` GET/POST/PATCH/DELETE, POST `select-winner`; Swagger + `ZodValidationPipe`
    por rota), `bids.service.ts` (findAll/findOne com `totalPrice` via subquery, create em nome do
    fornecedor **convidado** com dedup de lance por cotação, update/remove só em DRAFT, submit DRAFT→SUBMITTED
    exige ≥1 item e marca o convite como RESPONDED, itens 1:1 com `quotation_items` com dedup, compare em
    matrix itens×fornecedores, selectWinner em cotação CLOSED marca SELECTED + rejeita os demais SUBMITTED;
    CASL antes de cada mutação e audit log em create/update/delete/submit/select_winner + itens),
    `bids.service.spec.ts` (14 testes) e `bids.controller.spec.ts` (7 testes) — **115 testes da API no total**
  - `ability.factory.ts` — subject `Bid` tagueado (`& ForcedSubject<'Bid'>`) p/ `subject('Bid', existing)`
    no update/remove/submit; COMPRADOR e ADMIN_EMPRESA com `read`/`create`/`update`/`delete` de `Bid`
    escopado a `{ companyId }` (a regra antiga `read`+`select` do COMPRADOR foi substituída — selectWinner
    usa `update`, não `select`); ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR ganham `read` escopado
  - `app.module.ts` — `BidsModule` importado
  - **Mapeamento DB↔contrato:** a tabela `bids`/`bid_items` (gerada na 0.3) usa `observations`/`payment_terms`
    e `numeric` p/ `unit_price`/`delivery_days`, enquanto o `@elos/shared` (3.1) expõe `notes` e
    `deliveryDays: number`. Em vez de migrar o schema (fora do escopo "In" da 3.3), o service **mapeia**:
    `dto.notes`↔coluna `observations`, `String(unitPrice)`/`String(deliveryDays)` no insert e
    `${deliveryDays}::int` no select. O vencedor é `SELECTED` (enum canônico `bid_status`), não `ACCEPTED`
  - **Verificado:** `vitest run` (115/115), `pnpm type-check` (3 workspaces) e `biome check` dos arquivos
    novos verdes (só warnings `noNonNullAssertion` de `companyId!`, severidade `warn`, padrão do projeto).
    Checklist de segurança coberto: 400 em create fora de OPEN, 400 fornecedor não convidado, 409 lance
    duplicado, 400 submit sem itens, 400 select-winner fora de CLOSED, 400 lance não SUBMITTED, 409 já há
    vencedor, `compare` não interpreta "compare" como `:bidId`, queries escopadas a `companyId`, audit log
    em toda mutação. Banco vivo não executado — sem Supabase neste ambiente
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (3.3) — bids importados de `db/schema/quotations`
    (não há `db/schema/bids.ts`), mapeamento `notes`↔`observations` + numeric→string, status `SELECTED`
    (não `ACCEPTED`), `@Inject` explícito na DI, audit log adicionado a delete/itens, `enqueue` do service
    spec como fila sequencial (a versão da spec sobrescrevia e quebrava os fluxos multi-select)

- [x] **3.4 — Quotations Management UI (Frontend)** — spec `20-quotations-ui-spec.md`
  - Commit convencional esperado: `feat(web): add quotations ui with list, form and detail`
  - `lib/api.ts` estendido: 4 funções server-side (`getQuotationsServer` com query `status`/`search`,
    `getQuotationServer`, `getQuotationItemsServer`, `getQuotationSuppliersServer`) + 10 client-side
    (`createQuotation`/`updateQuotation`/`publishQuotation`/`closeQuotation`/`cancelQuotation`, itens
    `addQuotationItem`/`updateQuotationItem`/`removeQuotationItem`, convites `inviteSupplierToQuotation`/
    `removeSupplierFromQuotation`), no padrão `sessionHeaders()` (server) e `client()` ky (client);
    imports de tipos de `@elos/shared`
  - `components/domain/`: `quotation-status-badge.tsx` (badge por status via tokens semânticos —
    DRAFT→muted, OPEN→success, CLOSED→info, CANCELLED→destructive), `quotation-form.tsx` (form
    reutilizável create/edit, `deadline` via `datetime-local` convertido p/ ISO no submit e ISO→local
    no default de edit), `quotation-items-panel.tsx` (Client Component com estado local + form inline
    de adição + remoção), `quotation-suppliers-panel.tsx` (convites com select de fornecedor APPROVED
    ainda não convidado + remoção), `quotations-list-client.tsx` (tabs de status + busca por título/
    número client-side + tabela com kebab menu — Ver/Editar/Cancelar conforme status e `canMutate`,
    `AlertDialog` antes de cancelar) e `quotation-actions.tsx` (Publicar em DRAFT, Fechar Recebimento e
    Cancelar via `AlertDialog` de confirmação)
  - Rotas `(app)/[cnpj]/quotations/`: `page.tsx` (SSR lista + filtros via Client Component), `loading.tsx`
    (skeleton), `error.tsx` (boundary com `console.error`), `new/page.tsx` (form create), `[id]/page.tsx`
    (detalhe: header + grid de info + painel de itens + painel de fornecedores + ações de status,
    link "Ver lances/comparativo →" p/ a futura 3.5 em OPEN/CLOSED), `[id]/loading.tsx`, `[id]/error.tsx`,
    `[id]/edit/page.tsx` (form edit, **404 se a cotação não for DRAFT**). Sidebar (1.4) já tinha o item
    "Cotações" (`ClipboardList`) — nenhuma mudança necessária
  - **Verificado:** `pnpm --filter web type-check` (3 workspaces) verde; `biome lint` dos arquivos novos
    limpo (só o warning `noNonNullAssertion` pré-existente em `API_URL` de `lib/api.ts`); `pnpm --filter
    web build` **compila + checa tipos + gera as rotas de quotations** (`page`/`new`/`[id]`/`[id]/edit`
    confirmados em `.next/server/app`, ✓ 9/9 static pages). Passo `output: 'standalone'` falha por `EPERM`
    de symlink no Windows (mesma limitação de 0.5/1.4/1.5/2.4/2.5). Fluxo runtime (criar/editar/publicar/
    fechar/cancelar, adicionar/remover item, convidar/remover fornecedor) não exercitado — requer API +
    banco vivos
  - **Ajustes vs. spec:** implementação seguiu as convenções reais do codebase (suppliers 2.4 / products
    2.5) em vez do código literal da spec: (a) **Tailwind utility classes + tokens semânticos** em vez dos
    inline styles com `var(--color-*)`/hex da spec — consistência visual com o resto do app; (b) assinaturas
    server-side `getXServer(cnpj, params?)` (a spec usava uma variável `cnpj` indefinida e `(params?)`); as
    páginas chamam com `cnpj` como 1º arg; (c) `params: Promise<{...}>` + `await params` (Next.js 15);
    (d) **sem `getServerSession` por página** — o `(app)/[cnpj]/layout.tsx` (1.4) já faz o guard de sessão/
    membership (a spec importava `getServerSession` de `@/lib/server-auth`, que exporta `auth`, não essa
    função); (e) role via `getMyCompaniesServer()` (não `session.user.role`); (f) `deadline` `datetime-local`
    → ISO via `setValueAs`/`toISOString` no submit e helper `isoToDatetimeLocal` no default de edit (o
    contrato exige `z.string().datetime()`); (g) cancelar usa `AlertDialog` (não `confirm()`); (h) badge por
    tokens semânticos (não hex hardcoded — não existe `--radius-full` no token set)

- [x] **4.1 — Shared Schemas: Pedidos de Compra** — spec `21-shared-schemas-purchase-orders-spec.md`
  - Commit convencional esperado: `feat(shared): add purchase order zod schemas`
  - `packages/shared/src/schemas/purchase-order.ts` — `purchaseOrderStatusValues` via
    `Object.values(PurchaseOrderStatus)` (DRAFT/APPROVED/SENT/RECEIVED/CANCELLED — sincroniza com o enum
    canônico de `enums.ts`, sem array literal hardcoded); `createPurchaseOrderSchema` (apenas `bidId` uuid
    + `notes` opcional — PO é gerado a partir de um lance `SELECTED`, sem criação manual de itens),
    `updatePurchaseOrderSchema` (apenas `notes`, status DRAFT), `purchaseOrderItemResponseSchema`
    (`quantity`/`unitPrice`/`totalPrice`/`receivedQuantity` string = numeric do postgres.js,
    `receivedQuantity` começa em `'0'` p/ progresso de recebimento da Fase 5) e `purchaseOrderResponseSchema`
    (`items[]` opcional só no GET :id, `itemCount` opcional só na listagem, `totalAmount` string); tipos
    `CreatePurchaseOrderDto`/`UpdatePurchaseOrderDto`/`PurchaseOrderItemResponse`/`PurchaseOrderResponse`
    via `z.infer`
  - Barrel `packages/shared/src/index.ts` re-exporta `./schemas/purchase-order` (ordem alfabética, entre
    `product` e `quotation`)
  - **Verificado:** `pnpm --filter @elos/shared type-check` (3 workspaces, `tsc --noEmit`) verde; o padrão
    `z.enum(purchaseOrderStatusValues)` é idêntico ao `z.enum(bidStatusValues)` já provado em `bid.ts`.
    `PurchaseOrderStatus` **não** é re-declarado (já exportado por `enums.ts`, mesmo padrão de 3.1/2.1).
    `pnpm lint` na raiz do pacote reporta apenas ruído CRLF pré-existente em arquivos não tocados
    (working tree com CRLF do `core.autocrlf=true`; git armazena LF — o arquivo novo é LF, consistente)
  - **Out (próximas unidades):** módulo NestJS de purchase-orders (4.2), UI (4.3), schema de recebimento (Fase 5)
- [x] **3.5 — Lances e Comparativo UI (Frontend)** — sem spec dedicada (derivada da API 3.3 + schemas 3.1)
  - Commit convencional esperado: `feat: add bids and comparison ui with winner selection`
  - **Sem arquivo de spec** (a numeração de specs salta de `20-quotations-ui` para `21-purchase-orders`);
    implementação derivada dos endpoints reais do `BidsModule` (3.3), dos schemas `bid.ts` (3.1) e das
    convenções de UI de 3.4. **Status canônico do vencedor é `SELECTED`** (confirmado em `bidStatusEnum`
    e `bids.service.ts`); o texto da spec 3.3 dizia `ACCEPTED`, desatualizado
  - `lib/api.ts` estendido: 3 funções server-side (`getBidsServer`, `getBidItemsServer`,
    `getBidComparisonServer`) + 6 client-side (`createBid`/`removeBid`/`submitBid`, `addBidItem`/
    `removeBidItem`, `selectWinner`) no padrão `sessionHeaders()` (server) e `client()` ky (client);
    tipo auxiliar `BidWithItems = BidResponse & { items: BidItemResponse[] }` (o `findOne` da API traz
    os itens, shape não coberto por `bidResponseSchema`)
  - `components/domain/`: `bid-status-badge.tsx` (DRAFT→muted, SUBMITTED→info, SELECTED→success/“Vencedor”,
    REJECTED→destructive), `bids-manager.tsx` (Client Component do estado **OPEN**: cria lance para
    fornecedor convidado sem lance, cota itens inline com preço unit. + prazo, remove item/lance, envia
    lance com `AlertDialog`; total por lance somado client-side) e `bid-comparison.tsx` (Client Component
    do estado **CLOSED**: matrix item × fornecedor com menor preço por linha destacado, total por lance no
    rodapé, banner do vencedor e seleção via `AlertDialog`; respeita `noUncheckedIndexedAccess` no acesso
    ao `record` de células)
  - Rota `(app)/[cnpj]/quotations/[id]/bids/`: `page.tsx` (SSR; `notFound` se cotação inexistente,
    `redirect` p/ o detalhe se status ≠ OPEN/CLOSED; ramifica entre `BidsManager` e `BidComparison`
    conforme status; link “Voltar para a cotação”), `loading.tsx` (skeleton) e `error.tsx` (boundary com
    `console.error`). O link “Ver lances/comparativo →” já existia no detalhe da cotação (3.4) apontando
    para esta rota — nenhuma mudança necessária lá
  - **Fora de escopo (intencional):** edição de notas do lance (`updateBid`) e edição inline de item já
    cotado (`updateBidItem`) — a API suporta, mas o fluxo usa remover+readicionar; portal de submissão
    pelo próprio fornecedor permanece fora da v1
  - **Verificado:** `pnpm type-check` (4 tasks, 3 workspaces) verde; `biome lint` dos arquivos novos limpo
    (só o warning `noNonNullAssertion` pré-existente em `API_URL` de `lib/api.ts`); `pnpm --filter web build`
    **✓ Compiled successfully + 9/9 static pages**, rota `[id]/bids` gerada em `.next/server/app` (`page.js`
    presente). Passo `output: 'standalone'` falha por `EPERM` de symlink no Windows (mesma limitação de
    0.5/1.4/1.5/2.4/2.5/3.4). Fluxo runtime (criar lance, cotar itens, enviar, comparar, selecionar
    vencedor) não exercitado — requer API + banco vivos

- [x] **4.2 — Purchase Orders Module (API)** — spec `22-purchase-orders-api-spec.md`
  - Commit convencional esperado: `feat(api): add purchase-orders module with generate-from-bid and status transitions`
  - `apps/api/src/modules/purchase-orders/`: `purchase-orders.module.ts` (importa `AbilityModule`,
    exporta `PurchaseOrdersService` para o `ReceiptsModule` da Fase 5), `purchase-orders.controller.ts`
    (`@Controller('companies/:cnpj/purchase-orders')`: GET lista com filtros `status`/`search`/`supplierId`/
    paginação, POST gera PO a partir de lance, GET `:id` detalhe com itens, PATCH `:id` (notes), e
    transições POST `:id/approve`/`send`/`cancel`/`receive`; Swagger + `ZodValidationPipe` no create/update),
    `purchase-orders.service.ts` (findAll com subquery de `itemCount` + joins de fornecedor/cotação,
    findOne com itens via join de produto, create gerando número sequencial `PO-{ano}-NNNN` por empresa a
    partir de lance `SELECTED` — valida lance da empresa, 404 se inexistente, 400 se não-SELECTED, 409 se
    `bidId` já tem PO, 400 se algum item de cotação sem `productId`, `totalAmount = SUM(qty×unitPrice)`,
    insere PO+itens+audit em transação; update só em DRAFT, approve DRAFT→APPROVED com `approvedById`/
    `approvedAt`, send APPROVED→SENT com `sentAt`, cancel DRAFT/APPROVED→CANCELLED, receive SENT→RECEIVED;
    CASL antes de cada mutação e audit log em create/update/approve/send/cancel/receive),
    `purchase-orders.service.spec.ts` (21 testes) e `purchase-orders.controller.spec.ts` (7 testes) —
    **143 testes da API passando no total**
  - `ability.factory.ts` — action customizada `'receive'` adicionada ao union `Actions` (precedente da
    `'select'` de 3.3); subject `PurchaseOrder` tagueado (`& ForcedSubject<'PurchaseOrder'>`) para suportar
    `subject('PurchaseOrder', row)` no Service; ALMOXARIFE ganhou `can('receive', 'PurchaseOrder')`
    (transição SENT→RECEIVED) — ADMIN_EMPRESA e COMPRADOR já tinham `manage PurchaseOrder` (cobre receive),
    COMPRADOR já tinha `approve`, e ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR já tinham `read`
  - `app.module.ts` — `PurchaseOrdersModule` importado (após `BidsModule`)
  - **Verificado:** `vitest run` (143/143), `pnpm type-check` (3 workspaces) e `biome check` dos arquivos
    novos verdes (só warnings `noNonNullAssertion` de `user.companyId!`, severidade `warn`, padrão do projeto).
    Checklist de segurança coberto pelos testes: 403 sem permissão (read/create/update/receive), 404 PO/lance
    inexistente, 400 lance não-SELECTED / item sem produto / transições inválidas, 409 PO duplicado (`bidId`
    UNIQUE), queries escopadas a `companyId`, audit log em todas as mutações
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (4.2) — concatenação de string colapsada em template
    único (biome `useTemplate`/`noUnusedTemplateLiteral`); regra `receive` da ALMOXARIFE sem escopo
    `{ companyId }` (a spec sugeria escopo, mas a `read` vizinha já é irrestrita — isolamento garantido
    pelas queries do Service); `manage PurchaseOrder` de ADMIN/COMPRADOR mantido irrestrito (já existente,
    `manage` cobre a action `receive`)
  - **Hardening pós-review (4.2):** (a) numeração `PO-{ano}-NNNN` movida para **dentro da transação** do
    `create` com loop de retry no `23505` (`isUniqueViolation`), padrão do `QuotationsService` — fecha a
    corrida de geração concorrente (constraint `UNIQUE` em `number` já existia; sem `SELECT FOR UPDATE`/
    sequencer); (b) guarda **atômica de status** no `WHERE` do `UPDATE` de update/approve/send/cancel/receive
    (`eq(status, …)` / `inArray` no cancel) + zero linhas → `ConflictException` (TOCTOU); (c) `findAll` com
    parse seguro de paginação (`Number.parseInt` + `Number.isFinite`, sem `NaN` em `.limit()/.offset()`);
    (d) lookup de PO existente (`existingPO`) escopado a `companyId` (invariante 8); (e) 3 testes de
    forbidden-path (send/cancel/receive) que verificam `mockDb.transaction` **não** chamado — **146 testes
    da API no total**. Ver Decisões Arquiteturais (4.2)
  - **Out (próximas unidades):** UI de pedidos de compra (4.3), recebimento de mercadoria/`ReceiptsModule` (Fase 5)

- [x] **5.1 — Shared Schemas: Recebimento, Armazéns e Não-Conformidades** — spec `24-shared-schemas-recipt-warehouse-nc-spec.md`
  - Commit convencional esperado: `feat(shared): add warehouse, receipt and non-conformity zod schemas`
  - `packages/shared/src/schemas/warehouse.ts` — `createWarehouseSchema` (name 2–255, code/location opcionais),
    `updateWarehouseSchema` (`.partial()`), `warehouseResponseSchema` (nullable + `isActive` + timestamps) e
    `inventoryResponseSchema` (saldo por produto/armazém, `quantity`/`minStock` string do numeric); tipos
    `CreateWarehouseDto`/`UpdateWarehouseDto`/`WarehouseResponse`/`InventoryResponse`
  - `packages/shared/src/schemas/receipt.ts` — `createReceiptItemSchema` (`receivedQuantity` number positivo),
    `createReceiptSchema` (cabeçalho + `items[].min(1)`, `receivedAt` ISO informado pelo almoxarife),
    `receiptItemResponseSchema` (com `orderedQuantity`/`totalReceived` acumulado) e `receiptResponseSchema`
    (status `PARTIAL`/`COMPLETE` decidido pelo backend, `items` só no GET :id); tipos correspondentes
  - `packages/shared/src/schemas/stock-movement.ts` — `stockMovementTypeValues` (via `Object.values`),
    `createStockMovementSchema` (movimentações **manuais** ENTRY/EXIT/TRANSFER; `toWarehouseId` opcional p/
    transferência) e `stockMovementResponseSchema`; tipos `CreateStockMovementDto`/`StockMovementResponse`.
    Movimentações automáticas do recebimento não têm schema de criação exposto (criadas no `ReceiptsService`)
  - `packages/shared/src/schemas/non-conformity.ts` — arrays `ncStatusValues`/`ncTypeValues`/`severityValues`,
    `createNonConformitySchema` (`supplierId` obrigatório; `purchaseOrderId`/`productId` opcionais — NC pode ser
    aberta por inspeção sem PO), `updateNonConformitySchema`, transições `analyzeNcSchema`/`resolveNcSchema`/
    `rejectNcSchema`, comentários (`addNcCommentSchema`/`ncCommentResponseSchema`) e
    `nonConformityResponseSchema` (`comments` só no GET :id). `ncCommentResponseSchema` **declarado antes** de
    `nonConformityResponseSchema` para evitar referência para frente; tipos via `z.infer`
  - Barrel `packages/shared/src/index.ts` — re-exporta os 4 novos schemas em ordem alfabética
    (`non-conformity` antes de `product`; `receipt`/`stock-movement`/`warehouse` após `quotation`)
  - **Verificado:** `pnpm --filter @elos/shared build` (tsc) e `pnpm type-check` (3 workspaces) verdes;
    `biome check` dos 5 arquivos limpo (sem fixes); 8 verificações `safeParse` via `tsx` confirmadas
    (warehouse name vazio falha / válido passa, receipt sem items falha / com items passa, NC description
    < 10 falha / válida passa, stock movement válido passa, NC response com comments aninhados)
  - **Ajustes vs. spec:** nenhum desvio funcional — o projeto já usa os mesmos padrões Zod 4 da spec
    (`z.string().uuid()`/`.datetime()`, `z.enum(values)`, `Object.values(Enum) as [...]`), então o código foi
    seguido à risca. Os enums `NonConformityStatus`/`NonConformityType`/`Severity`/`StockMovementType` já
    existiam de 0.3; apenas os arrays de valores são exportados dos schemas (evita `TS2308` no barrel)
- [x] **5.2 — Warehouses Module (API)** — spec `25-warehouse-api-spec.md`
  - Commit convencional esperado: `feat(api): add warehouses module with crud and inventory view`
  - `apps/api/src/modules/warehouses/`: `warehouses.module.ts` (importa `AbilityModule`, exporta
    `WarehousesService` para o `ReceiptsService` da 5.3), `warehouses.controller.ts`
    (`@Controller('companies/:cnpj/warehouses')`: GET/POST lista+criação, `GET /inventory` global,
    GET/PATCH `:id`, `POST :id/deactivate`, `GET :id/inventory`; Swagger + `ZodValidationPipe` no
    create/update), `warehouses.service.ts` (findAll com `includeInactive`, findOne, create/update com
    dedup de `code`, deactivate soft com guarda de estoque > 0, getInventory global/por armazém com
    filtros `productId`/`search`/paginação; CASL antes de cada mutação e audit log em
    create/update/deactivate), `warehouses.service.spec.ts` (11 testes) e
    `warehouses.controller.spec.ts` (6 testes) — **163 testes da API passando no total**
  - `ability.factory.ts` — subject `Warehouse` tagueado (`& ForcedSubject<'Warehouse'>`) adicionado ao
    union `Subjects` para suportar `subject('Warehouse', row)` no `update`/`deactivate`; regra
    `read Warehouse` escopada a `{ companyId }` adicionada a COMPRADOR/ANALISTA_FINANCEIRO/TRANSPORTADOR
    (ADMIN_EMPRESA e ALMOXARIFE já tinham `manage Warehouse` da configuração inicial)
  - `apps/api/src/db/schema/warehouses.ts` — `uniqueIndex('warehouses_company_id_code_unique')` em
    `(companyId, code)` (NULLs distintos no Postgres → armazéns sem código não colidem), espelhando o
    índice de `products`; migration `0003_careless_blade.sql` gerada (`CREATE UNIQUE INDEX`)
  - `app.module.ts` — `WarehousesModule` importado
  - **Verificado:** `vitest run` (163/163), `pnpm type-check` (3 workspaces) e `biome check` dos arquivos
    novos verdes (só warnings `noNonNullAssertion` de `companyId!`/`or(...)!`, severidade `warn`, padrão
    do projeto). Checklist de segurança coberto pelos testes: 403 sem permissão (list/create/deactivate),
    404 não encontrado, 409 código duplicado, 400 ao desativar armazém com estoque, queries escopadas a
    `companyId` (incl. `getInventory`), audit log em create/update/deactivate. Banco vivo (migrate) não
    executado neste ambiente — sem Supabase
  - **Ajustes vs. spec:** ordem das rotas garantida pela posição de `getGlobalInventory` antes de
    `findOne` (a spec alerta para isso); `getInventory` usa o mesmo parse seguro de página/limite do
    `PurchaseOrdersService` (`Number.parseInt` + `Number.isNaN`) em vez do encadeamento inline da spec;
    índice único de `code` adicionado ao schema (a spec o marcava como "migration se necessário") para
    fechar a corrida na unicidade no nível do banco, além do check em aplicação
- [x] **5.3 — Receipts Module (API)** — spec `26-receipts-api-spec.md`
  - Commit convencional esperado: `feat(api): add receipts module with stock movements and po completion`
  - `apps/api/src/modules/receipts/`: `receipts.module.ts` (importa `AbilityModule` e
    `PurchaseOrdersModule`, exporta `ReceiptsService`), `receipts.controller.ts`
    (`@Controller('companies/:cnpj')`: `GET/POST /receipts`, `GET /receipts/:id`,
    `GET /purchase-orders/:poId/receipts`, `GET/POST /stock-movements`; Swagger + `ZodValidationPipe`
    no create de receipt/movimentação), `receipts.service.ts` (findAll com filtros
    `purchaseOrderId`/`warehouseId`/`status`/paginação, findOne com itens, create transacional:
    valida PO `SENT` + armazém ativo + saldo pendente por item, insere `receipt`/`receipt_items`,
    acumula `received_quantity` no PO item, gera `stock_movement` `ENTRY`, faz upsert em `inventory`
    via `ON CONFLICT (warehouse_id, product_id)`, decide `PARTIAL`/`COMPLETE` e — se completo —
    chama `purchaseOrdersService.receive()` **fora** da transação), `stock-movements.service.ts`
    (findAll com filtros `warehouseId`/`productId`/`type`/paginação; create de movimentação manual
    `ENTRY`/`EXIT`/`TRANSFER` com validação de armazém/produto, checagem de saldo em saídas e
    transferências, e upsert de `inventory` — `TRANSFER` gera `EXIT` na origem + `ENTRY` no destino),
    `receipts.service.spec.ts` (10 testes), `stock-movements.service.spec.ts` (5 testes) e
    `receipts.controller.spec.ts` (5 testes) — **184 testes da API passando no total**
  - `ability.factory.ts` — subjects `Receipt` e `StockMovement` tagueados
    (`& ForcedSubject<'Receipt'|'StockMovement'>`) no union `Subjects` para suportar condições por
    objeto `{ companyId }`; regras: ADMIN_EMPRESA/ALMOXARIFE `manage` ambos, COMPRADOR/ANALISTA_FINANCEIRO
    `read` ambos, TRANSPORTADOR `read Receipt` (regras `Receipt`/`StockMovement` pré-existentes
    condicionadas a `{ companyId }`; ADMIN_EMPRESA ganha `Receipt`, COMPRADOR/ANALISTA_FINANCEIRO ganham
    `StockMovement`, TRANSPORTADOR ganha `Receipt`)
  - `apps/api/src/db/schema/warehouses.ts` — `unique('inventory_warehouse_product_unique')` em
    `(warehouseId, productId)` na tabela `inventory` (exigida pelo upsert `ON CONFLICT`); migration
    **`0004_receipts_inventory_constraint.sql`** (`ALTER TABLE … ADD CONSTRAINT … UNIQUE`) escrita à mão
    + snapshot `0004_snapshot.json` gerado mutando o `0003` (id/prevId encadeados, `uniqueConstraints`
    adicionada) e entrada `idx 4` no `_journal.json`
  - `app.module.ts` — `ReceiptsModule` importado
  - **Verificado:** `vitest run` (184/184), `turbo run type-check --force` (4 workspaces, fresh) e
    `drizzle-kit check` (`Everything's fine 🐶🔥`) verdes; `biome check` dos arquivos novos sem erros (só
    16 warnings `noNonNullAssertion` de `companyId!`, padrão do projeto). Checklist de segurança coberto
    pelos testes: 403 sem permissão (receipt/movimentação), 404 PO/armazém, 400 PO fora de `SENT`, 400
    quantidade excede saldo pendente, 400 item fora do PO, 400 `EXIT`/`TRANSFER` sem saldo, 400 `TRANSFER`
    sem destino, PO→`RECEIVED` só quando todos os itens completos, upsert de inventory atômico (na
    transação), audit log em create de receipt e movimentação. Banco vivo (migrate) não executado — sem
    Supabase neste ambiente
  - **Ajustes vs. spec:**
    - Migration numerada **`0004`** (a spec dizia `0003`, mas `0003_careless_blade` já fora usada pela
      5.2 para o índice único de `warehouses`); SQL ajustado para `ADD CONSTRAINT … UNIQUE` no formato do
      Drizzle Kit. Constraint também adicionada ao **schema TypeScript** de `inventory` (invariante 14:
      schema é fonte de verdade) para evitar drift em futuros `drizzle-kit generate`
    - O mock thenable do Drizzle em `receipts.service.spec.ts` foi tornado **ciente de escrita-vs-leitura**:
      o `create` faz writes "fire-and-forget" (insert de `receipt_items`, update do PO item, insert do
      `stock_movement`) **entre** o insert do receipt e a releitura/atualização final do status; só leituras
      (selects e cadeias com `.returning()`) consomem a fila de `enqueue`. Sem isso, o mock simples da spec
      desalinhava a fila e o teste "COMPLETE → chama receive" falhava. As asserções/cenários permanecem os
      da spec (`stock-movements.service.spec.ts` manteve o mock simples — seu `create` captura o movimento
      no `.returning()` antes de qualquer write extra, então não desalinha)
    - `poItem.productId` usado sem `!` (a coluna é `notNull` → `string`, dispensa a asserção da spec);
      parse de página/limite no padrão `Number.parseInt` + `Number.isNaN` do projeto
  - **Nota de ambiente:** um `pnpm install` de diagnóstico (tentando depurar o `tsc`) deixou symlinks
    pendurados no `.pnpm` (store renomeado p/ hashes, links apontando p/ nomes antigos), quebrando a
    resolução de módulos do `tsc`/`drizzle-kit`/`vitest`. Resolvido com reinstalação limpa
    (`rm -rf node_modules apps/*/node_modules packages/*/node_modules && pnpm install`) — após isso,
    type-check/tests/drizzle-kit voltaram a rodar do zero e passaram
- [x] **4.3 — Purchase Orders UI (Frontend)** — spec `23-purchase-orders-ui-spec.md`
  - Commit convencional esperado: `feat(web): add purchase orders ui with list, detail and status workflow`
  - `lib/api.ts` estendido: 2 funções server-side (`getPurchaseOrdersServer` com query `status`/`search`/
    `supplierId`/paginação, `getPurchaseOrderServer` com itens) + 4 client-side (`createPurchaseOrder`,
    `approvePurchaseOrder`, `sendPurchaseOrder`, `cancelPurchaseOrder`); `receivePurchaseOrder` **não**
    incluído (transição SENT→RECEIVED é da Fase 5). Imports de tipos `PurchaseOrderResponse`/
    `PurchaseOrderItemResponse`/`CreatePurchaseOrderDto`
  - `components/domain/`: `purchase-order-status-badge.tsx` (DRAFT→muted, APPROVED→info, SENT→warning,
    RECEIVED→success, CANCELLED→destructive), `purchase-order-stepper.tsx` (stepper horizontal
    DRAFT→APPROVED→SENT→RECEIVED com `STATUS_ORDER` numérico; CANCELLED=-1 não marca nenhum step + badge
    "Cancelado"), `purchase-order-actions.tsx` (Aprovar/Enviar/Cancelar via `AlertDialog`, conforme status,
    só se `canMutate`), `purchase-orders-list-client.tsx` (tabs de status + busca por número/fornecedor
    client-side + tabela) e `generate-po-dialog.tsx` (confirma geração do PO e redireciona ao detalhe)
  - Rotas `(app)/[cnpj]/purchase-orders/`: `page.tsx` (SSR — carrega todos os status em paralelo, filtro
    client-side), `loading.tsx`, `error.tsx`, `[id]/page.tsx` (breadcrumb + header com badge + stepper +
    grid Informações/Financeiro + tabela de itens), `[id]/loading.tsx`, `[id]/error.tsx`. Sidebar (1.4) já
    tinha o item "Pedidos de Compra" (`ShoppingCart`, href `/${cnpj}/purchase-orders`) — nenhuma mudança
  - Modificação em `(app)/[cnpj]/quotations/[id]/page.tsx`: card **"🏆 Lance Vencedor"** (cotação `CLOSED`
    com lance `SELECTED`) com `GeneratePODialog` → `POST /purchase-orders` e redirect ao PO gerado.
    `getBidsServer` adicionado ao `Promise.all` da página
  - **Verificado:** `pnpm --filter @elos/web type-check` verde; `biome check` dos arquivos novos limpo (só
    o warning `noNonNullAssertion` pré-existente em `API_URL`); `pnpm --filter web build` **compila + gera
    as 2 rotas PO** (`purchase-orders/page.js` e `purchase-orders/[id]/page.js` confirmados em `.next`,
    ✓ Compiled successfully, ✓ 9/9 static pages). Passo `output: 'standalone'` falha por `EPERM` de symlink
    no Windows (mesma limitação de 0.5/.../3.5). Fluxo runtime (aprovar/enviar/cancelar, gerar PO da
    cotação) não exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (4.3) — a spec usava **inline styles com
    `hsl(var(--token))`** e `var(--radius-*)`, que produzem cor inválida neste projeto (tokens são
    `--color-*` e já vêm embrulhados em `hsl(...)`). Reimplementado com **Tailwind utility classes + tokens
    semânticos**, mesma decisão de 3.4/2.4/2.5; mutações via helper `(await client())` (não `import()`
    inline); `getBidsServer` no `Promise.all` sem condicional (a spec tinha snippet quebrado referenciando
    `quotation?.status` dentro do próprio `Promise.all`)

- [x] **5.4 — Non-Conformities Module (API)** — spec `27-non-confromities-api-spec.md`
  - Commit convencional esperado: `feat(api): add non-conformities module with status flow and comments`
  - `apps/api/src/modules/non-conformities/`: `non-conformities.module.ts` (importa `AbilityModule`,
    exporta `NonConformitiesService`), `non-conformities.controller.ts`
    (`@Controller('companies/:cnpj/non-conformities')`: `GET/POST` lista+abertura, `GET/PATCH :id`,
    `POST :id/analyze`, `:id/resolve`, `:id/reject`, `:id/comments`; Swagger + `ZodValidationPipe` por
    rota), `non-conformities.service.ts` (findAll com filtros `status`/`type`/`severity`/`supplierId`/
    `purchaseOrderId`/`search`/paginação + joins de fornecedor/PO/produto/autor, findOne com lista de
    comentários, create transacional validando fornecedor e PO opcional escopados à empresa, update só
    em `OPEN`, transições `analyze` `OPEN→ANALYZING` / `resolve` `ANALYZING→RESOLVED` / `reject`
    `ANALYZING→REJECTED` com `resolvedAt` em ambos os estados finais, addComment verificando a NC antes
    de inserir; CASL antes de cada operação e audit log em create/update/analyze/resolve/reject),
    `non-conformities.service.spec.ts` (14 testes) e `non-conformities.controller.spec.ts` (7 testes) —
    **208 testes da API passando no total**
  - `ability.factory.ts` — subject `NonConformity` tagueado (`& ForcedSubject<'NonConformity'>`) para
    suportar `subject('NonConformity', row)`; regras escopadas a `{ companyId }`: ADMIN_EMPRESA `manage`;
    ALMOXARIFE `read`+`create`+`update` (abre e edita em OPEN); COMPRADOR `read`+`update` (analyze/resolve/
    reject usam a action `update`); ANALISTA_FINANCEIRO e TRANSPORTADOR `read` (as regras `manage`/`read`
    irrestritas pré-existentes foram substituídas pelas escopadas e ALMOXARIFE perdeu o `manage` amplo)
  - `apps/api/src/db/schema/non-conformities.ts` — coluna **`notes` (`text`, nullable)** adicionada à
    tabela `non_conformities` (faltava em 0.3, mas os DTOs/response de 5.1 já a referenciavam); migration
    **`0005_pale_morph.sql`** (`ALTER TABLE … ADD COLUMN "notes" text`) gerada via `drizzle-kit generate`
  - `app.module.ts` — `NonConformitiesModule` importado
  - **Verificado:** `vitest run` (208/208), `pnpm type-check` (4 workspaces) e `biome check` dos arquivos
    novos verdes (só warnings `noNonNullAssertion` de `companyId!`, padrão do projeto). Checklist de
    segurança coberto pelos testes: 403 sem permissão (create/update/analyze), 404 fornecedor/NC, 400 em
    transições inválidas (editar fora de OPEN, resolver/rejeitar fora de ANALYZING), queries escopadas a
    `companyId`, comentário verifica a NC da empresa antes de inserir, audit log em todas as mutações.
    Banco vivo (migrate) não executado — sem Supabase neste ambiente
  - **Ajustes vs. spec:** parse de página/limite no padrão `Number.parseInt` + `Number.isNaN` do projeto
    (a spec usava `Number.isFinite` inline); coluna `notes` + migration `0005` adicionadas (a spec assumia
    a coluna já existente desde 0.3); ordenação de imports/formatação aplicada pelo `biome check --write`

- [x] **5.5 — Warehouses UI (Frontend)** — spec `28-warehouse-ui-spec.md`
  - Commit convencional esperado: `feat(web): add warehouses ui with list, form and inventory view`
  - `lib/api.ts` estendido: 4 funções server-side (`getWarehousesServer` com query `includeInactive`,
    `getWarehouseServer`, `getInventoryServer` listagem global com filtros `warehouseId`/`productId`/
    `search`/paginação, `getWarehouseInventoryServer` inventário por armazém) + 3 client-side
    (`createWarehouse`/`updateWarehouse`/`deactivateWarehouse` → `POST :id/deactivate` retornando
    `{ success }`), no padrão `sessionHeaders()` (server) e `client()` ky (client); imports de tipos de
    `@elos/shared` (`CreateWarehouseDto`/`UpdateWarehouseDto`/`WarehouseResponse`/`InventoryResponse`)
  - `components/domain/`: `warehouse-form.tsx` (form reutilizável create/edit via `react-hook-form` +
    `zodResolver`, schema `create`/`update` conforme o modo, redirect + toast no sucesso),
    `warehouses-list-client.tsx` (Client Component: busca por nome/código client-side, tabela com kebab
    menu — Ver/Editar/Desativar só em armazéns ativos e só se `canMutate`, linha esmaecida `opacity-50` +
    badge Ativo/Inativo, `AlertDialog` antes de desativar com aviso de estoque) e `inventory-table.tsx`
    (saldo por produto com busca client-side, coluna `Armazém` opcional via prop `showWarehouse`, alerta
    inline `AlertTriangle` vermelho quando `quantity < minStock`)
  - Rotas `(app)/[cnpj]/warehouses/`: `page.tsx` (SSR lista com `includeInactive: 'true'` + role via
    membership), `loading.tsx` (skeleton), `error.tsx` (boundary com `console.error`), `new/page.tsx`
    (form create), `[id]/page.tsx` (detalhe + inventário do armazém via `InventoryTable showWarehouse=false`),
    `[id]/loading.tsx`, `[id]/error.tsx`, `[id]/edit/page.tsx` (form edit, `notFound` se inexistente/inativo).
    Sidebar (1.4) já tinha o item "Armazéns" — nenhuma mudança necessária
  - **Verificado:** `pnpm --filter web type-check` verde; `biome check` dos arquivos novos limpo após
    `--write` (só 1 warning `noNonNullAssertion` em `warehouse-form` — `warehouse!.id` no modo edit,
    idêntico ao `cnpj!`/`supplierId!`/`productId!` dos outros forms, padrão do projeto); `pnpm --filter web
    build` **compila + checa tipos + gera as 4 rotas de warehouses** (`page`/`new`/`[id]`/`[id]/edit`
    confirmadas em `.next/server/app`, ✓ 9/9 static pages). Passo `output: 'standalone'` falha por `EPERM`
    de symlink no Windows (mesma limitação de 0.5/1.4/1.5/2.4/2.5). Fluxo runtime (criar/editar/desativar,
    inventário, alerta de estoque mínimo) não exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** import `notFound` não usado removido do `page.tsx` da listagem (o projeto trata
    `noUnusedImports` como erro; a spec o listava sem uso) — mantido nas rotas `[id]`/`[id]/edit` que o
    chamam; ordenação de imports/formatação aplicada pelo `biome check --write`

- [x] **5.6 — Receipts UI (Frontend)** — spec `29-receipts-ui-spec.md`
  - Commit convencional esperado: `feat(web): add receipts ui linked to purchase order detail`
  - `lib/api.ts` estendido: 2 funções server-side (`getReceiptsServer` com query `purchaseOrderId`/
    `warehouseId`/`status`/paginação, `getReceiptServer`) + 1 client-side (`createReceipt`), no padrão
    `sessionHeaders()` (server) e `client()` ky (client); imports de tipos `CreateReceiptDto`/`ReceiptResponse`
  - `components/domain/`: `receipt-form.tsx` (Client Component em rota dedicada — select nativo de armazém,
    `datetime-local` default agora, tabela de itens do PO com Pedido/Já recebido/Pendente/Receber agora +
    obs por item, itens com pendente 0 desabilitados/esmaecidos, filtra `qty > 0` no submit, toast distinto
    COMPLETE vs. PARTIAL, redirect ao detalhe do recebimento) e `receipts-list-client.tsx` (busca client-side
    por PO/armazém, badge de status, estado vazio com ícone `Package`)
  - Rotas `(app)/[cnpj]/receipts/`: `page.tsx` (SSR lista via Client Component), `loading.tsx`, `error.tsx`,
    `[id]/page.tsx` (detalhe com itens recebidos — este/total recebido, notas, link ao PO), `[id]/loading.tsx`,
    `[id]/error.tsx`. Nova rota `(app)/[cnpj]/purchase-orders/[id]/receive/` (`page.tsx` com guards `notFound`/
    redirect se PO ≠ SENT, role fora de `ADMIN_EMPRESA/ALMOXARIFE/SUPER_ADMIN`, ou sem armazém ativo →
    `/warehouses`; `loading.tsx`/`error.tsx`). `purchase-orders/[id]/page.tsx` modificado: painel
    "Recebimentos" quando status SENT/RECEIVED + botão "Registrar Recebimento" (SENT && canMutate)
  - **Verificado:** `pnpm --filter web type-check` verde; `biome check` dos arquivos novos limpo após
    `--write` (só os warnings `noNonNullAssertion` padrão do projeto — `next[index]!` do spec e o `API_URL`
    pré-existente); `pnpm --filter web build` **compila + checa tipos + gera as rotas** (`receipts/page`,
    `receipts/[id]/page`, `purchase-orders/[id]/receive/page` confirmadas em `.next/server/app`, ✓ 9/9
    static pages). Passo `output: 'standalone'` falha por `EPERM` de symlink no Windows (mesma limitação de
    0.5/1.4/1.5/2.4/2.5/5.5). Fluxo runtime (registrar recebimento parcial/completo, conclusão automática do
    PO, listagem/detalhe) não exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** `ReceiptForm` usa `poItem.quantity`/`poItem.receivedQuantity` (campos reais de
    `PurchaseOrderItemResponse`) no lugar de `orderedQuantity`/`totalReceived` do exemplo da spec, que não
    existem no schema do item de PO — necessário para o type-check passar (invariante "tipos corretos");
    `po as any` da spec dispensado (`getPurchaseOrderServer` já retorna `& { items }`, então o narrowing
    pós-`notFound` satisfaz o prop do form); import `ReceiptItemResponse` omitido do `api.ts` (não usado lá —
    `noUnusedImports` é erro); ordenação de imports/formatação aplicada pelo `biome check --write`

- [x] **5.7 — Non-Conformities UI (Frontend)** — spec `30-non-conformities-ui-spec.md`
  - Commit convencional esperado: `feat(web): add non-conformities ui with list, detail and status flow`
  - `lib/api.ts` estendido: 2 funções server-side (`getNonConformitiesServer` com query
    `status`/`type`/`severity`/`supplierId`/`purchaseOrderId`/`search`/paginação, `getNonConformityServer`)
    + 6 client-side (`createNonConformity`/`updateNonConformity`, transições `analyzeNonConformity`/
    `resolveNonConformity`/`rejectNonConformity` e `addNcComment`), no padrão `sessionHeaders()` (server) e
    `client()` ky (client); imports de tipos `NonConformityResponse`/`NcCommentResponse`/`CreateNonConformityDto`/
    `UpdateNonConformityDto`/`AnalyzeNcDto`/`ResolveNcDto`/`RejectNcDto`/`AddNcCommentDto`
  - `components/domain/`: `nc-status-badge.tsx` (`NcStatusBadge` por status + `NcSeverityBadge` por severidade,
    ambos com fallback), `non-conformity-form.tsx` (form de abertura — selects nativos de fornecedor/tipo/
    severidade, `purchaseOrderId` pré-selecionado quando vindo do PO, redirect ao detalhe), `nc-actions.tsx`
    (Client Component: botões condicionados por status — OPEN→Iniciar Análise, ANALYZING→Resolver/Rejeitar —
    via `AlertDialog` com textarea de resolução/motivo, validação mínima de 5 chars, oculto se `!canAct`),
    `nc-comments-panel.tsx` (lista de comentários com avatar gerado + envio com atalho Ctrl/Cmd+Enter,
    `router.refresh()`) e `non-conformities-list-client.tsx` (filtro de status por botões + busca client-side
    por descrição/fornecedor/PO, tabela, estado vazio com ícone `AlertTriangle`)
  - Rotas `(app)/[cnpj]/non-conformities/`: `page.tsx` (SSR lista + botão "Abrir NC" se papel em
    `ADMIN_EMPRESA/ALMOXARIFE/SUPER_ADMIN`), `loading.tsx`, `error.tsx`, `new/page.tsx` (form com fornecedores
    APPROVED + `searchParams.purchaseOrderId` para pré-vínculo), `[id]/page.tsx` (detalhe com header de
    status/severidade, descrição, bloco de resolução, meta e painel de comentários; `canAct` por papel
    `ADMIN_EMPRESA/COMPRADOR/SUPER_ADMIN`), `[id]/loading.tsx`, `[id]/error.tsx`. `purchase-orders/[id]/page.tsx`
    modificado: card "Não-Conformidades" após o painel de recebimentos (NCs vinculadas via
    `getNonConformitiesServer({ purchaseOrderId })` + link "Abrir NC" com `?purchaseOrderId=` se `canMutate`)
  - **Verificado:** `pnpm --filter @elos/web type-check` verde; `biome check` dos arquivos novos limpo após
    `--write` (só o warning `noNonNullAssertion` do `API_URL` pré-existente); `pnpm --filter web build`
    **compila + checa tipos + gera as rotas** (`non-conformities/page`, `non-conformities/new/page`,
    `non-conformities/[id]/page` confirmadas em `.next/server/app`, ✓ 9/9 static pages). Passo `output:
    'standalone'` falha por `EPERM` de symlink no Windows (mesma limitação de 0.5/1.4/1.5/2.4/2.5/5.5/5.6).
    Fluxo runtime (abrir NC do PO, transições de status, comentários) não exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** import `ncStatusValues as _` do `non-conformity-form` omitido (era declaradamente não
    usado — `noUnusedImports` é erro; o tree-shake citado pela spec não se aplica); prop `canCreate` mantida na
    interface mas não desestruturada em `non-conformities-list-client` (o botão de criação vive na página, não na
    lista — evita variável não usada); ordenação de imports/formatação aplicada pelo `biome check --write`

- [x] **6.1 — Shared Schemas: Notas Fiscais e Pagamentos** — spec `31-shared-schemas-invoices-payments-spec.md`
  - Commit convencional esperado: `feat(shared): add invoice and payment zod schemas`
  - `packages/shared/src/schemas/invoice.ts` — `invoiceStatusValues` (de `InvoiceStatus`),
    item da NF (`createInvoiceItemSchema`/`invoiceItemResponseSchema`), NF vinculada a PO+fornecedor
    (`createInvoiceSchema` — `purchaseOrderId`/`supplierId` obrigatórios, `fileUrl` e `items` opcionais;
    `updateInvoiceSchema`, `validateInvoiceSchema`, `rejectInvoiceSchema` com motivo min 5,
    `invoiceResponseSchema` com `items[]` só no GET :id e `itemCount` só na listagem) + tipos via `z.infer`
  - `packages/shared/src/schemas/payment.ts` — `paymentStatusValues`/`paymentMethodValues` (de enums)
    e `installmentStatusValues` declarado inline (`['PENDING','PAID','OVERDUE']` — `InstallmentStatus`
    não existe em `enums.ts`); parcelas (`createInstallmentSchema`/`installmentResponseSchema`),
    pagamento vinculado a NF (`createPaymentSchema` — `installments` com `min(1)`; `updatePaymentSchema`,
    `paymentResponseSchema` com `installments[]` só no GET :id e `installmentCount` só na listagem) e
    `payInstallmentSchema` (todos opcionais) + tipos via `z.infer`
  - Barrel `packages/shared/src/index.ts` re-exporta `./schemas/invoice` e `./schemas/payment` (ordem alfabética)
  - **Verificado:** `pnpm --filter @elos/shared build` (tsc), `pnpm type-check` (3 workspaces) e `biome check`
    dos 3 arquivos verdes; 7 `safeParse` da spec confirmados (NF sem `purchaseOrderId` falha, NF válida passa,
    NF com `totalAmount` negativo falha, pagamento sem parcelas falha, pagamento válido passa, método inválido
    falha, `payInstallment` vazio passa). `InvoiceStatus`/`PaymentStatus`/`PaymentMethod` não re-exportados dos
    schema files (já em `enums.ts`) — só os arrays de valores. `pnpm lint` na raiz do pacote reporta apenas
    ruído CRLF pré-existente em `stock-movement.ts` (arquivo não tocado, normalizado no CI/Linux)
  - **Ajuste vs. spec:** formatação aplicada pelo `biome check --fix` (single-space em vez do alinhamento de
    colunas da spec; import `{ PaymentMethod, PaymentStatus }` reordenado) — padrão do projeto, espelha os
    demais schema files

- [x] **6.2 — Invoices Module (API)** — spec `32-invoices-api-spec.md`
  - Commit convencional esperado: `feat(api): add invoices module with crud, validation and file upload`
  - `apps/api/src/modules/invoices/`: `invoices.module.ts` (importa `AbilityModule`, exporta
    `InvoicesService`), `invoices.controller.ts` (`@Controller('companies/:cnpj/invoices')`: GET/POST
    lista+criação, GET/PATCH `:id`, POST `:id/validate` e `:id/reject`, sub-recurso de itens
    `:id/items` POST + `:id/items/:itemId` DELETE, e `:id/upload`; Swagger + `ZodValidationPipe` por rota),
    `invoices.service.ts` (findAll com filtros `status`/`supplierId`/`purchaseOrderId`/`search`/paginação,
    findOne com itens e `validatedByName`, create validando PO em `SENT`/`RECEIVED` + fornecedor `APPROVED`
    com itens opcionais na mesma transação, update só em `PENDING`, validate `PENDING→VALIDATED`, reject
    `PENDING→REJECTED` com `rejectionReason`, addItem/removeItem só em `PENDING`, uploadFile grava `fileUrl`;
    CASL antes de cada mutação e audit log em create/update/validate/reject/addItem/removeItem),
    `invoices.service.spec.ts` (17 testes) e `invoices.controller.spec.ts` (7 testes) — **232 testes da API no total**
  - `ability.factory.ts` — subject `Invoice` tagueado (`& ForcedSubject<'Invoice'>`) para suportar
    `subject('Invoice', row)` no update/validate/reject; regras `Invoice` escopadas a `{ companyId }`:
    ADMIN_EMPRESA e ANALISTA_FINANCEIRO `manage`, COMPRADOR/ALMOXARIFE/TRANSPORTADOR `read`
  - `db/schema/invoices.ts` — `uniqueIndex('invoices_company_id_number_unique')` em `(companyId, number)`
    (número fiscal externo, único por empresa); migration `0006_invoices_number_company_unique.sql`
    (`CREATE UNIQUE INDEX`) + entrada no `_journal.json` e `0006_snapshot.json` derivado do 0005
  - `app.module.ts` — `InvoicesModule` importado
  - **Verificado:** `vitest run` da API (232/232, ≥230 esperados), `pnpm type-check` (3 workspaces) e
    `biome check` dos arquivos novos/modificados verdes (só warnings `noNonNullAssertion` de `companyId!`,
    severidade `warn`, padrão do projeto). Checklist de segurança coberto: 403 sem permissão (COMPRADOR só
    lê — `cannot('create','Invoice')`), 404 PO/fornecedor/NF não encontrados, 400 PO fora de SENT/RECEIVED,
    400 fornecedor não APPROVED, 400 em transições/edições fora de PENDING, queries escopadas a `companyId`,
    audit log nas mutações. Banco vivo (`db:migrate`) não executado — sem Supabase neste ambiente
  - **Ajustes vs. spec:** import `inArray`/`ConflictException` não usados removidos do service (evita
    `noUnusedImports`); `validate(id, _dto, user)` — o param `dto` (notas) não é persistido na v1, prefixado
    `_`; `addItem` com guard `if (!item)` antes do audit log (evita `!` em `item!.id`); upload via URL no body
    (`@Body('fileUrl')`), não multipart — o front faz upload direto ao Supabase Storage via signed URL

- [x] **6.3 — Payments Module (API)** — spec `33-payments-api.md`
  - Commit convencional esperado: `feat(api): add payments module with installments and reconciliation`
  - `apps/api/src/modules/payments/`: `payments.module.ts` (importa `AbilityModule`, exporta
    `PaymentsService`), `payments.controller.ts` (`@Controller('companies/:cnpj/payments')`: GET/POST
    lista+criação, GET `:id` (detalhe com parcelas), PATCH `:id` (notas), POST `:id/cancel` e
    `:id/installments/:installmentId/pay`; Swagger + `ZodValidationPipe` por rota),
    `payments.service.ts` (findAll com filtros `status`/`method`/`invoiceId`/`search` por número da NF/
    paginação, findOne com parcelas ordenadas, create validando NF da empresa em `VALIDATED` + dedup por
    `invoiceId` (1 pagamento por NF) inserindo parcelas na mesma transação, update só de `notes` em
    `PENDING`, cancel só em `PENDING` e bloqueado se há parcela `PAID`, payInstallment marca parcela
    `PENDING→PAID` com `paidAt` e auto-completa o pagamento `PENDING→PAID` quando nenhuma parcela resta
    pendente; CASL antes de cada mutação e audit log em create/cancel/pay/complete),
    `payments.service.spec.ts` (14 testes) e `payments.controller.spec.ts` (6 testes) — **252 testes da API no total**
  - `ability.factory.ts` — subject `Payment` tagueado (`& ForcedSubject<'Payment'>`) para suportar
    `subject('Payment', row)` no update/cancel; regras `Payment` escopadas a `{ companyId }`:
    ADMIN_EMPRESA e ANALISTA_FINANCEIRO `manage`, COMPRADOR/ALMOXARIFE/TRANSPORTADOR `read` (antes
    ADMIN/ANALISTA tinham `manage Payment` sem escopo — agora escopado ao tenant)
  - `app.module.ts` — `PaymentsModule` importado
  - **Verificado:** `vitest run` da API (252/252, ≥250 esperados), `pnpm type-check` (3 workspaces) e
    `biome check` dos arquivos novos/modificados verdes (só warnings `noNonNullAssertion` de `companyId!`,
    severidade `warn`, padrão do projeto). Checklist de segurança coberto: 403 sem permissão (`create`/
    `read`/`update`), 404 NF/pagamento não encontrados, 400 NF fora de `VALIDATED`, 409 pagamento duplicado
    por NF, 400 cancelar com parcela paga, auto-completar `PENDING→PAID`, queries escopadas a `companyId`,
    audit log nas mutações. Banco vivo não exercitado — sem Supabase neste ambiente
  - **Ajustes vs. spec:** parse de paginação alinhado ao padrão de `invoices.service` (`Number.parseInt`
    + `Number.isNaN`, sem ternário inline duplicado), mais limpo e lint-safe; demais comportamentos
    idênticos à spec. Sem migration nesta unidade — as tabelas `payments`/`payment_installments` já
    existiam no schema Drizzle (`db/schema/payments.ts`) desde a 0.3

- [x] **6.4 — Invoices UI (Frontend)** — spec `34-invoices-ui-spec.md`
  - Commit convencional esperado: `feat(web): add invoices ui with list, form, detail and validation`
  - `lib/api.ts` estendido: 2 funções server-side (`getInvoicesServer` com query `status`/`supplierId`/
    `purchaseOrderId`/`search`/`page`/`limit` — 404 → `[]`, demais falhas propagam; `getInvoiceServer`
    — 404 → `null` para `notFound()`) + 6 client-side (`createInvoice`/`updateInvoice`/`validateInvoice`/
    `rejectInvoice`/`addInvoiceItem`/`removeInvoiceItem`), no padrão `sessionHeaders()` (server) e
    `client()` ky (client); imports de tipos de `@elos/shared`
  - `components/domain/`: `invoice-status-badge.tsx` (PENDING→muted, VALIDATED→success, REJECTED→destructive),
    `invoice-form.tsx` (Client Component: selects de PO SENT/RECEIVED e fornecedor APPROVED, número,
    `datetime-local` de emissão, valor total + impostos, URL de arquivo opcional; pré-seleciona PO via
    `?purchaseOrderId`; redirect ao detalhe após criar), `invoices-list-client.tsx` (Client Component:
    tabs de status Todas/Pendentes/Validadas/Rejeitadas + busca por número client-side + tabela com
    kebab menu hand-rolled — Ver sempre, Validar/Rejeitar só em PENDING e só se `canMutate`, com
    `AlertDialog` de confirmação/motivo), `invoice-items-panel.tsx` (Client Component: tabela de itens
    com form inline de adição e remoção só em PENDING, totalização no rodapé e comparação visual
    Valor NF × Valor PO × Diferença) e `invoice-actions.tsx` (Client Component: Validar com `AlertDialog`
    de confirmação e Rejeitar com `AlertDialog` + textarea de motivo min 5 chars, só visível se `canMutate`
    e status PENDING)
  - Rotas `(app)/[cnpj]/invoices/`: `page.tsx` (SSR lista via Client Component + botão "Registrar NF" se
    `canMutate`), `loading.tsx` (skeleton), `error.tsx` (boundary com `console.error`), `new/page.tsx`
    (SSR carrega POs SENT/RECEIVED + fornecedores APPROVED e passa ao form, lê `?purchaseOrderId`),
    `[id]/page.tsx` (SSR detalhe + itens + ações; carrega o PO vinculado para o `poTotal` da comparação),
    `[id]/loading.tsx` e `[id]/error.tsx`
  - `purchase-orders/[id]/page.tsx` — card "Notas Fiscais" adicionado após o painel de recebimentos
    (só em PO `SENT`/`RECEIVED`): lista NFs vinculadas via `getInvoicesServer({ purchaseOrderId })`, link
    "Registrar NF" com `?purchaseOrderId=` e cada NF com número, valor e status badge. Sidebar (1.4) já
    tinha o item "Notas Fiscais" no grupo Financeiro — nenhuma mudança necessária
  - **Verificado:** `pnpm --filter web type-check` (3 workspaces) verde; `biome check` dos arquivos
    novos/modificados limpo (só o warning `noNonNullAssertion` pré-existente em `API_URL`, severidade
    `warn`, padrão do projeto); `pnpm --filter web build` **compila + checa tipos + gera as rotas de
    invoices** (✓ Compiled successfully, ✓ 9/9 static pages). Passo `output: 'standalone'` falha por
    `EPERM` de symlink no Windows (mesma limitação de 0.5/1.4/1.5/2.4/2.5). Fluxo runtime (criar NF,
    validar/rejeitar, adicionar/remover itens, comparação de valores, card no detalhe do PO) não
    exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** (a) selects de PO/fornecedor do `invoice-form` carregados **server-side** no
    `new/page.tsx` e passados como props (padrão de `non-conformity-form`), em vez de fetch client-side —
    a seção "API Functions em lib/api.ts" da spec enumera apenas funções de invoice, sem fetchers
    client-side de PO/fornecedor; o form permanece Client Component; (b) kebab menu da listagem
    implementado hand-rolled (botão + menu posicionado + overlay de clique-fora), pois não há primitivo
    `dropdown-menu` em `components/ui` e a invariante proíbe escrever primitivos shadcn à mão; (c) link
    "Registrar NF" no detalhe do PO gateado por papéis de mutação de NF (SUPER_ADMIN/ADMIN_EMPRESA/
    ANALISTA_FINANCEIRO) em vez do `canMutate` de PO (COMPRADOR/ADMIN/SUPER) — evita exibir uma ação que
    resultaria em 403, já que COMPRADOR não pode criar NF

- [x] **6.5 — Payments UI (Frontend)** — spec `35-payments-ui-spec.md`
  - Commit convencional esperado: `feat(web): add payments ui with list, detail, installments and reconciliation`
  - `lib/api.ts` estendido: 2 funções server-side (`getPaymentsServer` com query
    `status`/`method`/`invoiceId`/`search`/`page`/`limit` — 404 → `[]`, demais falhas propagam;
    `getPaymentServer` — 404 → `null` para `notFound()`, retorna `PaymentWithInstallments`) + 4 client-side
    (`createPayment`/`updatePayment`/`cancelPayment`/`payInstallment`), no padrão `sessionHeaders()` (server)
    e `client()` ky (client); tipo exportado `PaymentWithInstallments = PaymentResponse & { installments[] }`;
    imports de tipos de `@elos/shared` (`CreatePaymentDto`/`UpdatePaymentDto`/`PayInstallmentDto`/
    `PaymentResponse`/`InstallmentResponse`)
  - `components/domain/`: `payment-status-badge.tsx` (PENDING→muted, PAID→success, CANCELLED→destructive),
    `payment-method-badge.tsx` (BOLETO/TRANSFER/CHECK→outline, PIX→info), `create-payment-dialog.tsx`
    (Client Component **autocontido** — renderiza o próprio botão "Registrar Pagamento" + `Sheet` com estado
    interno: valor total default = valor da NF, select de método, notas, seção de parcelas dinâmica com
    "Adicionar parcela"/remover, default 1 parcela com vencimento hoje+30d, validação soma ≥ total, redirect
    ao detalhe após criar), `payments-list-client.tsx` (Client Component: tabs de status
    Todos/Pendentes/Pagos/Cancelados + filtro de método + busca por número da NF client-side + tabela com
    kebab menu hand-rolled — Ver sempre, Cancelar só em PENDING e só se `canMutate`, com `AlertDialog`),
    `installments-panel.tsx` (Client Component: tabela de parcelas com destaque vermelho para vencidas
    (`dueDate < now && PENDING`), botão "Pagar" por parcela via `AlertDialog`, barra de progresso
    pagas/total e banner "Pagamento concluído" quando status PAID/todas pagas) e `payment-actions.tsx`
    (Client Component: "Cancelar Pagamento" com `AlertDialog`, só visível em PENDING + `canMutate`)
  - Rotas `(app)/[cnpj]/payments/`: `page.tsx` (SSR lista via Client Component), `loading.tsx` (skeleton),
    `error.tsx` (boundary com `console.error`), `[id]/page.tsx` (SSR detalhe + grid Informações/Financeiro +
    painel de parcelas + ações), `[id]/loading.tsx` e `[id]/error.tsx`
  - `invoices/[id]/page.tsx` — seção "Pagamento" adicionada antes dos itens: busca pagamento existente via
    `getPaymentsServer({ invoiceId })` (1:1 por NF); se houver, card com status badge + valor + link ao
    detalhe; senão, em NF `VALIDATED` e `canMutate`, renderiza `<CreatePaymentDialog>`. Sidebar (1.4) já
    tinha o item "Pagamentos" (`CreditCard`) no grupo Financeiro — nenhuma mudança necessária
  - **Verificado:** `pnpm --filter web type-check` (3 workspaces) verde; `biome check` dos arquivos
    novos/modificados limpo (só o warning `noNonNullAssertion` pré-existente em `API_URL`, severidade
    `warn`, padrão do projeto); `pnpm --filter web build` **compila + checa tipos + gera as rotas de
    payments** (`page`/`[id]`). Passo `output: 'standalone'` falha por `EPERM` de symlink no Windows
    (mesma limitação de 0.5/1.4/1.5/2.4/2.5/6.4). Fluxo runtime (criar pagamento, pagar parcela com
    auto-conclusão, cancelar, integração no detalhe da NF) não exercitado — requer API + banco vivos
  - **Ajustes vs. spec:** (a) `create-payment-dialog` é **autocontido** (renderiza seu próprio botão +
    gerencia `open` internamente) em vez de receber `open`/`onOpenChange`, já que é invocado apenas do
    detalhe da NF (Server Component, sem estado) e a criação não parte da listagem; (b) kebab menu da
    listagem implementado hand-rolled (botão + menu posicionado + overlay de clique-fora), pois não há
    primitivo `dropdown-menu` em `components/ui` e a invariante proíbe escrever primitivos shadcn à mão;
    (c) parcelas usam estado local posicional (input `type="date"` → ISO no submit), sem react-hook-form,
    por serem dinâmicas (adicionar/remover); (d) status visual de parcela `OVERDUE` derivado no cliente
    (`dueDate < now && PENDING`), já que o job de atualização de parcelas OVERDUE está fora do escopo v1

- [x] **7.1 — Shared Schemas: Audit Log** — spec `36-shared-schemas-audit-log-spec.md`
  - Commit convencional esperado: `feat(shared): add audit log zod schemas`
  - `packages/shared/src/schemas/audit-log.ts` — audit log **read-only** (sem schema de criação; os
    inserts são feitos internamente pelos Services): `auditLogQuerySchema` (filtros `entity`/`entityId`/
    `action`/`userId`/`startDate`/`endDate` todos opcionais + `page`/`limit` com `z.coerce` e defaults
    1/50, `limit` máx. 100), `auditLogResponseSchema` (`before`/`after` como `z.record(...).nullable()`,
    campos de usuário/empresa nullable), arrays const `auditLogEntities` (21 entidades) e `auditLogActions`
    (18 ações) para alimentar dropdowns de filtro no frontend sem hardcoding + tipos `AuditLogQuery`/
    `AuditLogResponse` via `z.infer`
  - `packages/shared/src/schemas/dashboard.ts` — DTOs de KPIs (contrato backend→frontend):
    `dashboardKpisSchema` (cotações, pedidos, financeiro com `totalPayable`/`totalPaid` como `string` =
    numeric do postgres.js, estoque, NCs, fornecedores), `dashboardRecentActivitySchema` (com `summary`
    montado pelo backend) e `dashboardResponseSchema` (`kpis` + `recentActivity[]`) + tipos
    `DashboardKpis`/`DashboardRecentActivity`/`DashboardResponse` via `z.infer`
  - Barrel `packages/shared/src/index.ts` re-exporta `./schemas/audit-log` e `./schemas/dashboard`
    (em ordem alfabética: `audit-log` antes de `bid`, `dashboard` entre `company` e `invoice`)
  - **Verificado:** `pnpm --filter @elos/shared build` (`tsc --noEmit`) e `pnpm type-check` (4 tasks,
    3 workspaces) verdes; `biome check` dos 3 arquivos novos/modificados limpo; 5 `safeParse` da spec
    confirmados via tsx: query vazia passa com defaults `{page:1,limit:50}`, `limit>100` falha,
    `before`/`after` como objeto passa, `dashboardKpis` com todos os campos numéricos/string passa,
    `auditLogEntities` tem 21 entidades. `pnpm lint` na raiz do pacote reporta apenas ruído CRLF
    pré-existente em `stock-movement.ts` (arquivo não tocado, commitado com CRLF; normalizado pelo
    `--write` do pre-commit / Linux no CI)
  - **Ajustes vs. spec (Zod 4):** `z.record(z.unknown())` → `z.record(z.string(), z.unknown())` — o Zod 4
    exige tipo de chave explícito (mesmo padrão de `bid.ts`); a spec usava a forma de arg único do Zod 3,
    que quebra o `type-check`. Colunas alinhadas e arrays inline da spec colapsados pelo formatter do Biome
    (sem alinhamento de `:`, um item por linha nos arrays const)

- [x] **7.2 — Audit Logs Module (API)** — spec `37-audit-logs-api-spec.md`
  - Commit convencional esperado: `feat(api): add audit-logs module with query and filters`
  - `apps/api/src/modules/audit-logs/`: `audit-logs.module.ts` (exporta `AuditLogsService`),
    `audit-logs.controller.ts` (`@Controller('companies/:cnpj/audit-logs')`, **read-only** —
    `GET /entities` e `GET /actions` registrados ANTES de `GET /:id` (NestJS avalia rotas na ordem),
    `GET /` com filtros `entity`/`entityId`/`action`/`userId`/`startDate`/`endDate`/`page`/`limit` e
    `GET /:id`; Swagger tags, sem endpoints de escrita — audit log é append-only),
    `audit-logs.service.ts` (findAll com filtros dinâmicos + `leftJoin` em `users` p/ `userName`/
    `userEmail`, ordenação fixa `createdAt DESC`, paginação default 50/máx. 100; findOne com 404;
    `getDistinctEntities`/`getDistinctActions` via `selectDistinct` p/ dropdowns de filtro do frontend;
    CASL `cannot('read','AuditLog')` antes de **toda** query e todas escopadas a `companyId`),
    `audit-logs.service.spec.ts` (11 testes) e `audit-logs.controller.spec.ts` (4 testes) —
    **267 testes da API passando no total** (15 novos; o "≥ 275" da checklist da spec assumia
    baseline maior que os 252 reais pré-unidade)
  - `ability.factory.ts` — **COMPRADOR perdeu `can('read','AuditLog')`** (pré-existente da
    configuração inicial): a spec restringe a leitura de audit logs a ADMIN_EMPRESA e SUPER_ADMIN
    (papéis operacionais não veem o log) e a checklist exige 403 para COMPRADOR. ADMIN_EMPRESA já
    tinha a regra e `'AuditLog'` já estava no union `Subjects` (string-only, sem `ForcedSubject` —
    não há checagem CASL por instância; o isolamento é via `companyId` nas queries)
  - `app.module.ts` — `AuditLogsModule` importado (após `PaymentsModule`)
  - **Verificado:** `vitest run` (267/267, 31 arquivos), `pnpm type-check` (3 workspaces) verdes;
    `biome check` dos arquivos da unidade sem erros (só warnings `noNonNullAssertion` de
    `companyId!` e `suppressions/unused` nos specs — mesmos warnings warn-only dos módulos
    existentes, padrão do projeto). Checklist de segurança coberto: CASL antes de cada query,
    queries escopadas a `companyId`, 403 p/ papéis sem regra `AuditLog`, sem endpoints de escrita,
    `before`/`after` nunca contêm senhas (Better-Auth gerencia hash — invariante 4)
  - **Ajustes vs. spec:** ver Decisões Arquiteturais (7.2) — remoção do `read AuditLog` do
    COMPRADOR; parse de paginação no padrão do projeto (`Number.parseInt` + `Number.isNaN`,
    semanticamente igual ao snippet); imports no padrão real (`type SQL` inline,
    `DRIZZLE` de `../../db.module`, `DrizzleDB` de `../../db`); specs com mock thenable-fila
    (`makeDb` + `enqueue`, padrão de 2.2+) com `selectDistinct` adicionado ao `qb`

---

## Em Progresso

- **Fase 7 — Audit Log e Administração** em andamento: 7.1 (Shared Schemas — schemas Zod de contrato
  de API para o domínio de audit log e os DTOs de KPIs do dashboard em `packages/shared`) e 7.2
  (Audit Logs Module API — consulta read-only de audit logs com filtros avançados, detalhe e
  endpoints de entidades/ações distintas p/ dropdowns; restrita a ADMIN_EMPRESA/SUPER_ADMIN)
  concluídas. Próxima unidade: **7.3 — Audit Log UI**.

- **Fase 6 — Financeiro (NF + Pagamentos)** concluída: 6.1 (Shared Schemas — schemas Zod de contrato
  de API para notas fiscais e pagamentos em `packages/shared`), 6.2 (Invoices Module API — CRUD,
  validação/rejeição com fluxo `PENDING→VALIDATED|REJECTED`, sub-recurso de itens e upload de arquivo),
  6.3 (Payments Module API — pagamentos vinculados a NF `VALIDATED` com parcelas, fluxo
  `PENDING→PAID|CANCELLED`, pagamento de parcela com auto-conclusão e conciliação por NF), 6.4 (Invoices
  UI — listagem com tabs de status e busca, form de criação vinculado a PO, detalhe com itens e comparação
  de valores NF × PO, ações de validação/rejeição e card de NFs no detalhe do PO) e 6.5 (Payments UI —
  listagem com tabs de status/filtro de método/busca, criação vinculada a NF validada com parcelas,
  detalhe com painel de parcelas e barra de progresso, pagamento de parcela com auto-conclusão,
  cancelamento e integração de pagamento no detalhe da NF) concluídas.

- **Fase 5 — Recebimento e Estoque** concluída: 5.1 (Shared Schemas), 5.2 (Warehouses Module API),
  5.3 (Receipts Module API — recebimento de mercadoria + movimentações de estoque com upsert em
  `inventory` e conclusão automática do PO), 5.4 (Non-Conformities Module API — abertura, fluxo de
  status `OPEN→ANALYZING→RESOLVED|REJECTED` e comentários), 5.5 (Warehouses UI — listagem, form
  create/edit, desativação e visualização de inventário com alerta de estoque mínimo), 5.6 (Receipts
  UI — formulário de recebimento em rota dedicada a partir do detalhe do PO, listagem e detalhe de
  recebimentos) e 5.7 (Non-Conformities UI — listagem com filtros, detalhe com transições de status
  e comentários, card de NCs no detalhe do PO) concluídas.

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
| 1    | Auth e Empresas                 | Concluída     |
| 2    | Fornecedores e Produtos         | Concluída     |
| 3    | Cotações e Lances               | Concluída     |
| 4    | Pedidos de Compra               | Concluída     |
| 5    | Recebimento e Estoque           | Concluída     |
| 6    | Financeiro (NF + Pagamentos)    | Em andamento  |
| 7    | Audit Log e Administração       | Não iniciada  |

---

## Open Questions

- [x] **Fornecedores no portal** — **Resolvido na 3.1 (v1)**: os lances são registrados pelo
  **COMPRADOR no sistema, em nome do fornecedor**. O portal de autoatendimento do fornecedor está
  explicitamente **fora do escopo v1** (não há papel FORNECEDOR nem auth para fornecedores). Reflexo nos
  schemas: `createBidSchema` exige `supplierId` e `bidResponseSchema` traz `supplierName` para o comparativo.
- [~] **Múltiplos vencedores por cotação** — **v1 decidido na 3.1**: seleção de **um único lance vencedor**
  por cotação (`selectWinnerSchema` aceita um `bidId`). Seleção por item fica para a v2 e pode ser adicionada
  sem breaking change (campo opcional `itemWinners?: Record<uuid, uuid>`). A pergunta sobre PO com itens de
  fornecedores diferentes permanece em aberto para a Fase 4.
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
| COMPRADOR perdeu `can('read','AuditLog')` (7.2) | A regra existia desde a configuração inicial do `AbilityFactory`, mas a spec 7.2 decide que **apenas ADMIN_EMPRESA e SUPER_ADMIN** consultam audit logs (contêm dados sensíveis de negócio — valores, status, quem fez o quê; papéis operacionais não precisam dessa visibilidade) e a checklist exige 403 p/ COMPRADOR/ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR. Removida a linha do `case 'COMPRADOR'`; nenhum teste existente dependia dela |
| `AuditLog` sem `ForcedSubject` + rotas `entities`/`actions` antes de `:id` (7.2) | Não há checagem CASL por instância (`subject('AuditLog', row)` nunca é chamado) — a restrição é por tipo (`cannot('read','AuditLog')`) e o isolamento de tenant é via `eq(auditLogs.companyId, …)` em toda query. `'AuditLog'` permanece string-only no union `Subjects` (já existia desde 0.4). No controller, `GET /entities` e `GET /actions` são registrados ANTES de `GET /:id` — o NestJS avalia rotas na ordem de declaração; depois, "entities" casaria `:id` |
| `analyze`/`resolve`/`reject` usam a action `update` no CASL (5.4) | Não há diferenciação de permissão entre as três transições na v1; quem pode `update` realiza qualquer transição válida (a guarda de status no Service barra transições inválidas). Menos ações customizadas no union de `Actions` |
| ALMOXARIFE abre a NC, COMPRADOR/ADMIN resolvem (5.4) | Separação de responsabilidade: o almoxarife detecta o problema no recebimento; o comprador (ou admin) tem visão do impacto e decide o tratamento. ALMOXARIFE perdeu o `manage NonConformity` amplo pré-existente, mantendo `read`/`create`/`update` (edição em OPEN) escopados a `{ companyId }` |
| `resolvedAt` preenchido tanto em `resolve` quanto em `reject` (5.4) | Ambos são estados finais; o campo marca a data de encerramento da NC, não exclusivamente "resolvido positivamente" |
| Coluna `notes` adicionada a `non_conformities` na 5.4 (migration 0005) | Os DTOs/response de 5.1 já referenciavam `notes`, mas a coluna faltava no schema de 0.3; adicionada como `text` nullable (schema é fonte de verdade — invariante 14) com migration gerada via `drizzle-kit` |
| `purchaseOrdersService.receive()` chamado fora da transação do recebimento (5.3) | `receive()` abre a própria `db.transaction`; chamá-lo após o commit do recebimento evita transação aninhada e é seguro — `receive()` é idempotente (400 se PO já `RECEIVED`), então falha isolada não deixa dados inconsistentes |
| `StockMovementsService` no mesmo módulo de receipts (5.3) | Movimentações automáticas (recebimento) e manuais compartilham a lógica de upsert de `inventory`; manter no mesmo módulo evita dependência circular e duplicação |
| Upsert de `inventory` via `sql\`\`` cru com `ON CONFLICT (warehouse_id, product_id)` (5.3) | O builder do Drizzle não tem helper de `ON CONFLICT … DO UPDATE` para o caso; SQL cru com `gen_random_uuid()` e conflict target explícito é mais legível. Exigiu constraint `UNIQUE` em `inventory` (migration 0004 + schema) |
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
| `@AllowPlatformRoute()` no `GET /me/companies` (1.3) | O snippet do controller na spec **omite** o decorator, mas `GET /v1/me/companies` é rota de plataforma (sem `:cnpj`) e o `AuthGuard` é fail-closed desde 1.2 — sem o opt-in, qualquer não-SUPER_ADMIN levaria 403, contrariando a própria checklist da spec ("funciona sem `:cnpj`, role pode ser null"). O decorator `@AllowPlatformRoute()` (criado em 1.2 justamente "pensado para 1.3") foi adicionado, realizando o comentário da spec "guard resolve userId" |
| Subject `CompanyMember` tagueado no CASL (1.3) | A spec usa `can('read','CompanyMember',{ companyId })` (condição por objeto), mas `CompanyMember` era subject **string-only** no union → o `can` tipava as condições como `MongoQuery<never>` e o `{ companyId }` falhava o type-check (TS2769), mesmo sintoma de `Company` em 1.2. Adicionado `(CompanyMember & ForcedSubject<'CompanyMember'>)` ao union `Subjects` (a row tem `companyId: string`). O Service usa só checagens por tipo (`cannot('read','CompanyMember')`), sem passar instância |
| ADMIN_EMPRESA: ações escopadas em vez de `manage CompanyMember` (1.3) | A spec pede `read`+`create`+`update`+`delete` de `CompanyMember` escopados a `{ companyId }`. O 0.4/1.2 tinha `can('manage','CompanyMember')` irrestrito. Trocado pelas 4 ações escopadas; os demais papéis (COMPRADOR/ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR) ganham só `read` escopado (lista de membros p/ atribuição futura) |
| `DrizzleDB` de `../../db`, não `../../db/types` (1.3) | A spec importa `DrizzleDB` de `../../db/types`, arquivo que **não existe** (decisão de 1.2: não criar `db/types.ts` — `DrizzleDB` já é exportado por `db/index.ts`). Service importa de `../../db`, fiel ao `CompaniesService` e ao `AuthGuard` |
| Mock thenable-leaf + delegação no `members.service.spec` (1.3) | A spec monta `mockDb` com `then` direto no objeto de `useValue` (mesmo problema de 1.2: NestJS 11 adota thenables e substitui o provider). Reescrito: um `qb` (query builder) thenable e encadeável, **separado** do `mockDb` injetado, que apenas delega `select/insert/update/delete` ao `qb`. O `qb.then` consome de uma fila de linhas (`enqueue`), cobrindo as queries sequenciais do `invite`/`remove`. As asserções da spec (Conflict/Forbidden/BadRequest/NotFound) atingem só ramos de guarda que retornam antes das queries multi-etapa |
| `if (!member)`/`if (!updated)` após `returning()` (1.3) | Sob `noUncheckedIndexedAccess`, `const [member] = …returning()` é `T | undefined`. Adicionados guards `BadRequestException`/`NotFoundException` no `invite`/`updateRole` (mesma defesa do `CompaniesService.update` em 1.2) para nunca seguir com `undefined` |
| `@elos/shared` como dependency de `@elos/web` (1.4) | 1ª unidade em que o front importa do pacote shared (`MyCompany`/`Role`/`CompanyResponse`/`MemberResponse`). Sob layout estrito do pnpm o `tsc` não resolvia `@elos/shared` sem a declaração; adicionado `"@elos/shared": "workspace:*"` + `pnpm install` (cria o symlink). `transpilePackages: ['@elos/shared']` no `next.config.ts` (da 0.5) já cobria o runtime |
| `(auth)/layout.tsx` modificado p/ full-bleed (1.4) | A spec lista o layout como "já existe" e não o modifica, mas as novas páginas split-screen usam `height: 100%`, que precisa de um ancestral com altura definida. O layout antigo centralizava com `min-h-screen flex items-center justify-center px-4` (espremeria o design). Trocado por wrapper `100vh`/`overflow:hidden` — ajuste necessário p/ fidelidade visual |
| `<Link href="/sign-in">` em vez de `<a href="#">` p/ "Esqueci a senha" (1.4) | O snippet da spec usava `<a href="#">`, que viola a regra `a11y/useValidAnchor` do Biome (erro) e ainda não há rota de recuperação de senha. Trocado por `<Link>` para `/sign-in` (placeholder) — mantém o visual e passa o lint |
| shadcn `dropdown-menu`/`avatar`/`separator`/`skeleton`/`sheet` não instalados (1.4) | A seção 1 da spec manda instalá-los via CLI, mas **nenhum** dos componentes implementados (o próprio código da spec) os importa: switcher e user-menu são dropdowns hand-rolled, o skeleton usa a classe CSS `.skeleton` do `globals.css`. Rodar o CLI shadcn arriscaria sobrescrever o `globals.css` recém-configurado (init/add reescreve CSS). Omitidos sem perda funcional |
| `type="button"` nos botões dos componentes de domínio (1.4) | Os `<button>` hand-rolled do topbar/switcher/user-menu não traziam `type` explícito; o default `submit` dispararia o `useButtonType` do Biome (erro) e poderia submeter forms. Adicionado `type="button"` em todos — fora do escopo literal do snippet, exigência do lint |
| `biome check --write .` normalizou CRLF→LF de arquivos pré-existentes (1.4) | Com `core.autocrlf=true` e sem `.gitattributes`, o checkout no Windows trazia configs/src antigos com CRLF; o `pnpm lint` (cache do turbo invalidado) passou a acusá-los. O `--write` os normalizou p/ LF, mas o git armazena LF — o `git diff` desses arquivos é vazio e o `git add` (autocrlf) não os inclui no commit. Artefato de checkout, não do feature; só os arquivos com mudança real entram no commit |
| `next/headers` importado dinamicamente em `lib/api.ts` (1.5) | A spec adiciona as mutações client-side ao **mesmo** módulo `lib/api.ts` que já importava `next/headers` no topo. Como os Client Components (`company-form`/`invite-member-sheet`/`members-table`) importam essas mutações, o `next build` falhava ("importing a component that needs next/headers ... not supported"). Solução: `next/headers` passou a ser importado dinamicamente dentro de um helper `sessionHeaders()` usado pelas funções server-side; o topo do módulo deixou de ter import server-only, e o client só carrega as mutações |
| `client()` importa `api` (não `apiClient`) de `lib/api-client` (1.5) | O snippet da spec faz `const { apiClient } = await import('@/lib/api-client')`, mas o export real (definido em 0.5) é `api`. Helper ajustado para `const { api } = ...; return api` |
| `.json<T>()` tipado nas mutações (1.5) | A spec escreve `.json()` puro; no ky 2.x `.json()` retorna `Promise<unknown>`, que não satisfaz as anotações de retorno (`Promise<CompanyResponse>` etc.) sob `strict`. Adicionado o parâmetro de tipo (`.json<CompanyResponse>()`/`.json<MemberResponse>()`) |
| `CompanyForm`: `useForm<CreateCompanyDto>` + cast do resolver (1.5) | A spec usa `useForm<CreateCompanyDto \| UpdateCompanyDto>`; com o union, `register('cnpj')` falha o type-check (cnpj só existe em `CreateCompanyDto`, e `keyof` de um union é a interseção das chaves). Trocado pelo superset `CreateCompanyDto` (tem todos os campos) com `resolver: zodResolver(schema) as Resolver<CreateCompanyDto>` (o schema muda por modo); no `edit`, o `cnpj` readonly não é registrado e `data as UpdateCompanyDto` é enviado (o `updateCompanySchema` ignora chaves extras) |
| `settings/page.tsx` mapeia null→undefined nos `defaultValues` (1.5) | A spec passa `defaultValues={company ?? undefined}`, mas `CompanyResponse` tem campos `nullable` (`string \| null`) e o form espera `Partial<CreateCompanyDto>` (opcionais `string \| undefined`); `null` não é atribuível. A página agora constrói um objeto convertendo cada campo com `?? undefined` |
| `htmlFor`/`id` em todos os campos de formulário (1.5) | Os snippets da spec usam `<label>` sem associação, o que dispara `a11y/noLabelWithoutControl` (erro do Biome) e contraria a própria checklist de acessibilidade ("todo campo com `<label>` associado"). Adicionados pares `htmlFor`/`id` em `company-form` (11 campos) e `invite-member-sheet` (nome/email/papel) |
| `type="button"` + `ROLE_BADGE.TRANSPORTADOR` (dot) (1.5) | Mesmo padrão de 1.4: `<button>` hand-rolled exigem `type="button"` (`useButtonType`); `ROLE_BADGE['TRANSPORTADOR']` trocado por acesso por ponto (`useLiteralKeys`). Ajustes de lint fora do snippet literal |
| shadcn `table`/`badge`/`select` não instalados (1.5) | A seção 1 da spec manda instalar 5 componentes, mas só `sheet` e `alert-dialog` são importados — tabelas, badges e o select são inline/nativos (a própria checklist diz "tabela sem shadcn Table"). Instalados via CLI apenas os 2 usados; `globals.css` verificado intacto após o `add` |
| `export type UnitOfMeasure` removido de `product.ts` (2.1) | A spec re-declara `export type UnitOfMeasure = (typeof unitOfMeasureValues)[number]` em `product.ts`, mas `enums.ts` (0.3) já exporta um `UnitOfMeasure` (const + type) com os mesmos 10 valores, e ambos passam pelo barrel `index.ts` → `error TS2308` (re-export ambíguo). Mantido `unitOfMeasureValues` (necessário p/ `z.enum`) e removida a re-declaração do tipo; o `UnitOfMeasure` canônico continua vindo de `enums.ts`. `z.enum(unitOfMeasureValues)` infere o mesmo union literal, sem perda de tipagem |
| `@Inject` explícito no `SuppliersService`/`SuppliersController` (2.2) | O snippet da spec omite `@Inject(AbilityFactory)`/`@Inject(SuppliersService)`, mas o projeto roda com tsx/esbuild, que **não emite metadata de tipo** para a DI do Nest (mesma nota já documentada no `CompaniesService`/`Controller` de 1.2). Sem o `@Inject` explícito, a resolução do provider falharia em runtime. Adicionado, fiel ao padrão existente |
| Subject `Supplier` tagueado no CASL em vez de reescrever as `case` (2.2) | A seção 1 da spec mostra adicionar regras `Supplier` por papel **e** o tipo tagueado ao union `Subjects`. As regras de papel (`read`/`create`/`update`/`approve`/`reject` de `Supplier`) **já existiam** no `AbilityFactory` desde a configuração inicial — reescrever as `case` seria redundante e regrediria as regras já mais completas. Aplicado **apenas** o que faltava: `(Supplier & ForcedSubject<'Supplier'>)` no union (mesmo padrão de `Company` 1.2 / `CompanyMember` 1.3), necessário para `subject('Supplier', existing)` no `update`/`approve`/`reject` tipar (sem ele, `error TS2345`) |
| `findAll(query)` com campos `\| undefined` explícitos (2.2) | O controller passa `{ status: string \| undefined, ... }` (de `@Query()` opcional) ao Service, mas a assinatura da spec usava `{ status?: string }`. Sob `exactOptionalPropertyTypes` (do `tsconfig.base`), `status?: string` **não** aceita `undefined` explícito (`error TS2379`). Tipo do parâmetro ajustado para `status?: string \| undefined` (etc.), preservando a chamada do controller verbatim |
| `enqueue` envolve o resultado em array no `suppliers.service.spec` (2.2) | O `enqueue(x)` da spec resolvia o thenable com o valor cru, mas o Service consome as queries como arrays (`const [row] = await …` e `.then((r) => r[0] ?? null)`). Com valor cru, `const [row] = undefined` lançava `TypeError` em vez de cair no `NotFoundException`. Corrigido para `resolve([result])`: `enqueue(undefined)` → linha ausente; `enqueue(obj)` → 1 linha — fazendo os 7 testes de guarda (Conflict/NotFound/BadRequest/Forbidden) passarem com as chamadas da spec intactas |
| Bracket-keys → dot + `biome-ignore noThenProperty` (2.2) | `useLiteralKeys` (error do recommended) sinalizou os acessos `updateData['name']`/`qb['select']`/`service['findAll']` dos snippets — convertidos para acesso por ponto (`--fix --unsafe` do biome, todos identificadores válidos). O thenable de teste (`qb.then = …`) recebe 1 `// biome-ignore lint/suspicious/noThenProperty` (mesmo padrão dos specs de 1.2/1.3). `noNonNullAssertion` de `companyId!` mantidos como warning (severidade `warn`, presente em todos os Services existentes) |
| `@Inject` explícito no `ProductsService`/`ProductsController` (2.3) | Mesmo motivo de 1.2/2.2: tsx/esbuild não emite metadata de tipo para a DI do Nest. O snippet da spec omite `@Inject(DRIZZLE)`/`@Inject(AbilityFactory)`/`@Inject(ProductsService)`; sem eles a resolução falharia em runtime. Adicionados, fiéis ao `SuppliersService`/`Controller` |
| Subject `Product` tagueado + `read` p/ papéis read-only, sem reescrever `case` (2.3) | A seção 1 da spec mostra adicionar regras `Product` granulares por papel **e** o tipo tagueado ao union. O `AbilityFactory` já tinha `can('manage','Product')` para ADMIN_EMPRESA/COMPRADOR (cobre create/read/update/delete) — reescrever as `case` para `create`/`read`/`update`/`delete` separados seria redundante. Aplicado só o que faltava: `(Product & ForcedSubject<'Product'>)` no union (p/ `subject('Product', existing)` tipar no `update`/`deactivate`, mesmo padrão de `Supplier` 2.2) e `can('read','Product')` para ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR (a spec pedia read-only a esses papéis, ausente até então) |
| `findAll` sem `import()` dinâmico + `inArray` no topo (2.3) | O snippet da spec reatribuía `query_` e fazia `(await import('drizzle-orm')).inArray(...)` com `biome-ignore` para o filtro `supplierId`. Reescrito: `inArray` importado no topo (junto de `and`/`desc`/`eq`/`ilike`) e a condição `supplierId` empurrada ao array `conditions` **antes** da query única — sem reatribuição nem import dinâmico, eliminando o `biome-ignore noExplicitAny`. Campos do `query` tipados com `\| undefined` (exactOptionalPropertyTypes, como em 2.2) |
| Ternário `isActiveFilter` simplificado (2.3) | A spec escrevia `query.isActive === 'false' ? false : true`, que dispara `noUselessTernary` (error do recommended). Trocado por `query.isActive !== 'false'` — mesmo resultado (default `true`, só `'false'` desativa) sem o literal booleano no ternário |
| `enqueue` envolve em array + `deactivate` escopa `companyId` no update (2.3) | `enqueue` segue o padrão de 2.2 (`resolve([result])`) — o Service consome queries como arrays (`const [row] = …` / `.then((r) => r[0])`); valor cru lançaria `TypeError` em vez do `NotFoundException`. No `deactivate`, o `update` da spec filtrava só por `eq(products.id, id)`; adicionado `eq(products.companyId, …)` (invariante 8: toda query escopada ao tenant) — defesa em profundidade, embora o `existing` já tenha sido validado por `companyId` |
| Constraints de unicidade no banco + catch `23505` (2.3, hardening pós-review) | As checagens select-then-insert de `code` (create/update) e do vínculo (linkSupplier) eram racy (duas requisições concorrentes passam pela checagem antes do insert). Adicionados: `uniqueIndex('products_company_id_code_unique')` em `(company_id, code)` (code nullable → NULLs distintos, produtos sem código não colidem) e `unique('product_suppliers_product_id_supplier_id_unique')` em `(product_id, supplier_id)`; migration `0001_huge_madrox.sql`. As pré-checagens viram otimistas (mensagem amigável no caso comum) e os writes ganham `try/catch` mapeando `isUniqueViolation` (PG `23505`) → `ConflictException` com as **mesmas mensagens** — corrida fecha em 409, sem vazar erro do driver nem duplicar |
| Pré-query de `supplierId` escopada ao tenant via join (2.3, hardening pós-review) | O `findAll(supplierId)` montava `linkedProductIds` de `productSuppliers` filtrando só por `supplierId` (cross-tenant). O resultado final já era correto (a query principal tem `eq(products.companyId, …)`), mas a pré-query passou a `innerJoin(products)` + `eq(products.companyId, …)` — defesa em profundidade, ids de outro tenant nunca entram no `inArray` |
| Role via membership, não `session.user.role` (2.4) | Os snippets da spec derivam `canMutate` de `session.user.role` (`auth.api.getSession`), mas no Elos o papel é **por empresa** — vive na membership, não no `user` global. O `AuthSession` de `lib/server-auth.ts` nem expõe `role`. As páginas (list/detail) seguem o padrão real já usado pelo `[cnpj]/layout.tsx`: `getMyCompaniesServer()` + `myCompanies.find((c) => c.cnpj === cnpj)?.role`. `canMutate = role ∈ {COMPRADOR, ADMIN_EMPRESA, SUPER_ADMIN}` |
| `Resolver` cast nos forms com `.default()` (2.4) | `useForm<CreateSupplierContactDto>`/`<CreateSupplierBankAccountDto>` falhavam o type-check: `isMain`/`isPrimary`/`accountType` têm `.default()` no Zod, fazendo o tipo de **input** (opcional) divergir do **output** (obrigatório) que o react-hook-form usa nas duas pontas (TS2322/TS2345). `resolver: zodResolver(schema) as Resolver<T>` (mesmo padrão de `company-form` 1.5) reconcilia. O `supplier-form` usa o superset `CreateSupplierDto` com o schema trocando por modo |
| Narrowing em vez de `!` nos sheets (2.4) | `add-contact-sheet`/`add-bank-account-sheet` usavam `isEdit ? update(…, contact!.id) : add(…)` — o `!` disparava `noNonNullAssertion` (warning, mas evitável). Trocado por `const saved = contact ? update(…, contact.id) : add(…)`: dentro do ramo truthy o TS estreita `contact`/`account` para não-nulo, eliminando o assert. `supplier-form` mantém `supplierId!` (idêntico ao `cnpj!` de `company-form`, warning aceito do projeto) |
| `console.error` nos `catch` dos componentes (2.4) | Os snippets da spec usam `} catch {` só com `toast.error`. Invariante 5 ("nenhum `catch {}` vazio — sempre logar ou relançar") + o padrão de `company-form`/`members-table` (1.5) pedem log. Todos os catch ganharam `catch (error) { console.error('[Componente.handler]', error); toast.error(...) }` |
| `select` do shadcn instalado mas não importado (2.4) | A seção 1 da spec manda `add tabs select`. `tabs` é usado na página de detalhe; `select` foi instalado (fidelidade ao escopo, e o `globals.css` foi verificado intacto após o `add`) mas **não importado** — o `supplier-form` e os sheets usam `<select>` nativo estilizado, mesmo padrão de `invite-member-sheet` (1.5). Sem perda funcional |
| Role via membership, não `session.user.role` (2.5) | Mesmo motivo de 2.4: os snippets da spec derivam `canMutate` de `auth.api.getSession().user.role`, mas no Elos o papel é **por empresa** (vive na membership, não no `user` global; `AuthSession` nem expõe `role`). As páginas (list/detail) usam o padrão real do `[cnpj]/layout.tsx`: `getMyCompaniesServer()` + `myCompanies.find((c) => c.cnpj === cnpj)?.role`, com `MUTATE_ROLES = {COMPRADOR, ADMIN_EMPRESA, SUPER_ADMIN}` |
| Lista busca ativos **e** inativos em paralelo p/ filtro client-side (2.5) | A API (`GET /products`) filtra por `isActive` com **default `true`** e não tem opção "todos" (`isActive !== 'false'`). A checklist da spec exige filtro padrão só-ativos **e** exibir inativos esmaecidos quando alternado. Para manter o padrão de filtro client-side puro do `SuppliersListClient` (estado de `initialProducts` + `useMemo`), a `page.tsx` faz `Promise.all` de `getProductsServer({isActive:'true'})` + `getProductsServer({isActive:'false'})` e concatena; o Client Component default mostra só ativos e alterna sem novo round-trip |
| Sem wrapper de `padding` extra nas páginas (2.5) | Os snippets da spec envolvem cada página em `padding: '28px 32px'`, mas o `(app)/[cnpj]/layout.tsx` (1.4) já aplica `padding: 24` + `maxWidth` ao `<main>`. Replicar o padding causaria espaçamento duplo, inconsistente com as páginas de suppliers (2.4), que também o omitem. Mantidos só os `maxWidth` por página (720 form, 960 detalhe), fiéis ao layout real |
| `Resolver` cast no `link-supplier-sheet` (2.5) | `useForm<LinkProductSupplierDto>` falhava o type-check: `isPreferred` tem `.default(false)` no `linkProductSupplierSchema`, divergindo o tipo de **input** (opcional) do **output** (obrigatório) que o react-hook-form usa nas duas pontas (TS2322/TS2345). `resolver: zodResolver(linkProductSupplierSchema) as Resolver<LinkProductSupplierDto>` (mesmo padrão de `company-form` 1.5 / forms de 2.4) reconcilia. O `product-form` usa `zodResolver(createProductSchema) as never` (o `createProductSchema` também tem `isActive.default(true)`) |
| Coluna "Fornecedores" mostra "—" na lista (2.5) | A tabela da spec inclui a coluna "Fornecedores", mas o endpoint de **lista** (`findAll`) retorna produtos sem o array `suppliers` (presente só no `GET :id` via `innerJoin`). A célula renderiza `product.suppliers?.length` quando presente, senão "—" — sem fetch extra por linha (contagem por produto fica para uma agregação futura no endpoint de lista, fora do escopo desta unidade) |
| `console.error` no `error.tsx` + nos catch dos componentes (2.5) | Invariante 5 ("nenhum `catch {}` vazio — sempre logar ou relançar") + precedente de 2.4. Os snippets da spec usam `} catch {` só com `toast.error`; todos os catch dos handlers client (`product-form.onSubmit`, `products-list-client.handleDeactivate`, `product-suppliers-panel.handleUnlink`/`handleTogglePreferred`, `link-supplier-sheet.onSubmit`) ganharam `catch (error) { console.error('[Componente.handler]', error); toast.error(...) }`. O `error.tsx` segue o boundary de suppliers (`useEffect` + `console.error('[ProductsError]', error)`) |
| `export type QuotationStatus`/`BidStatus` removidos dos schema files (3.1) | A spec re-declara `export type QuotationStatus`/`BidStatus = (typeof …Values)[number]` em `quotation.ts`/`bid.ts`, mas `enums.ts` (0.3) já exporta `QuotationStatus` e `BidStatus` (const + type), e ambos passam pelo barrel `index.ts` → `error TS2308` (re-export ambíguo) — mesmo padrão já resolvido para `UnitOfMeasure` em 2.1. Mantidos `quotationStatusValues`/`bidStatusValues` (necessários p/ `z.enum`) e removidas as re-declarações de tipo, com comentário apontando para `enums.ts`. Reconciliação de valores (pós-review 3.1): `bidStatusValues` passou a derivar do enum canônico via `Object.values(BidStatus) as [BidStatus, ...BidStatus[]]` (import de `../enums`, sem re-export → sem ambiguidade no barrel), eliminando o hard-code que divergia (`ACCEPTED`→`SELECTED`). Agora schema Zod, `enums.ts` e o `bidStatusEnum` do banco compartilham os mesmos 4 valores (DRAFT/SUBMITTED/SELECTED/REJECTED); o literal inline em `bidComparisonResponseSchema` também passou a usar `z.enum(bidStatusValues)` |
| DB schema reconciliado à spec/shared, não o inverso (3.2, decisão do owner) | A spec 3.2 e os schemas shared da 3.1 (fonte de verdade dos contratos) assumiam colunas/tabelas que a 0.3 não gerou. Em vez de reescrever o service/controller (e regredir a 3.1 já commitada), o **DB schema foi ajustado**: `quotations` ganhou `number`+`payment_terms` e `created_by_id`→`created_by`; `quotation_items` teve `product_id` nullable, `description` NOT NULL, `notes` e `unit`→`varchar(20)`; `quotation_invites`(`invite_status` P/A/D, `sent_at`) virou `quotation_suppliers`(`quotation_supplier_status` INVITED/RESPONDED/DECLINED, `invited_at`). `relations.ts` atualizado. Alinha o banco aos contratos de `@elos/shared` (invariante 9) |
| Migration 0002 + snapshot escritos à mão (3.2) | `drizzle-kit generate` exige TTY para os prompts de rename (enum `invite_status`→`quotation_supplier_status`, tabela `quotation_invites`→`quotation_suppliers`, coluna `created_by_id`→`created_by`) e o ambiente é não-interativo (winpty não aloca console). Escritos `0002_quotations_module_schema.sql` (renames preservando dados + add colunas + UNIQUE) e o `0002_snapshot.json` via script mutando o snapshot 0001 real, mais a entrada no `_journal.json`. Validado: `drizzle-kit check` ✅ e `drizzle-kit generate` → "No schema changes" (snapshot confere byte-a-byte com o schema TS). Aplicar (`db:migrate`) requer banco — diferido como nas unidades anteriores |
| Subject `Quotation` tagueado + `read` p/ papéis read-only (3.2) | Mesmo padrão de `Supplier`(2.2)/`Product`(2.3): `(Quotation & ForcedSubject<'Quotation'>)` adicionado ao union `Subjects` p/ `subject('Quotation', existing)` tipar no update/publish/close/cancel (sem ele, TS2345). ADMIN_EMPRESA/COMPRADOR já tinham `manage Quotation`; adicionado `can('read','Quotation')` a ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR (a spec dava read a esses papéis, ausente até então). `create`/`update` continuam negados a eles → POST/publish retornam 403 |
| `bids` importado de `db/schema/quotations`, não `db/schema/bids` (3.2) | O snippet do service importa `bids` de `'../../db/schema/bids'`, arquivo que **não existe** — `bids`/`bidItems` vivem em `quotations.ts` (definidos na 0.3, referenciados por `purchase-orders.ts`/`relations.ts`). Criar um `bids.ts` separado obrigaria a mexer nesses imports (fora do escopo 3.2). Service importa `bids` de `'../../db/schema/quotations'`, sem tocar a estrutura de arquivos |
| `cancel` rejeita lances `NOT IN ('SELECTED','REJECTED')` (3.2) | O snippet usa `NOT IN ('ACCEPTED','REJECTED')`, mas o enum canônico `BidStatus`/`bid_status` (enums.ts + DB) não tem `ACCEPTED` — o estado "vencedor" é `SELECTED`. Usar `'ACCEPTED'` no `sql` cru falharia o cast de enum em runtime. Trocado para `SELECTED` (estados finais = SELECTED/REJECTED), consistente com a 3.1 |
| `quantity` numeric→string + `set` explícito no item (3.2) | `quotation_items.quantity` é `numeric` (tipo de insert do Drizzle = `string`), mas `CreateQuotationItemDto.quantity` é `number`; `.values({ ...dto })` falharia o type-check. `addItem` monta os values explicitamente com `String(dto.quantity)` e `productId/notes ?? null`; `updateItem` monta o `set` campo-a-campo (padrão do `SuppliersService.updateContact`). No `create`/`update` da cotação o `deadline` (string) é destruturado p/ fora do spread antes de `new Date(...)`, evitando o conflito string×Date no `set`/`values` |
| `@Inject` explícito + `enqueue` como fila no spec (3.2) | `@Inject(DRIZZLE)`/`@Inject(AbilityFactory)`/`@Inject(QuotationsService)` adicionados (tsx/esbuild não emite metadata de DI — padrão de 1.2/2.2/2.3). O `enqueue` do `quotations.service.spec` da spec **sobrescrevia** `qb.then` a cada chamada (só o último valor valia), quebrando o teste de `inviteSupplier` que encadeia 3 selects (cotação→fornecedor→convite duplicado); reescrito como **fila sequencial** (`resultsQueue.shift()`), fazendo cada `await` consumir o próximo resultado na ordem. 95/95 testes passam |
| `bids`/`bid_items` importados de `db/schema/quotations` (3.3) | Mesmo motivo de 3.2: o snippet do service importa de `'../../db/schema/bids'`, arquivo que **não existe** — `bids`/`bidItems` vivem em `quotations.ts` (definidos na 0.3, referenciados por `purchase-orders.ts`/`relations.ts`). Service importa de `'../../db/schema/quotations'`, sem criar arquivo nem tocar a estrutura |
| Mapeamento `notes`↔`observations` + numeric→string (3.3) | A tabela `bids`/`bid_items` (0.3) usa as colunas `observations`/`payment_terms` e `numeric` p/ `unit_price`/`delivery_days`, mas o contrato `@elos/shared` (3.1, fonte de verdade) expõe `notes` e `deliveryDays: number`. Como mexer no schema está fora do escopo "In" da 3.3 (só module/controller/service/ability/app), o service **mapeia** em vez de migrar: `dto.notes`→coluna `observations` no insert/update (`updateData.observations = dto.notes`) e `notes: bids.observations` no select; `String(dto.unitPrice)`/`String(dto.deliveryDays)` no insert (insert do Drizzle p/ numeric = `string`) e `${bidItems.deliveryDays}::int` no select (response exige `number`). `totalPrice` calculado por subquery `SUM(unit_price * quantity)::text` |
| Vencedor = `SELECTED`, não `ACCEPTED` (3.3) | O snippet da spec usa `'ACCEPTED'` em toda a seleção de vencedor (set, dedup de vencedor existente, `isWinner` do compare), mas o enum canônico `BidStatus`/`bid_status` (enums.ts + DB) não tem `ACCEPTED` — o estado é `SELECTED` (mesma reconciliação já feita em 3.1/3.2). `selectWinner` grava `SELECTED`, o guard de vencedor existente filtra `eq(bids.status, 'SELECTED')` e `compare` marca `isWinner: bid.status === 'SELECTED'` |
| Regras `Bid` do COMPRADOR substituídas + subject tagueado (3.3) | A 0.4/3.1 tinha `can('read','Bid')` + `can('select','Bid')` (sem escopo) p/ COMPRADOR; a spec 3.3 pede `read`/`create`/`update`/`delete` escopados a `{ companyId }`. Como `selectWinner` passou a usar `ability.cannot('update','Bid')` (não `'select'`), as duas regras antigas foram **substituídas** pelas 4 CRUD escopadas; ADMIN_EMPRESA (que não tinha regra `Bid`) ganhou as mesmas 4; ALMOXARIFE/ANALISTA_FINANCEIRO/TRANSPORTADOR ganham `read` escopado. `(Bid & ForcedSubject<'Bid'>)` adicionado ao union `Subjects` p/ `subject('Bid', existing)` tipar no update/remove/submit (mesmo padrão de Quotation 3.2). A action `'select'` ficou órfã no union `Actions` mas é inócua (mantida p/ minimizar churn) |
| Audit log em delete/itens + `@Inject` + `enqueue` como fila (3.3) | `@Inject(DRIZZLE)`/`@Inject(AbilityFactory)`/`@Inject(BidsService)` adicionados (tsx/esbuild não emite metadata de DI — padrão desde 1.2). O snippet da spec **não** registrava audit log no `remove` nem nos itens de lance (só create/submit/select_winner) e fazia `delete` fora de transação; alinhado ao `QuotationsService` (invariante: toda mutação gera `audit_logs`), `remove`/`addBidItem`/`updateBidItem`/`removeBidItem` agora envolvem write+audit numa transação. O `enqueue` do `bids.service.spec` da spec **sobrescrevia** `qb.then` a cada chamada (quebrando os fluxos multi-select de create/submit/selectWinner/addBidItem); reescrito como **fila sequencial** (`resultsQueue.shift()`, padrão de 3.2). 115/115 testes passam |
| `receive` incluso no módulo da Fase 4 + `PurchaseOrdersModule` exporta o Service (4.2) | O status `RECEIVED` já existe no schema (0.3) e o `ReceiptsModule` (Fase 5) chamará `purchaseOrdersService.receive()` internamente após confirmar o recebimento completo. Implementar a transição SENT→RECEIVED agora (e exportar o Service) evita dependência circular futura entre receipts↔purchase-orders. Endpoint também exposto diretamente (`POST :id/receive`, ALMOXARIFE) |
| Action `'receive'` no CASL em vez de `'update'` (4.2) | A transição SENT→RECEIVED é responsabilidade do ALMOXARIFE, separada das demais (COMPRADOR). Modelada como action customizada `'receive'` (precedente da `'select'` de 3.3) adicionada ao union `Actions`; o Service checa `cannot('receive', subject('PurchaseOrder', existing))`. Impede que o ALMOXARIFE aprove/envie o PO (ele só tem `read`+`receive`) e que o COMPRADOR receba sem ser via `manage` |
| Regra `receive` da ALMOXARIFE sem escopo `{ companyId }` (4.2) | A spec sugeria `can('receive','PurchaseOrder',{ companyId })`, mas a regra `read` vizinha da ALMOXARIFE já é irrestrita (`can('read','PurchaseOrder')`). Mantida `can('receive','PurchaseOrder')` sem escopo p/ consistência com a `read` vizinha — o isolamento de tenant é garantido pelas queries do Service (`eq(purchaseOrders.companyId, user.companyId!)` em todo `select`/`update`). ADMIN_EMPRESA/COMPRADOR já tinham `manage PurchaseOrder` (cobre `receive`); COMPRADOR já tinha `approve` |
| Subject `PurchaseOrder` tagueado, sem reescrever as `case` (4.2) | Mesmo padrão de Supplier(2.2)/Product(2.3)/Quotation(3.2)/Bid(3.3): `(PurchaseOrder & ForcedSubject<'PurchaseOrder'>)` adicionado ao union `Subjects` p/ `subject('PurchaseOrder', existing)` tipar no update/approve/send/cancel/receive (sem ele, TS2345). As regras de papel `PurchaseOrder` (`manage` p/ ADMIN/COMPRADOR, `read` p/ os demais) **já existiam** — só faltava a action `receive` da ALMOXARIFE e o tipo tagueado |
| Numeração `PO-{ano}-{4 dígitos}` via query do último número (4.2) | Mesmo padrão do `COT-` das cotações (3.2): sequencial por empresa derivado do último `number` com `LIKE 'PO-{ano}-%'` ordenado desc, sem `SEQUENCE` PostgreSQL (lógica no Service, padrão do projeto). `totalAmount = SUM(quantity × unitPrice)` calculado in-memory dos itens copiados do lance, sem trigger. Race condition improvável em v1 (`number` é UNIQUE no banco — colisão falharia o insert; retry pode ser adicionado se necessário) |
| `bidItems`/`bids` importados de `db/schema/quotations` (4.2) | Mesmo motivo de 3.2/3.3: `bids`/`bidItems` vivem em `quotations.ts` (0.3), não há `db/schema/bids.ts`. O `create` copia `productId`/`quantity` de `quotation_items` (join por `bid_items.quotation_item_id`) e `unitPrice` de `bid_items`; valida `bid.status === 'SELECTED'`, 409 se `bidId` já tem PO (`bid_id` UNIQUE), 400 se algum item de cotação sem `product_id` |
| Concatenação de string colapsada em template único (4.2) | O snippet do `BadRequestException` de "itens sem produto" usava `` `…texto…` + `…texto…` ``, disparando `useTemplate` (concatenação) **e** `noUnusedTemplateLiteral` (template sem interpolação na 1ª metade) do Biome — dois erros contraditórios que o `--write` não resolve. Colapsado num único template literal com a interpolação `${itemsSemProduto.length}`. `noNonNullAssertion` de `user.companyId!` mantidos como warning (padrão do projeto, presente em todos os Services) |
| Numeração `PO-` na transação + retry no `23505`, sem `SELECT FOR UPDATE` (4.2, hardening pós-review) | A leitura do último `number` corria **fora** da transação do `create` → sob concorrência dois requests derivavam o mesmo `PO-{ano}-NNNN` e o 2º insert estourava `23505` cru (500). Movida a leitura+insert para a mesma transação dentro de um loop `MAX_ATTEMPTS=5` que faz `continue` no `23505` (helper `isUniqueViolation`, idêntico ao `QuotationsService`) e lança `ConflictException` se esgotar. A constraint `UNIQUE` em `purchase_orders.number` **já existia** (0.3) — não foi preciso adicionar. Descartado `SELECT FOR UPDATE`/tabela sequencer sugeridos no review: over-engineering e divergência do padrão de retry já estabelecido (3.2) |
| Guarda atômica de status no `WHERE` do `UPDATE` (4.2, hardening pós-review) | A validação de status corria só no `select` inicial (fora da transação) → janela TOCTOU entre o `select` e o `update`. Adicionado o status esperado ao `WHERE` do `UPDATE` transacional de update/approve/send/cancel/receive (`eq(purchaseOrders.status, …)`; `inArray(status, ['DRAFT','APPROVED'])` no cancel, que tem dois estados de origem). Zero linhas afetadas (mudança concorrente) agora lança `ConflictException` ("modificado por outra operação") em vez de seguir; a pré-checagem fora da transação foi mantida para a mensagem amigável (`BadRequestException`) no caso comum |
| Parse seguro de paginação no `findAll` (4.2, hardening pós-review) | `Number(query.page ?? 1)` produzia `NaN` para `?page=abc`/`?limit=` e o `NaN` chegava a `.limit()/.offset()`. Trocado por `Number.parseInt(…, 10)` + `Number.isFinite` com fallback explícito (`page=1`, `limit=20`) preservando o clamp `1..100` e `page ≥ 1` |
| `existingPO` escopado a `companyId` (4.2, hardening pós-review) | O lookup de PO já existente para o `bidId` filtrava só por `bidId`. Embora o `bid` já tenha sido validado por `companyId` (um lance pertence a uma empresa), a query passou a `and(eq(bidId), eq(companyId))` — invariante 8 (toda query escopada ao tenant), defesa em profundidade |
| Testes de forbidden-path verificam ausência de escrita (4.2, hardening pós-review) | `approve` já tinha teste de 403; adicionados os equivalentes para send/cancel/receive (reusando `poId`/`mockUser`, `almoxUser` no receive): enfileiram o PO existente, forçam `mockAbility.cannot → true`, esperam `ForbiddenException` **e** asseguram `expect(mockDb.transaction).not.toHaveBeenCalled()` — comprovando que a checagem CASL precede qualquer mutação. 146/146 testes da API passam |
| Tailwind utility classes em vez dos inline `hsl(var(--token))` da spec (4.3) | A spec 4.3 escreveu todos os componentes com inline styles usando `hsl(var(--muted))`, `hsl(var(--info) / 0.15)`, `var(--radius-md)` etc. Isso produz **cor inválida** neste projeto: os tokens são `--color-*` (não `--*`) e **já vêm embrulhados em `hsl(...)`** no `@theme inline` do `globals.css` (ex.: `--color-info: hsl(199 89% 42%)`), então `hsl(var(--info))` resolve para `hsl(undefined)`/`hsl(hsl(...))`. Reimplementado com Tailwind utility classes + tokens semânticos (`bg-muted`, `text-info bg-info-soft`, `text-warning bg-warning-soft`, etc.) — mesma decisão já tomada em 2.4/2.5/3.4. `var(--radius-*)`/`var(--font-mono)` existem como vars planas e funcionariam inline, mas usei as classes Tailwind por consistência |
| Geração do PO a partir da cotação (card "Lance Vencedor") (4.3) | Conforme a decisão de UX da spec: o botão "Gerar Pedido de Compra" vive no detalhe da cotação (`CLOSED` + lance `SELECTED`), não no módulo de POs (que não tem "Novo PO"). `GeneratePODialog` chama `POST /purchase-orders` e redireciona ao PO. `getBidsServer` foi adicionado ao `Promise.all` da página de cotação **sem condicional** — o snippet da spec referenciava `quotation?.status` dentro do próprio `Promise.all` (quebrado, pois `quotation` ainda não existe ali); buscar os lances sempre é barato e o card só renderiza em `CLOSED` com `SELECTED` |
| `receive` ausente no cliente web (4.3) | A transição SENT→RECEIVED não tem botão no web da Fase 4 — será acionada pelo `ReceiptsModule` (Fase 5) após criar o recebimento. Expor agora criaria fluxo incompleto. As 4 mutações expostas: create/approve/send/cancel |
| Mutações PO via helper `(await client())` (4.3) | A spec escreve cada mutação com `const { api } = await import('@/lib/api-client')` inline; o `lib/api.ts` já tem o helper `client()` que faz exatamente isso e é usado por todas as outras mutações (quotations/bids). Usado o helper por consistência |
| Stepper com `STATUS_ORDER` numérico, sem 'use client' nos componentes puros (4.3) | `PurchaseOrderStepper`/`PurchaseOrderStatusBadge` são puros (sem hooks) — omitido o `'use client'` que a spec colocava, espelhando `quotation-status-badge` (server-safe, usável tanto em Server quanto Client Components). `STATUS_ORDER` numérico (DRAFT=0…RECEIVED=3, CANCELLED=-1) compara estados sem switch aninhado e garante que nenhum step apareça concluído quando cancelado |

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
- **1.3 concluída**: `MembersModule` NestJS (controller + service + module), rotas
  `GET /v1/me/companies` e `GET/POST /v1/companies/:cnpj/members` + `PATCH/DELETE .../:userId`,
  regras `CompanyMember` no `AbilityFactory` (CASL antes de cada ação) e `MembersModule` no `app.module`.
  Convite v1: vincula usuário existente ou cria via `auth.api.signUpEmail` com senha temporária.
  Restrições de segurança: sem auto-remoção, sem remover o último ADMIN_EMPRESA, sem auto-alteração de papel,
  sem promover a SUPER_ADMIN. 46 testes da API passando, `type-check`/`lint` verdes. Ajustes vs. spec:
  `@AllowPlatformRoute()` no `/me/companies`, subject `CompanyMember` tagueado, `DrizzleDB` de `../../db`,
  mock thenable-leaf — ver Decisões Arquiteturais (1.3). Próximo: **1.4**
- **1.4 concluída**: App shell do frontend — `globals.css` com token set completo do design, `lib/api.ts`
  (fetch server-side tipado), componentes de domínio (`logo`/`topbar`/`sidebar`/`company-switcher`/`user-menu`),
  route group `(app)/[cnpj]/...` (layout shell + dashboard + loading + error), `(app)/page.tsx` redirect p/ 1ª
  empresa, `(app)/no-company`, e sign-in/sign-up redesenhados (split-screen + brand panel). `@elos/shared`
  adicionado como dependency do web. `type-check`/`lint` verdes; `build` compila + gera as 7 rotas (passo
  `standalone` falha por `EPERM` de symlink no Windows — mesma limitação da 0.5). Ajustes vs. spec:
  `(auth)/layout` full-bleed, `<Link>` no "esqueci a senha", `type="button"`, shadcn dropdown/avatar/etc.
  omitidos (nenhum import) — ver Decisões Arquiteturais (1.4). Próximo: **1.5**
- **1.5 concluída**: UI de gestão de empresas e membros (frontend) — shadcn `sheet`+`alert-dialog` (únicos
  importados; `globals.css` intacto), `lib/api.ts` estendido com mutações client-side via ky (`next/headers`
  agora dinâmico para o módulo poder ser importado por Client Components), `components/domain/`
  (`company-form`/`members-table`/`invite-member-sheet`), e rotas `[cnpj]/settings` (2 colunas logo+form),
  `[cnpj]/settings/members` (tabela + invite sheet), `admin/layout` (shell SUPER_ADMIN), `admin/companies`
  e `admin/companies/new`. `type-check` (3 workspaces) verde, `biome check` do web limpo, `build` compila +
  gera as **9 rotas** (passo `standalone` falha por `EPERM` de symlink no Windows — mesma limitação de 0.5/1.4).
  Ajustes vs. spec: `next/headers` dinâmico, `client()` importa `api`, `.json<T>()` tipado, `useForm<CreateCompanyDto>`
  + cast do resolver, null→undefined nos defaultValues, `htmlFor`/`id` nos campos — ver Decisões Arquiteturais (1.5).
  **Fase 1 — Auth e Empresas concluída.** Próximo: **Fase 2 — Fornecedores e Produtos**
- **2.1 concluída**: schemas Zod de fornecedor e produto em `packages/shared` (`schemas/supplier.ts`,
  `schemas/product.ts`), com `.superRefine` PJ/PF, sub-recursos (contatos, contas bancárias) e vínculo
  produto↔fornecedor; tipos via `z.infer`, barrel atualizado. `build`/`type-check` verdes. Ajuste vs.
  spec: `UnitOfMeasure` duplicado removido — ver Decisões Arquiteturais (2.1). Próximo: **2.2**
- **2.2 concluída**: `SuppliersModule` NestJS (controller + service + module), rotas sob
  `/v1/companies/:cnpj/suppliers` — CRUD, `approve`/`reject` (regra PENDING), sub-recursos `contacts` e
  `bank-accounts` (CRUD), endereço via upsert na mesma transação, dedup CNPJ/CPF, CASL antes de cada
  mutação e audit log em todas. Subject `Supplier` tagueado no `AbilityFactory`, `SuppliersModule` no
  `app.module` (exporta o Service p/ 2.3). 61 testes da API passando, `type-check` (3 workspaces) e
  `biome check` verdes. Ajustes vs. spec: `@Inject` explícito, subject tagueado, `findAll` com
  `| undefined`, `enqueue` em array, bracket-keys→dot — ver Decisões Arquiteturais (2.2).
  Próximo: **2.3 — Products Module (API)**
- **2.3 concluída**: `ProductsModule` NestJS (controller + service + module), rotas sob
  `/v1/companies/:cnpj/products` — CRUD (DELETE = soft delete `isActive=false`) + sub-recurso de
  vínculos `:id/suppliers` (POST/PATCH/DELETE), findAll com filtros `search`/`isActive`/`supplierId`/
  `unit`/paginação, findOne com fornecedores via `innerJoin`, dedup de `code`, regra fornecedor APPROVED
  no link + dedup do vínculo, CASL antes de cada mutação e audit log em create/update/deactivate.
  Subject `Product` tagueado no `AbilityFactory` + `read Product` p/ papéis read-only, `ProductsModule`
  no `app.module`. 77 testes da API passando, `type-check` (3 workspaces) e `biome check` verdes.
  Ajustes vs. spec: `@Inject` explícito, subject tagueado + read p/ read-only (sem reescrever `case`),
  `findAll` sem `import()` dinâmico (`inArray` no topo), ternário `isActive` simplificado, `enqueue` em
  array, deactivate escopa `companyId` — ver Decisões Arquiteturais (2.3). Próximo: **2.4 — Suppliers
  Management UI (Frontend)**
- **2.4 concluída**: UI de gestão de fornecedores (frontend) — shadcn `tabs`+`select` via CLI (`select`
  não importado; form usa `<select>` nativo), `lib/api.ts` estendido com 4 funções server-side + 12
  client-side de suppliers/contacts/bank-accounts, `components/domain/` (`supplier-status-badge`,
  `supplier-form`, `suppliers-list-client` com filtro de status por tabs + busca + kebab Aprovar/Rejeitar
  só em PENDING, `approve`/`reject-supplier-dialog`, `supplier-contacts-panel`/`supplier-bank-accounts-panel`,
  `add-contact-sheet`/`add-bank-account-sheet`), e rotas `[cnpj]/suppliers` (`page`/`loading`/`error`/`new`/
  `[id]`/`[id]/edit`). Sidebar de 1.4 já tinha o item "Fornecedores". `type-check` (3 workspaces) verde,
  `biome check` dos arquivos novos limpo (1 warning `noNonNullAssertion` esperado), `build` compila + gera
  as 4 rotas de suppliers (passo `standalone` falha por `EPERM` de symlink no Windows — mesma limitação de
  0.5/1.4/1.5). Ajustes vs. spec: role via membership (não `session.user.role`), `Resolver` cast nos forms
  com `.default()`, narrowing em vez de `!` nos sheets, `console.error` nos catch — ver Decisões
  Arquiteturais (2.4). Próximo: **2.5 — Products Management UI (Frontend)**
- **2.5 concluída**: UI de gestão de produtos (frontend) — `lib/api.ts` estendido com 2 funções server-side
  (`getProductsServer`/`getProductServer`) + 6 client-side (`createProduct`/`updateProduct`/`deactivateProduct`,
  `linkSupplierToProduct`/`updateProductSupplierLink`/`unlinkSupplierFromProduct`), `components/domain/`
  (`product-form` com select de unidade + `minStock` decimal, `products-list-client` com tabs Ativos/Inativos +
  filtro de unidade + busca + kebab Desativar só em ativos + linha esmaecida/badge "Inativo" + `AlertDialog`,
  `product-suppliers-panel` com toggle de preferido via Star + desvínculo, `link-supplier-sheet` com select de
  fornecedor APPROVED + preview), e rotas `[cnpj]/products` (`page`/`loading`/`error`/`new`/`[id]`/`[id]/edit`).
  Sidebar de 1.4 já tinha o item "Produtos". `type-check` (3 workspaces) verde, `biome lint` dos arquivos novos
  limpo (só warnings `noNonNullAssertion` esperados), `build` compila + gera as rotas de products (✓ 9/9; passo
  `standalone` falha por `EPERM` de symlink no Windows — mesma limitação de 0.5/1.4/1.5/2.4). Ajustes vs. spec:
  role via membership, lista busca ativos+inativos em paralelo p/ filtro client-side, `Resolver` cast no
  `link-supplier-sheet`, sem padding extra (layout já aplica), `console.error` nos catch — ver Decisões
  Arquiteturais (2.5). **Fase 2 — Fornecedores e Produtos concluída.** Próximo: **Fase 3**
- **3.1 concluída**: schemas Zod de cotação e lance em `packages/shared` (`schemas/quotation.ts`,
  `schemas/bid.ts`) — cotação + itens + convite de fornecedor; lance + itens + comparativo
  (`z.record` por `bidId`) + seleção de vencedor único (v1). Decisão de domínio: **comprador registra
  lances em nome do fornecedor** (portal de fornecedor fora do escopo v1). Tipos via `z.infer`, barrel
  atualizado. `build`/`type-check` verdes; `biome check` dos 3 arquivos limpo; 5 `safeParse` da spec
  confirmados. Ajuste vs. spec: `QuotationStatus`/`BidStatus` duplicados removidos (já em `enums.ts`) —
  ver Decisões Arquiteturais (3.1). Open questions "Fornecedores no portal" (resolvida) e "Múltiplos
  vencedores por cotação" (v1 = lance único) atualizadas. Próximo: **3.2 — Quotations Module (API)**
