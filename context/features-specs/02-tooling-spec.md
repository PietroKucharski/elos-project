# Feature Spec — 0.2 Tooling

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 0 — Fundação  
**Unidade:** 0.2  
**Pré-requisito:** 0.1 (scaffold do monorepo concluído — `apps/api`, `apps/web`,
`packages/shared` existem com `package.json` e `tsconfig.json`)  
**Commit convencional esperado:** `chore(tooling): add biome, husky, lint-staged, env examples and docker`

---

## Objetivo

Configurar o tooling de qualidade de código e containerização do monorepo antes
de qualquer linha de aplicação ser escrita. Ao final desta unidade:

- Todo commit passará por lint automático e todo push validará os tipos TypeScript.
- O projeto roda via `docker compose up` com postgres local, sem instalar nada além do Docker.
- As imagens de produção são enxutas (~150 MB) e não carregam devDependencies.

---

## Escopo

### In

- `biome.json` na raiz do monorepo (linter + formatter)
- Integração do Biome no pipeline Turborepo (`turbo.json`)
- Husky instalado e configurado com dois hooks:
  - `pre-commit` → `lint-staged` (roda `biome check --write` nos arquivos staged)
  - `pre-push` → `pnpm type-check` via Turborepo
- `.env.example` em `apps/api/`
- `.env.example` em `apps/web/`
- `apps/api/Dockerfile` (multi-stage, imagem de produção)
- `apps/web/Dockerfile` (multi-stage, Next.js standalone, `NEXT_PUBLIC_*` via ARG)
- `docker-compose.yml` na raiz — **dev**: volume mounts + `pnpm dev` (hot reload)
- `docker-compose.prod.yml` — **produção**: imagens buildadas, sem postgres local
- `.dockerignore` na raiz

### Out (não implementar nesta unidade)

- GitHub Actions CI (→ 0.6)
- Configuração de Vitest (→ 0.3 em diante, junto com cada módulo)
- Playwright (→ fases posteriores)
- Qualquer lógica de aplicação

---

## Arquivos a Criar / Modificar

```
biome.json                        ← criar na raiz
.dockerignore                     ← criar na raiz
.husky/
  pre-commit                      ← criar
  pre-push                        ← criar
apps/api/.env.example             ← criar
apps/api/Dockerfile               ← criar
apps/web/.env.example             ← criar
apps/web/Dockerfile               ← criar
apps/web/next.config.ts           ← modificar: adicionar output: 'standalone'
docker-compose.yml                ← criar na raiz  (dev)
docker-compose.prod.yml           ← criar na raiz  (produção)
package.json (raiz)               ← adicionar script "prepare" + devDeps
turbo.json                        ← garantir task "lint" no pipeline
```

---

## Implementação Detalhada

### 1. Instalar dependências (raiz do monorepo)

```bash
pnpm add -D -w @biomejs/biome husky lint-staged
```

> O flag `-w` instala na raiz do workspace (não em um app específico).

---

### 2. `biome.json` (raiz)

Biome substitui ESLint + Prettier. A configuração abaixo é a base para um
monorepo TypeScript com React e Node:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noEmptyBlockStatements": "error"
      },
      "style": {
        "noNonNullAssertion": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "asNeeded"
    }
  },
  "files": {
    "ignore": [
      "node_modules",
      ".next",
      "dist",
      "build",
      "coverage",
      "apps/api/src/db/migrations/**"
    ]
  }
}
```

> **Por que `noNonNullAssertion: "warn"` e não `"error"`?**  
> O `AuthGuard` usa `!` após verificação de sessão (padrão documentado em
> `code-standards.md`). Warn mantém visibilidade sem bloquear o build.

---

### 3. Integrar Biome no Turborepo (`turbo.json`)

Adicionar (ou garantir que existe) a task `lint` no pipeline:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "lint": {
      "outputs": []
    }
  }
}
```

Script `lint` no `package.json` de cada workspace:

**`package.json` raiz** — aciona o Turborepo e registra o `prepare` do Husky:

```json
{
  "scripts": {
    "lint": "turbo run lint",
    "prepare": "husky"
  }
}
```

**`apps/api/package.json`**, **`apps/web/package.json`** e **`packages/shared/package.json`**:

```json
{
  "scripts": {
    "lint": "biome check ."
  }
}
```

---

### 4. Configurar lint-staged (`package.json` raiz)

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json}": ["biome check --write --no-errors-on-unmatched"]
  }
}
```

> `--no-errors-on-unmatched` evita falso positivo quando apenas arquivos não-JS
> são staged (ex: `.md`, `.yml`).

---

### 5. Husky — hooks

Após `pnpm install` (que executa `prepare` → `husky`), criar os hooks:

**`.husky/pre-commit`**

```sh
#!/usr/bin/env sh
pnpm lint-staged
```

**`.husky/pre-push`**

```sh
#!/usr/bin/env sh
pnpm type-check
```

> O script `type-check` na raiz já está definido em 0.1: `turbo run type-check`.
> O hook não faz `pnpm install` — apenas executa o que o Turborepo já tem cacheado.

Tornar os hooks executáveis:

```bash
chmod +x .husky/pre-commit .husky/pre-push
```

---

### 6. `apps/api/.env.example`

```dotenv
# =============================================================================
# Elos API — variáveis de ambiente
# Copie este arquivo para .env e preencha os valores reais.
# NUNCA commite o arquivo .env — apenas .env.example vai ao repositório.
# =============================================================================

# -----------------------------------------------------------------------------
# Banco de dados (Supabase PostgreSQL)
# DATABASE_URL: conexão via pooler (PgBouncer) para o app em runtime.
# DIRECT_URL: conexão direta (sem pooler) para migrations via Drizzle Kit.
# -----------------------------------------------------------------------------
DATABASE_URL="postgresql://user:password@pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://user:password@db.supabase.com:5432/postgres"

# -----------------------------------------------------------------------------
# Better-Auth
# BETTER_AUTH_SECRET deve ter no mínimo 32 caracteres.
# Gere um valor seguro com: openssl rand -base64 32
# -----------------------------------------------------------------------------
BETTER_AUTH_SECRET="your-secret-here-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# -----------------------------------------------------------------------------
# CORS — URL base do frontend (sem trailing slash)
# -----------------------------------------------------------------------------
FRONTEND_URL="http://localhost:3000"

# -----------------------------------------------------------------------------
# Servidor
# -----------------------------------------------------------------------------
PORT=3333
NODE_ENV=development

# -----------------------------------------------------------------------------
# Supabase (para Storage — upload de NFs e documentos)
# SUPABASE_SERVICE_ROLE_KEY nunca vai ao frontend.
# -----------------------------------------------------------------------------
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

---

### 7. `apps/web/.env.example`

```dotenv
# =============================================================================
# Elos Web — variáveis de ambiente
# Copie este arquivo para .env.local e preencha os valores reais.
# NUNCA commite .env.local — apenas .env.example vai ao repositório.
# =============================================================================

# -----------------------------------------------------------------------------
# API backend
# -----------------------------------------------------------------------------
NEXT_PUBLIC_API_URL="http://localhost:3333"

# -----------------------------------------------------------------------------
# Better-Auth (client)
# Deve apontar para a mesma URL configurada em BETTER_AUTH_URL no backend.
# -----------------------------------------------------------------------------
BETTER_AUTH_URL="http://localhost:3000"

# -----------------------------------------------------------------------------
# Supabase (apenas chave anon — para uploads diretos pelo browser se necessário)
# NUNCA coloque SUPABASE_SERVICE_ROLE_KEY aqui.
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

---

### 8. `apps/api/Dockerfile` (imagem de produção)

Build multi-stage. O stage `deps-prod` instala **apenas** dependências de
produção (`--prod`) para manter a imagem final enxuta.

```dockerfile
# ─── Estágio 1: dependências de produção ──────────────────────────────────
FROM node:22-alpine AS deps-prod
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod

# ─── Estágio 2: build (com devDeps para compilar TypeScript) ──────────────
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter api build

# ─── Estágio 3: runner ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copia apenas node_modules de produção (sem devDeps)
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
EXPOSE 3333
CMD ["node", "dist/main.js"]
```

---

### 9. `apps/web/Dockerfile` (imagem de produção)

`NEXT_PUBLIC_*` são **baked in no build** pelo Next.js — elas precisam estar
disponíveis no stage `builder` como `ARG`, não apenas como variável de ambiente
em runtime. Sem o `ARG`, o Next.js usa o valor de build-time vazio e a variável
não aparece no bundle.

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

# ARGs para NEXT_PUBLIC_* — devem ser passados em docker build ou no compose
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN pnpm --filter web build

# ─── Estágio 3: runner ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next.js standalone output — inclui apenas o necessário para rodar
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

> **Requer** `output: 'standalone'` em `apps/web/next.config.ts`:
>
> ```typescript
> const nextConfig = {
>   output: "standalone",
> };
> export default nextConfig;
> ```

---

### 10. `docker-compose.yml` (dev com hot reload)

Em desenvolvimento, **não** usamos as imagens buildadas de produção. Usamos
volume mounts do código-fonte e rodamos `pnpm dev` dentro do container, que
ativa o hot reload do NestJS (via `--watch`) e do Next.js.

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
    image: node:22-alpine
    working_dir: /app
    command: sh -c "corepack enable && pnpm install && pnpm --filter api dev"
    env_file: apps/api/.env
    environment:
      # Sobrescreve DATABASE_URL para apontar para o postgres local
      DATABASE_URL: "postgresql://elos:elos@postgres:5432/elos"
    ports:
      - "3333:3333"
    volumes:
      - .:/app
      - /app/node_modules # evita que o volume sobrescreva node_modules do host
    depends_on:
      postgres:
        condition: service_healthy

  web:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "corepack enable && pnpm install && pnpm --filter web dev"
    env_file: apps/web/.env.local
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - api

volumes:
  postgres_data:
```

> **`/app/node_modules` como volume anônimo** é o padrão para evitar que o
> bind mount do projeto sobrescreva os `node_modules` instalados dentro do
> container (que podem diferir do host, especialmente em Linux vs macOS).

---

### 11. `docker-compose.prod.yml` (override de produção)

Em produção, usamos as imagens buildadas. O postgres local é removido — o
`DATABASE_URL` real é injetado pelo ambiente do servidor (Render, Fly.io, etc.).

```yaml
services:
  postgres:
    profiles: ["disabled"] # desativa o postgres local

  api:
    image: "" # remove referência ao node:22-alpine do dev
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      DATABASE_URL: "" # sobrescrito pelo ambiente real do servidor
    volumes: [] # remove volume mounts
    command: "" # usa o CMD do Dockerfile (node dist/main.js)
    restart: always

  web:
    image: ""
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
        NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
    volumes: []
    command: ""
    restart: always
```

Uso local para simular produção:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

---

### 12. `.dockerignore` (raiz)

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
**/.git
**/.DS_Store
```

---

## Checklist de Conclusão

Antes de marcar 0.2 como concluído, verificar:

- [ ] `pnpm biome check .` roda sem erros na raiz
- [ ] `pnpm lint` (via Turborepo) passa em `apps/api`, `apps/web` e `packages/shared`
- [ ] Commit com arquivo TypeScript staged aciona `biome check --write` automaticamente
- [ ] `git push` aciona `pnpm type-check` automaticamente
- [ ] `apps/api/.env.example` contém as 8 variáveis listadas
- [ ] `apps/web/.env.example` contém as 4 variáveis listadas
- [ ] `.env` e `.env.local` estão no `.gitignore` e no `.dockerignore`
- [ ] `docker compose up` sobe `api`, `web` e `postgres` com hot reload funcional
- [ ] Editar um arquivo em `apps/api/src/` reflete sem reiniciar o container
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml build`
      conclui sem erros para ambos os apps
- [ ] `next.config.ts` tem `output: 'standalone'`

---

## Invariantes Verificadas

| Invariante (`CLAUDE.md` / `architecture.md`)  | Como esta unidade cumpre                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL` e credenciais nunca commitadas | `.env.example` com placeholders; `.env` no `.gitignore` e `.dockerignore`                    |
| `BETTER_AUTH_SECRET` sempre via `process.env` | `.env.example` documenta o placeholder + comentário de comprimento mínimo                    |
| `SUPABASE_SERVICE_ROLE_KEY` nunca no frontend | Ausente de `apps/web/.env.example`; presente apenas na API com comentário                    |
| `SUPABASE_ANON_KEY` pode ir ao frontend       | Presente em `apps/web/.env.example` como `NEXT_PUBLIC_SUPABASE_ANON_KEY`                     |
| Biome: linter + formatter na raiz             | `biome.json` na raiz; integrado ao Turborepo                                                 |
| Credenciais nunca na imagem Docker            | `.dockerignore` exclui `.env`; secrets injetados em runtime via `env_file` / env do servidor |

---

## Notas de Implementação

**Por que `docker-compose.yml` usa `node:22-alpine` + volume mount em vez de Dockerfile?**  
O Dockerfile é uma imagem de produção: compila TypeScript e copia apenas o `dist/`.
Hot reload em dev requer acesso ao código-fonte em tempo real. Usar a imagem base
`node:22-alpine` com bind mount e `pnpm dev` é o padrão correto — mantém os
dois modos (dev e prod) limpos e sem sobrecarga de rebuild a cada mudança.

**Por que `NEXT_PUBLIC_*` são ARGs no Dockerfile e não variáveis de ambiente no compose?**  
O Next.js bake essas variáveis no bundle JavaScript durante o `next build`. No
stage `runner` (imagem já compilada), elas não têm mais efeito. Passá-las como
`ARG` garante que o builder as receba no momento certo. Em produção, os valores
reais chegam via `args` no `docker-compose.prod.yml`.

**Por que `deps-prod` separado no Dockerfile da API?**  
O TypeScript (`tsc`) e outras devDeps são necessários só no stage `builder`.
O `runner` copia os `node_modules` do stage `deps-prod` (que rodou
`--prod`) — resultado: imagem final sem `ts-node`, `@types/*`, `vitest`, etc.
Economiza ~100–200 MB.

**`DIRECT_URL` vs `DATABASE_URL` no `.env.example` da API:**  
`DATABASE_URL` aponta para o pooler do Supabase (PgBouncer, porta 6543) —
adequado para o app em runtime com muitas conexões concorrentes. `DIRECT_URL`
aponta para a conexão direta (porta 5432) — necessária para o Drizzle Kit
aplicar migrations (que precisam de uma conexão persistente, não pooled).
O `drizzle.config.ts` (unidade 0.3) usará `DIRECT_URL` para migrations.

**Por que `docker-compose.prod.yml` desabilita `postgres` via `profiles: ["disabled"]`?**  
Em produção o banco é o Supabase. O uso de `profiles` é mais explícito do que
remover o serviço — deixa claro no diff que o postgres foi desativado
intencionalmente, não esquecido.
