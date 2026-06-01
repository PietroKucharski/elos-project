# Feature Spec — 0.6 GitHub Actions (CI)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 0 — Fundação  
**Unidade:** 0.6  
**Pré-requisito:** 0.1–0.5 (monorepo com Turborepo, Biome, Vitest e builds funcionando localmente)  
**Commit convencional esperado:** `ci: add github actions workflow with turborepo cache`

---

## Objetivo

Adicionar um pipeline de CI que roda automaticamente em todo Pull Request para
`main`. O pipeline impede que código quebrado chegue à branch principal: lint,
type-check e testes devem passar antes de qualquer merge, e o build completo deve
compilar sem erros. O cache do Turborepo reduz o tempo de execução evitando
reprocessar artefatos que não mudaram.

---

## Escopo

### In

- `.github/workflows/ci.yml` — workflow completo
- `.github/workflows/ci.env` — documentação das variáveis de ambiente necessárias (não um arquivo real de env)
- Cache do pnpm store via `actions/setup-node`
- Cache do Turborepo via `actions/cache` (`.turbo/`)
- Cancelamento de runs duplicadas via `concurrency`

### Out (não implementar nesta unidade)

- Workflow de deploy (CD) — não está no escopo v1
- Playwright E2E no CI — dependências externas (API + banco) tornam isso complexo; fica para roadmap
- Docker build no CI — opcional; adicionar quando o deploy for configurado
- Turborepo Remote Cache (Vercel) — opcional; substituir o cache local se o time crescer

---

## Arquivos a Criar

```
.github/
  workflows/
    ci.yml        ← criar
```

---

## Implementação Detalhada

### 1. `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]   # verifica pós-merge também

# Cancela runs anteriores do mesmo PR/branch para não desperdiçar minutos
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  # Node.js e pnpm
  NODE_VERSION: "22"
  PNPM_VERSION: "9"

  # Turborepo — identifica o time para o cache remoto (opcional, mas recomendado)
  # Se não usar Vercel Remote Cache, estas vars podem ser omitidas
  TURBO_TELEMETRY_DISABLED: "1"

  # Variáveis de build para o Next.js — valores dummy para CI
  # O build é apenas para verificação de compilação, não para deploy
  NEXT_PUBLIC_API_URL: "http://localhost:3333"
  NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "placeholder-anon-key"

jobs:
  # ─── Job 1: Qualidade de código ─────────────────────────────────────────
  quality:
    name: Lint · Type-check · Test
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2   # necessário para o Turborepo detectar mudanças

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm   # cache do pnpm store via actions/setup-node

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ runner.os }}-

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: Lint (Biome)
        run: pnpm turbo run lint

      - name: Type-check
        run: pnpm turbo run type-check

      - name: Testes (Vitest)
        run: pnpm turbo run test -- --reporter=verbose
        env:
          # Garante que testes não tentam conectar ao banco real
          DATABASE_URL: "postgresql://test:test@localhost:5432/test"
          BETTER_AUTH_SECRET: "ci-test-secret-at-least-32-characters-long"
          BETTER_AUTH_URL: "http://localhost:3000"
          FRONTEND_URL: "http://localhost:3000"

  # ─── Job 2: Build verification ──────────────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: quality   # só roda se o job de qualidade passar

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Cache Turborepo
        uses: actions/cache@v4
        with:
          path: .turbo
          key: turbo-${{ runner.os }}-${{ github.sha }}
          restore-keys: |
            turbo-${{ runner.os }}-

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm turbo run build
        env:
          # Vars de build para o Next.js (baked in no bundle)
          NEXT_PUBLIC_API_URL: ${{ env.NEXT_PUBLIC_API_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ env.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ env.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          # Vars da API para compilação TypeScript
          DATABASE_URL: "postgresql://test:test@localhost:5432/test"
          BETTER_AUTH_SECRET: "ci-build-secret-at-least-32-characters-long"
          BETTER_AUTH_URL: "http://localhost:3000"
          FRONTEND_URL: "http://localhost:3000"
          NODE_ENV: "production"
```

---

### 2. Por que dois jobs separados

**`quality`** (lint + type-check + test) e **`build`** são separados por dois motivos:

- **Feedback mais rápido:** se o lint ou os testes quebrarem, o desenvolvedor vê
  o erro sem esperar o build do Next.js (que é a etapa mais lenta).
- **Dependência explícita:** `build` depende de `quality` via `needs: quality` —
  nunca gastamos minutos de CI buildando código que já falhou nos checks básicos.

---

### 3. Estratégia de cache

#### Cache do pnpm store

`actions/setup-node` com `cache: pnpm` gerencia automaticamente o cache do store
do pnpm usando o hash do `pnpm-lock.yaml` como chave. Evita baixar os mesmos
pacotes em cada run.

#### Cache do Turborepo (`.turbo/`)

O Turborepo armazena os outputs cacheados localmente em `.turbo/`. No CI, usamos
`actions/cache` para persistir esse diretório entre runs:

```
key:          turbo-{os}-{sha}         ← único por commit
restore-keys: turbo-{os}-              ← restaura do commit mais recente
```

Quando uma PR tem múltiplos pushes, o cache do commit anterior é restaurado
(via `restore-keys`) e o Turborepo reutiliza os artefatos das tasks que não
mudaram. Apenas as tasks afetadas pelas mudanças são re-executadas.

#### Turborepo Remote Cache (opcional, futuro)

Para times maiores ou repositórios com muitos pacotes, o Turborepo Remote Cache
(Vercel) compartilha o cache entre desenvolvedores e CI. Para habilitar:

```yaml
env:
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM:  ${{ secrets.TURBO_TEAM }}
```

Não é necessário nesta fase — o cache local do GitHub Actions é suficiente.

---

### 4. Variáveis de ambiente no CI

#### Por que usar valores placeholder no build

O `next build` bake variáveis `NEXT_PUBLIC_*` no bundle. Em CI, o build é apenas
verificação de compilação — não é um artefato de deploy. Valores placeholder são
suficientes e evitam a necessidade de configurar secrets reais para um step que
não gera um artifact usado em produção.

#### Variáveis que precisam de valor real em deploy

Quando um workflow de CD (deploy) for criado no futuro, estas variáveis precisarão
de valores reais configurados como GitHub Secrets:

| Secret                        | Usado em          |
| ----------------------------- | ----------------- |
| `DATABASE_URL`                | API runtime       |
| `DIRECT_URL`                  | Drizzle migrations |
| `BETTER_AUTH_SECRET`          | API + Web         |
| `BETTER_AUTH_URL`             | API + Web         |
| `FRONTEND_URL`                | API (CORS)        |
| `SUPABASE_URL`                | API (Storage)     |
| `SUPABASE_SERVICE_ROLE_KEY`   | API (Storage)     |
| `NEXT_PUBLIC_API_URL`         | Web build         |
| `NEXT_PUBLIC_SUPABASE_URL`    | Web build         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web build       |

> **Invariante:** `SUPABASE_SERVICE_ROLE_KEY` nunca vai para o workflow do `web`.
> Mesmo em CD, essa variável é configurada apenas no job/ambiente da API.

---

### 5. Configuração do repositório GitHub

Para que o pipeline seja efetivo como gate de qualidade, configurar as
**branch protection rules** em `Settings → Branches → main`:

- **Require a pull request before merging** → ativado
- **Require status checks to pass before merging** → ativado
  - Status checks obrigatórios:
    - `Lint · Type-check · Test`
    - `Build`
- **Require branches to be up to date before merging** → ativado
- **Do not allow bypassing the above settings** → ativado (inclusive para admins)

---

## Checklist de Conclusão

- [ ] Push de uma PR para `main` dispara o workflow automaticamente
- [ ] Job `quality` roda `lint`, `type-check` e `test` em sequência via Turborepo
- [ ] Job `build` só inicia após `quality` passar
- [ ] Código com erro de TypeScript → CI falha no step `type-check`
- [ ] Código com violação Biome → CI falha no step `lint`
- [ ] Teste quebrado → CI falha no step `test`
- [ ] `pnpm turbo run build` passa sem erros no runner ubuntu-latest
- [ ] Cache do pnpm é restaurado em runs subsequentes (verificar nos logs do step `Setup Node.js`)
- [ ] Cache do Turborepo é restaurado em runs subsequentes (verificar nos logs do step `Cache Turborepo`)
- [ ] Branch protection rules configuradas em `main`
- [ ] PR sem CI verde não pode ser mergeada

---

## Invariantes Verificadas

| Invariante                                          | Como esta unidade cumpre |
| --------------------------------------------------- | ------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY` nunca no frontend       | Não aparece em nenhuma env var do step de build do web |
| `DATABASE_URL` nunca commitada                      | Usada apenas como env var inline no workflow, nunca em arquivo |
| Todo Controller/Service tem teste Vitest            | `turbo run test` falha se algum teste quebrar — gate obrigatório |
| Código com `any` ou catch vazio não passa           | Biome `noExplicitAny: "error"` e `noEmptyBlockStatements: "error"` |

---

## Notas de Implementação

**Por que `fetch-depth: 2` no checkout?**
O Turborepo usa `git diff` para identificar quais packages mudaram desde o último
commit e calcular quais tasks precisam rodar. Com `fetch-depth: 1` (default), o
histórico de um único commit não é suficiente para esse diff. `fetch-depth: 2`
garante que o commit anterior esteja disponível.

**Por que `--frozen-lockfile` no `pnpm install`?**
Garante que o CI instala exatamente as versões do `pnpm-lock.yaml` — sem
atualizar dependências silenciosamente. Se o lockfile estiver desatualizado em
relação ao `package.json`, o comando falha com erro explícito, forçando o
desenvolvedor a commitar o lockfile atualizado.

**Por que `timeout-minutes` nos jobs?**
Evita que um loop infinito ou um hang em teste consuma minutos ilimitados. 15
minutos para quality e 20 para build são generosos para o monorepo atual —
ajustar para baixo conforme o histórico de execuções ficar disponível.
