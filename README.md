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
