# Spec 0.1 — Scaffold do Monorepo (Turborepo + pnpm)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 0 — Fundação  
**Status:** `Pendente`  
**Pré-requisitos:** Nenhum — este é o primeiro passo do projeto.  
**Próximo:** `specs/0.2-tooling.md`

---

## Objetivo

Criar a estrutura base do repositório: monorepo Turborepo com pnpm workspaces,
os três workspaces (`apps/api`, `apps/web`, `packages/shared`), configuração
mínima de TypeScript por pacote e arquivos de infraestrutura de repositório
(`.gitignore`, `.nvmrc`, `README.md`).

Ao final desta unidade, `pnpm install` deve rodar sem erros e `turbo run build`
deve completar com sucesso (build vazio, mas sem falhas de configuração).

---

## Escopo

### Inclui

- Inicialização do repositório git com `.gitignore` correto
- `package.json` raiz + `pnpm-workspace.yaml`
- `turbo.json` com pipeline completo
- Estrutura de pastas dos três workspaces
- `package.json` + `tsconfig.json` mínimos por workspace
- `.nvmrc` apontando para Node.js LTS
- `README.md` com instruções de setup local

### Não inclui (próximas specs)

- Configuração do Biome, Husky ou lint-staged → `spec 0.2`
- Código de aplicação (NestJS, Next.js, schemas Zod) → specs 0.3–0.5
- `.env.example` com variáveis de ambiente → `spec 0.2`
- GitHub Actions CI → `spec 0.6`

---

## Estrutura de Arquivos a Criar

```
elos/
  .git/                          ← git init
  .gitignore
  .nvmrc
  README.md
  package.json                   ← raiz (private: true)
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json             ← tsconfig base compartilhada
  apps/
    api/
      package.json               ← name: "@elos/api"
      tsconfig.json              ← extends ../../tsconfig.base.json
    web/
      package.json               ← name: "@elos/web"
      tsconfig.json              ← extends ../../tsconfig.base.json
  packages/
    shared/
      package.json               ← name: "@elos/shared"
      tsconfig.json              ← extends ../../tsconfig.base.json
      src/
        index.ts                 ← barrel vazio (export {})
```

---

## Implementação Detalhada

### 1. Inicialização do git

```bash
git init
git branch -M main
```

O `.gitignore` deve cobrir:

```gitignore
# Dependências
node_modules/
.pnpm-store/

# Build outputs
dist/
.next/
build/
out/
*.tsbuildinfo

# Variáveis de ambiente (NUNCA commitar)
.env
.env.local
.env.*.local
# .env.example é PERMITIDO e deve ser commitado

# Turborepo cache
.turbo/

# Editor
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Coverage
coverage/
```

> **Invariante:** `.env` nunca commitado. `.env.example` é a única forma
> de documentar variáveis de ambiente no repositório.

---

### 2. `.nvmrc`

```
lts/*
```

Isso garante que `nvm use` e `fnm use` resolvam automaticamente para o LTS
mais recente do Node.js sem prender a uma versão específica que ficará
desatualizada.

---

### 3. `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

### 4. `package.json` raiz

```json
{
  "name": "elos",
  "version": "0.0.0",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "scripts": {
    "dev":        "turbo run dev",
    "build":      "turbo run build",
    "lint":       "turbo run lint",
    "test":       "turbo run test",
    "type-check": "turbo run type-check"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.5.0"
  }
}
```

> **Nota:** `turbo` e `typescript` ficam na raiz porque são ferramentas de
> orquestração do monorepo, não dependências de nenhum app específico.

---

### 5. `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    }
  }
}
```

> **Nota:** A chave no Turborepo v2+ é `tasks` (não `pipeline`). Verificar
> a versão instalada — se for v1.x, usar `pipeline`. Se for v2+, usar `tasks`.
> Usar a chave errada resulta em erro silencioso onde nenhuma task é executada.

---

### 6. `tsconfig.base.json` (raiz)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

> **Invariante:** `"strict": true` é obrigatório em todos os pacotes.
> `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes` adicionam
> segurança extra sem custo de runtime.

---

### 7. `apps/api/package.json`

```json
{
  "name": "@elos/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build":      "tsc --noEmit",
    "dev":        "echo 'NestJS dev server (a configurar em spec 0.4)'",
    "lint":       "echo 'Biome lint (a configurar em spec 0.2)'",
    "test":       "echo 'Vitest (a configurar em spec 0.4)'",
    "type-check": "tsc --noEmit"
  }
}
```

---

### 8. `apps/api/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

> **Por que `CommonJS` no API?** NestJS usa `CommonJS` por padrão. O módulo
> base usa `NodeNext` (ESM), mas o tsconfig do `api` sobrescreve para
> `CommonJS` por compatibilidade com o ecossistema NestJS.
> `experimentalDecorators` e `emitDecoratorMetadata` são obrigatórios para
> os decorators do NestJS funcionarem.

---

### 9. `apps/web/package.json`

```json
{
  "name": "@elos/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build":      "echo 'Next.js build (a configurar em spec 0.5)'",
    "dev":        "echo 'Next.js dev server (a configurar em spec 0.5)'",
    "lint":       "echo 'Biome lint (a configurar em spec 0.2)'",
    "test":       "echo 'Vitest (a configurar em spec 0.5)'",
    "type-check": "tsc --noEmit"
  }
}
```

---

### 10. `apps/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

> **Nota:** O `tsconfig.json` do Next.js usa `moduleResolution: Bundler` e
> `jsx: preserve` — o compilador do Next.js (SWC) lida com a transpilação.
> Este tsconfig é usado apenas pelo `tsc --noEmit` para type-checking.

---

### 11. `packages/shared/package.json`

```json
{
  "name": "@elos/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build":      "tsc --noEmit",
    "lint":       "echo 'Biome lint (a configurar em spec 0.2)'",
    "test":       "echo 'Vitest (a configurar em spec 0.3)'",
    "type-check": "tsc --noEmit"
  }
}
```

> **Nota:** `main` e `exports` apontam para `src/index.ts` diretamente —
> no monorepo com Turborepo, os outros pacotes consomem o TypeScript source
> diretamente (sem compilação separada). Isso simplifica o setup e evita
> a necessidade de um step de `build` no `shared` para desenvolvimento local.

---

### 12. `packages/shared/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 13. `packages/shared/src/index.ts`

```typescript
// @elos/shared — ponto de entrada
// Schemas Zod e tipos TypeScript compartilhados entre apps/api e apps/web
// Exportações serão adicionadas nas specs 0.3+ conforme os domínios são implementados

export {}
```

---

### 14. `README.md`

````markdown
# Elos

SaaS B2B de gestão de cadeia de suprimentos para o mercado brasileiro.
Conecta empresas, fornecedores, pedidos e pagamentos em uma única plataforma
rastreável.

## Pré-requisitos

- [Node.js](https://nodejs.org/) LTS — use `nvm use` ou `fnm use` na raiz do
  projeto para selecionar a versão correta via `.nvmrc`
- [pnpm](https://pnpm.io/) ≥ 9 — instale via `npm install -g pnpm`
- [Turborepo](https://turbo.build/) — instalado como devDependency na raiz

## Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/seu-org/elos.git
cd elos

# 2. Use a versão correta do Node.js
nvm use   # ou: fnm use

# 3. Instale as dependências
pnpm install

# 4. Configure as variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edite os arquivos .env com suas credenciais locais

# 5. Inicie o ambiente de desenvolvimento
pnpm dev
```

## Estrutura do Monorepo

```
elos/
  apps/
    api/      → Backend NestJS (porta 3333)
    web/      → Frontend Next.js 15 (porta 3000)
  packages/
    shared/   → Schemas Zod e tipos TypeScript (@elos/shared)
```

## Scripts Disponíveis

| Comando            | Descrição                                      |
| ------------------ | ---------------------------------------------- |
| `pnpm dev`         | Inicia todos os apps em modo desenvolvimento   |
| `pnpm build`       | Build de produção de todos os apps             |
| `pnpm lint`        | Lint de todo o monorepo via Biome              |
| `pnpm test`        | Executa todos os testes via Vitest             |
| `pnpm type-check`  | Type-check TypeScript em todo o monorepo       |

## Contexto do Projeto

Toda a documentação de arquitetura e decisões de design está em `context/`:

- `context/project-overview.md` — Produto, usuários e escopo da v1
- `context/architecture.md` — Stack, estrutura e invariantes
- `context/ui-context.md` — Design tokens e padrões de UI
- `context/code-standards.md` — Regras de código e convenções
- `context/progress-tracker.md` — Status de implementação e próximos passos
````

---

## Checklist de Conclusão

Antes de marcar esta spec como concluída, verificar:

- [ ] `git init` feito e branch nomeada `main`
- [ ] `.gitignore` inclui `.env` e exclui `.env.example`
- [ ] `pnpm install` roda sem erros na raiz
- [ ] `turbo run build` completa sem erros (scripts de placeholder retornam `exit 0`)
- [ ] `turbo run type-check` completa sem erros de TypeScript
- [ ] `packages/shared` está acessível com o nome `@elos/shared` nos outros workspaces
- [ ] `.nvmrc` está na raiz do projeto
- [ ] `README.md` está na raiz e as instruções são executáveis
- [ ] Nenhum arquivo `.env` com credenciais reais foi commitado

---

## Verificação de Invariantes

| Invariante                         | Como verificar nesta spec                          |
| ---------------------------------- | -------------------------------------------------- |
| `.env` nunca commitado             | `.gitignore` inclui `.env` — verificar com `git status` |
| `strict: true` em todos os pacotes | `tsconfig.base.json` define; cada workspace herda |
| Sem `any` no código                | `strict: true` bloqueia na maioria dos casos       |

---

## Decisões e Justificativas

**Por que `tsconfig.base.json` na raiz em vez de copiar em cada pacote?**  
Garante que `strict: true`, `target` e outras opções críticas sejam herdadas
consistentemente. Cada app sobrescreve apenas o que é específico da sua
plataforma (ex: NestJS precisa de `CommonJS`; Next.js precisa de `Bundler`).

**Por que `packages/shared` expõe TypeScript source diretamente?**  
Em um monorepo Turborepo com workspaces locais, não é necessário compilar
`packages/shared` separadamente para desenvolvimento. Os apps importam via
`@elos/shared` e o compilador de cada app resolve os tipos diretamente dos
arquivos `.ts`. Isso elimina um step de build e reduz complexidade na Fase 0.

**Por que `"ui": "tui"` no `turbo.json`?**  
O Turborepo v2+ tem uma UI interativa no terminal (`tui`) que melhora a
legibilidade do output paralelo. É opcional mas recomendado para dev local.
No CI, o Turborepo detecta ambiente sem TTY e desativa automaticamente.

---

## Referências

- `context/architecture.md` — Estrutura do monorepo e invariantes
- `context/code-standards.md` — Regras TypeScript e tooling
- [Turborepo Docs — Getting Started](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
