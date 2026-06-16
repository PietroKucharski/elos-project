# Feature Spec — 7.3 Audit Logs UI (Frontend)

**Fase:** 7 — Audit Log e Administração  
**Unidade:** 7.3  
**Pré-requisito:** 7.2 concluído (AuditLogsModule API funcional)  
**Commit convencional esperado:** `feat(web): add audit logs ui with filters and detail viewer`

---

## Objetivo

Implementar a interface de consulta de audit logs no frontend Next.js, com
listagem filtrada, visualização de diff before/after, e restrição de acesso
a ADMIN_EMPRESA e SUPER_ADMIN.

---

## Escopo

### In

- `lib/api.ts` — funções server-side e client-side para audit logs
- `components/domain/audit-log-filters.tsx`
- `components/domain/audit-logs-list-client.tsx`
- `components/domain/audit-log-diff-viewer.tsx`
- Rotas `(app)/[cnpj]/audit-logs/` — `page.tsx`, `loading.tsx`, `error.tsx`,
  `[id]/page.tsx`, `[id]/loading.tsx`, `[id]/error.tsx`

### Out

- Exportação de logs (CSV/JSON) — fora do escopo v1
- Dashboard (→ 7.4)

---

## Componentes

### `audit-log-filters.tsx`

Client Component:
- Select de entidade (dropdown com entidades distintas via API)
- Select de ação (dropdown com ações distintas via API)
- Input de data início e data fim (`date` input)
- Busca por nome de usuário (client-side filter)
- Botão "Limpar filtros"
- Mudanças de filtro re-carregam a lista via `router.push` com query params

### `audit-logs-list-client.tsx`

Client Component:
- Tabela: data/hora, usuário, entidade, ação, resumo da mudança
- Resumo = frase curta montada client-side a partir de entity+action
  (ex: "Cotação criada", "Fornecedor aprovado", "NF validada")
- Linha clicável → navega ao detalhe do log
- Paginação server-side (page/limit nos query params da URL)
- Estado vazio: ícone `History` + "Nenhum registro encontrado"

### `audit-log-diff-viewer.tsx`

Client Component no detalhe:
- Exibe `before` e `after` lado a lado
- Campos alterados destacados (fundo diferente)
- Campos adicionados (em `after` mas não em `before`) em verde
- Campos removidos (em `before` mas não em `after`) em vermelho
- Se `before` é null (create), mostra apenas `after`
- Se `after` é null (delete), mostra apenas `before`
- JSON tree expandível para objetos aninhados

---

## Rotas

| Rota | Tipo | Descrição |
| ---- | ---- | --------- |
| `[cnpj]/audit-logs/page.tsx` | SSR | Lista com filtros (via Client Component) |
| `[cnpj]/audit-logs/[id]/page.tsx` | SSR | Detalhe com diff viewer |

### Guard de acesso

As páginas verificam o papel do usuário via membership (padrão do projeto):
- Se `role` não está em `['ADMIN_EMPRESA', 'SUPER_ADMIN']` → `notFound()`
- O CASL no backend já garante 403, mas o guard no frontend evita renderizar
  a página para papéis sem permissão

---

## API Functions em `lib/api.ts`

**Server-side:**
- `getAuditLogsServer(cnpj, params?)` — GET `/audit-logs` com query params
- `getAuditLogServer(cnpj, id)` — GET `/audit-logs/:id`
- `getAuditLogEntitiesServer(cnpj)` — GET `/audit-logs/entities`
- `getAuditLogActionsServer(cnpj)` — GET `/audit-logs/actions`

---

## Sidebar

O item "Audit Log" (`History`, href `/${cnpj}/audit-logs`) na sidebar, visível
**apenas** para ADMIN_EMPRESA e SUPER_ADMIN. Se não existir, adicionar no grupo
"Administração" com ícone `History` de lucide-react.

---

## Checklist de Verificação

```bash
# TypeScript
pnpm --filter web type-check

# Lint
pnpm --filter web lint

# Build
pnpm --filter web build  # espera compilar + gerar rotas de audit-logs

# Manual
# [ ] COMPRADOR/ALMOXARIFE/ANALISTA_FINANCEIRO não veem o item na sidebar
# [ ] COMPRADOR navegando direto para /audit-logs vê 404
# [ ] Filtros de entidade e ação carregam do endpoint /entities e /actions
# [ ] Filtro de data filtra corretamente
# [ ] Diff viewer mostra before/after lado a lado
# [ ] Campos alterados estão destacados
# [ ] Create (before=null) mostra apenas after
# [ ] Paginação funciona
```
