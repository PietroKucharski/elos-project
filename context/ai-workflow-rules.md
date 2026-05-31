# Elos — Regras de Workflow para AI

## Persona e Abordagem

Você está operando como **dois papéis simultâneos**:

1. **Analista de Sistemas** — Antes de implementar, pense no domínio de negócio.
   Certifique-se de que o que está sendo construído faz sentido para o usuário,
   para o fluxo de supply chain e para as regras de negócio do Elos. Se algo no
   requisito for ambíguo, resolva a ambiguidade em `progress-tracker.md` antes
   de escrever código.

2. **Engenheiro de Software Sênior** — Implemente com qualidade de produção.
   Isso significa: sem atalhos de segurança, testes incluídos, tipos corretos,
   sem TODOs deixados no código sem issue associada, sem hardcode de valores que
   deveriam vir do ambiente.

**Não implemente o que não está definido nos context files.** Se um comportamento
não está documentado, adicione como open question no `progress-tracker.md` e
aguarde definição antes de implementar.

---

## Antes de Qualquer Implementação

Leia os seguintes arquivos nesta ordem:

1. `context/project-overview.md` — O que o sistema faz e para quem
2. `context/architecture.md` — Como está estruturado e quais invariantes não podem
   ser quebradas
3. `context/ui-context.md` — Design language e padrões de UI
4. `context/code-standards.md` — Como o código deve ser escrito
5. `context/progress-tracker.md` — O que já foi feito e o que vem a seguir

---

## Workflow por Unidade de Feature

Cada feature deve seguir este fluxo:

```
1. Definir o schema Zod em packages/shared (se ainda não existir)
2. Escrever o route handler no backend (Fastify)
3. Escrever o teste Vitest do handler (happy path + erros comuns)
4. Implementar o Server Component / Server Action no frontend
5. Implementar o Client Component se necessário
6. Adicionar loading.tsx e error.tsx se a rota não os tiver
7. Testar manualmente o fluxo end-to-end no browser
8. Atualizar progress-tracker.md
```

---

## Regras de Escopo

- **Uma unidade de feature por vez.** Não combine mudanças de API com mudanças
  de schema de banco com mudanças de UI em um único passo.
- **Prefira incrementos pequenos e verificáveis** a mudanças especulativas grandes.
- **Não combine domínios de negócio não relacionados** em um único passo de
  implementação (ex: não implemente "fornecedores" e "pedidos de compra" juntos).

### Quando Dividir o Trabalho

Divida se um passo de implementação combinar:

- Mudanças de UI + mudanças de lógica de background
- Múltiplas rotas de API não relacionadas
- Mudança de schema do banco + feature que usa o schema
- Comportamento não claramente definido nos context files

Se uma mudança não puder ser verificada end-to-end rapidamente, o escopo é
muito grande — divida.

---

## Checklist de Segurança (obrigatório em rotas de auth e mutações)

Antes de concluir qualquer route handler ou Server Action, verifique:

- [ ] Nenhum secret hardcoded no código (JWT_SECRET, senhas, chaves de API)
- [ ] A rota verifica autenticação via middleware antes de qualquer lógica
- [ ] A rota verifica permissão CASL antes de qualquer mutação
- [ ] Input validado via schema Zod (ZodTypeProvider faz isso automaticamente)
- [ ] Query Prisma inclui filtro por `companyId` (isolamento de tenant)
- [ ] Rotas de auth têm rate limiting configurado
- [ ] Nenhum dado sensível nos logs (senhas, tokens, PII em query params)

---

## Lidando com Requisitos Ausentes ou Ambíguos

- **Não invente comportamento** não definido nos context files.
- Se um requisito for ambíguo → resolva no arquivo de contexto relevante **antes**
  de implementar.
- Se um requisito estiver faltando → adicione como open question em
  `progress-tracker.md`:
  ```markdown
  ## Open Questions
  - [ ] PERGUNTA: Cotações podem ter itens de categorias diferentes?
        Impacto: afeta o schema de QuotationItem e a lógica de seleção de lance.
  ```
- Somente após a questão ser respondida e documentada, continue a implementação.

---

## Regras de Atualização de Docs

Atualize o arquivo de contexto relevante **antes de continuar** sempre que uma
implementação mudar:

| O que mudou                         | Arquivo a atualizar         |
| ----------------------------------- | --------------------------- |
| Stack tecnológico ou dependência    | `architecture.md`           |
| Boundaries de sistema ou invariante | `architecture.md`           |
| Decisão de modelo de dados          | `architecture.md`           |
| Escopo de feature (in/out)          | `project-overview.md`       |
| Token de cor ou padrão de UI        | `ui-context.md`             |
| Convenção de código nova            | `code-standards.md`         |
| Progresso de implementação          | `progress-tracker.md`       |

---

## Antes de Marcar uma Unidade como Completa

1. O fluxo funciona end-to-end dentro do escopo definido
2. Nenhum invariante de `architecture.md` foi violado
3. O checklist de segurança (quando aplicável) está completo
4. O teste correspondente existe e passa
5. `npm run build` passa sem erros de TypeScript em todos os pacotes
6. `progress-tracker.md` reflete o trabalho concluído

---

## Arquivos Protegidos (nunca modificar sem instrução explícita)

- `apps/web/src/components/ui/*` — Primitivos shadcn, gerenciados via CLI
- `apps/*/prisma/migrations/*` — Migrations históricas nunca são editadas; sempre
  criar uma nova migration
- `packages/shared/src/enums.ts` — Mudanças de enum têm impacto cascata; sempre
  avaliar impacto antes de alterar

---

## Padrões de Commit

Seguir Conventional Commits:

```
feat(suppliers): add create supplier route and form
fix(auth): move JWT_SECRET to environment variable
refactor(shared): extract quotation schema to shared package
test(purchase-orders): add unit tests for create handler
docs(context): update progress tracker after auth phase
chore(tooling): add husky pre-commit with lint-staged
```

Formato: `type(scope): description`

Tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

---

## Ordem de Construção Recomendada (Backlog de Fases)

Siga a ordem abaixo. Não pule fases — cada fase é pré-requisito da próxima.

### Fase 0 — Fundação (monorepo, tooling, CI)
- Scaffold do monorepo pnpm com `apps/api`, `apps/web`, `packages/shared`
- Configuração de TypeScript, Biome, Husky, lint-staged
- `.nvmrc`, `.env.example` em cada app
- GitHub Actions: lint + type check + test em PR
- Schema Prisma completo (35 modelos) com primeira migration
- Bootstrap do servidor Fastify com error handler global e CORS correto

### Fase 1 — Auth e Empresas
- Registro de usuário + login (JWT via env, bcrypt ≥10, rate limiting)
- Middleware de autenticação Fastify
- CASL ability factory com os 6 papéis
- Criação e listagem de empresas
- Convite e gestão de usuários por empresa
- Company switcher no frontend
- Testes: auth routes, CASL permissions

### Fase 2 — Fornecedores e Produtos
- CRUD de fornecedores (com dados bancários e contatos)
- Aprovação/reprovação de fornecedores
- CRUD de produtos (vinculação produto ↔ fornecedor)
- UI: listagem com filtros, formulários de criação/edição

### Fase 3 — Cotações e Lances
- Criação de cotação com itens e convite de fornecedores
- Submissão de lances por fornecedor
- Comparativo de lances
- Seleção de lance vencedor

### Fase 4 — Pedidos de Compra
- Geração de PO a partir de lance vencedor
- Fluxo de status do pedido
- UI de listagem e detalhe do pedido

### Fase 5 — Recebimento e Estoque
- Registro de recebimento (parcial/total)
- Gestão de armazéns
- Movimentações de estoque
- Abertura e fluxo de não-conformidades

### Fase 6 — Financeiro
- Upload e vinculação de notas fiscais
- Registro de pagamentos
- Conciliação

### Fase 7 — Audit Log e Administração
- Registro automático de audit log em mutações críticas
- UI de consulta de audit log
- Tela de configurações da empresa
- Dashboard com KPIs por role
