# Feature Spec — 6.4 Invoices UI (Frontend)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.


**Fase:** 6 — Financeiro (NF + Pagamentos)  
**Unidade:** 6.4  
**Pré-requisito:** 6.2 concluído (InvoicesModule API funcional)  
**Commit convencional esperado:** `feat(web): add invoices ui with list, form, detail and validation`

---

## Objetivo

Implementar a interface de gestão de notas fiscais no frontend Next.js, incluindo
listagem com filtros, criação vinculada a PO, detalhe com itens e comparação de
valores, e ações de validação/rejeição.

---

## Escopo

### In

- `lib/api.ts` — funções server-side e client-side para invoices
- `components/domain/invoice-status-badge.tsx`
- `components/domain/invoice-form.tsx`
- `components/domain/invoices-list-client.tsx`
- `components/domain/invoice-items-panel.tsx`
- `components/domain/invoice-actions.tsx`
- Rotas `(app)/[cnpj]/invoices/` — `page.tsx`, `loading.tsx`, `error.tsx`,
  `new/page.tsx`, `[id]/page.tsx`, `[id]/loading.tsx`, `[id]/error.tsx`
- Modificação no detalhe do PO (`purchase-orders/[id]/page.tsx`) — card "Notas Fiscais"

### Out

- Upload real de arquivo (usa input de URL na v1; upload para Supabase Storage futuro)
- Pagamentos (→ 6.5)

---

## Componentes

### `invoice-status-badge.tsx`

Badge por status via tokens semânticos:
- PENDING → muted
- VALIDATED → success
- REJECTED → destructive

### `invoice-form.tsx`

Form de criação de NF:
- Select de PO (SENT/RECEIVED) da empresa — carregado client-side
- Select de fornecedor (APPROVED) — carregado client-side
- Número da NF (texto livre)
- Data de emissão (`datetime-local`)
- Valor total e valor de impostos
- URL do arquivo (texto, opcional)
- Redirect ao detalhe após criar

### `invoices-list-client.tsx`

Client Component:
- Tabs de status (Todos/Pendentes/Validadas/Rejeitadas)
- Busca por número da NF client-side
- Tabela: número, fornecedor, PO, valor, status, data
- Kebab menu: Ver, Validar (PENDING), Rejeitar (PENDING) — conforme `canMutate`

### `invoice-items-panel.tsx`

Client Component no detalhe:
- Tabela de itens com produto, descrição, qtd, preço unit., total
- Form inline de adição (apenas PENDING)
- Botão de remoção (apenas PENDING)
- Totalização no rodapé
- Comparação visual: "Valor NF: R$ X | Valor PO: R$ Y | Diferença: R$ Z"

### `invoice-actions.tsx`

Client Component no detalhe:
- Botão "Validar" (PENDING, `AlertDialog` de confirmação)
- Botão "Rejeitar" (PENDING, `AlertDialog` com textarea de motivo, min 5 chars)
- Ambos só visíveis se `canMutate` (ANALISTA_FINANCEIRO/ADMIN_EMPRESA/SUPER_ADMIN)

---

## Rotas

| Rota | Tipo | Descrição |
| ---- | ---- | --------- |
| `[cnpj]/invoices/page.tsx` | SSR | Lista NFs via Client Component |
| `[cnpj]/invoices/new/page.tsx` | SSR | Form de criação |
| `[cnpj]/invoices/[id]/page.tsx` | SSR | Detalhe + itens + ações |
| `purchase-orders/[id]/page.tsx` | Modificar | Card "Notas Fiscais" vinculadas |

---

## API Functions em `lib/api.ts`

**Server-side:**
- `getInvoicesServer(cnpj, params?)` — GET `/invoices` com query params
- `getInvoiceServer(cnpj, id)` — GET `/invoices/:id` com itens

**Client-side:**
- `createInvoice(cnpj, dto)` — POST
- `updateInvoice(cnpj, id, dto)` — PATCH
- `validateInvoice(cnpj, id, dto)` — POST `:id/validate`
- `rejectInvoice(cnpj, id, dto)` — POST `:id/reject`
- `addInvoiceItem(cnpj, id, dto)` — POST `:id/items`
- `removeInvoiceItem(cnpj, id, itemId)` — DELETE `:id/items/:itemId`

---

## Sidebar

O item "Notas Fiscais" (`FileText`, href `/${cnpj}/invoices`) deve já existir
na sidebar (1.4). Se não existir, adicionar no grupo "Financeiro" com ícone
`FileText` de lucide-react, visível para todos os papéis.

---

## PO Detail Integration

No detalhe do pedido de compra (`purchase-orders/[id]/page.tsx`), adicionar
card "Notas Fiscais" após o painel de recebimentos (se PO status SENT/RECEIVED):
- Lista NFs vinculadas via `getInvoicesServer({ purchaseOrderId })`
- Link "Registrar NF" com `?purchaseOrderId=` se `canMutate`
- Cada NF mostra número, valor, status badge

---

## Checklist de Verificação

```bash
# TypeScript
pnpm --filter web type-check

# Lint
pnpm --filter web lint

# Build
pnpm --filter web build  # espera compilar + gerar rotas de invoices

# Manual
# [ ] Listagem renderiza com tabs de status
# [ ] Form de criação pré-seleciona PO se vindo de ?purchaseOrderId
# [ ] Detalhe mostra itens + comparação de valores PO vs NF
# [ ] Validar/Rejeitar com AlertDialog funciona
# [ ] Card no PO detail mostra NFs vinculadas
# [ ] Sidebar tem item "Notas Fiscais" no grupo Financeiro
```
