# Elos — Progress Tracker

Atualize este arquivo após cada mudança de implementação relevante.

---

## Fase Atual

**Fase 3 — Cotações e Lances** · `Em andamento` (3.1 concluída) → próxima unidade: **3.2 — Quotations Module (API)**

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

---

## Em Progresso

- Nada ativo. **3.1 concluída**. Próximo: **3.2 — Quotations Module (API)**.

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
| 3    | Cotações e Lances               | Em andamento  |
| 4    | Pedidos de Compra               | Não iniciada  |
| 5    | Recebimento e Estoque           | Não iniciada  |
| 6    | Financeiro (NF + Pagamentos)    | Não iniciada  |
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
