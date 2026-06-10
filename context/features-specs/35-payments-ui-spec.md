# Feature Spec — 6.5 Payments UI (Frontend)

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 6 — Financeiro (NF + Pagamentos)  
**Unidade:** 6.5  
**Pré-requisito:** 6.3 concluído (PaymentsModule API funcional); 6.4 concluído (InvoicesUI)  
**Commit convencional esperado:** `feat(web): add payments ui with list, detail, installments and reconciliation`

---

## Objetivo

Implementar a interface de gestão de pagamentos no frontend Next.js, incluindo
listagem com filtros, criação vinculada a NF validada, detalhe com parcelas,
ações de pagamento de parcelas e cancelamento, e integração com o detalhe da NF.

---

## Escopo

### In

- `lib/api.ts` — funções server-side e client-side para payments
- `components/domain/payment-status-badge.tsx`
- `components/domain/payment-method-badge.tsx`
- `components/domain/create-payment-dialog.tsx`
- `components/domain/payments-list-client.tsx`
- `components/domain/installments-panel.tsx`
- `components/domain/payment-actions.tsx`
- Rotas `(app)/[cnpj]/payments/` — `page.tsx`, `loading.tsx`, `error.tsx`,
  `[id]/page.tsx`, `[id]/loading.tsx`, `[id]/error.tsx`
- Modificação no detalhe da NF (`invoices/[id]/page.tsx`) — botão "Registrar Pagamento"

### Out

- Job de atualização de parcelas OVERDUE (fora do escopo v1)
- Relatórios financeiros (fora do escopo v1)

---

## Componentes

### `payment-status-badge.tsx`

Badge por status:
- PENDING → muted
- PAID → success
- CANCELLED → destructive

### `payment-method-badge.tsx`

Badge por método:
- BOLETO → outline
- PIX → info
- TRANSFER → outline
- CHECK → outline

### `create-payment-dialog.tsx`

Dialog/Sheet de criação de pagamento:
- `invoiceId` pré-selecionado (vindo do detalhe da NF)
- Valor total (default = valor da NF)
- Select de método de pagamento (BOLETO/PIX/TRANSFER/CHECK)
- Notas (opcional)
- Seção de parcelas:
  - Default: 1 parcela (à vista) com valor total e vencimento = hoje + 30 dias
  - Botão "Adicionar parcela" para parcelamento
  - Cada parcela: número, valor, data de vencimento
  - Validação: soma das parcelas ≥ valor total
- Redirect ao detalhe após criar

### `payments-list-client.tsx`

Client Component:
- Tabs de status (Todos/Pendentes/Pagos/Cancelados)
- Filtro de método de pagamento
- Busca por número da NF client-side
- Tabela: NF, valor, método, status, data criação
- Kebab menu: Ver, Cancelar (PENDING) — conforme `canMutate`

### `installments-panel.tsx`

Client Component no detalhe:
- Tabela de parcelas: número, valor, vencimento, status, data pagamento
- Parcela vencida (dueDate < now && status === 'PENDING') com destaque vermelho
- Botão "Pagar" por parcela (PENDING) via `AlertDialog`
- Barra de progresso visual (parcelas pagas / total)
- Banner "Pagamento concluído" quando status = PAID

### `payment-actions.tsx`

Client Component no detalhe:
- Botão "Cancelar Pagamento" (PENDING, `AlertDialog`)
- Só visível se `canMutate`

---

## Rotas

| Rota | Tipo | Descrição |
| ---- | ---- | --------- |
| `[cnpj]/payments/page.tsx` | SSR | Lista pagamentos via Client Component |
| `[cnpj]/payments/[id]/page.tsx` | SSR | Detalhe + parcelas + ações |
| `invoices/[id]/page.tsx` | Modificar | Botão "Registrar Pagamento" (NF VALIDATED, sem pagamento existente) |

---

## API Functions em `lib/api.ts`

**Server-side:**
- `getPaymentsServer(cnpj, params?)` — GET `/payments` com query params
- `getPaymentServer(cnpj, id)` — GET `/payments/:id` com parcelas

**Client-side:**
- `createPayment(cnpj, dto)` — POST
- `updatePayment(cnpj, id, dto)` — PATCH
- `cancelPayment(cnpj, id)` — POST `:id/cancel`
- `payInstallment(cnpj, paymentId, installmentId, dto)` — POST `:id/installments/:installmentId/pay`

---

## Sidebar

O item "Pagamentos" (`CreditCard`, href `/${cnpj}/payments`) deve existir na
sidebar (1.4) no grupo "Financeiro". Se não existir, adicionar com ícone
`CreditCard` de lucide-react, visível para todos os papéis.

---

## NF Detail Integration

No detalhe da nota fiscal (`invoices/[id]/page.tsx`), adicionar:
- Se NF `VALIDATED` e sem pagamento: botão "Registrar Pagamento" → `CreatePaymentDialog`
- Se NF tem pagamento: card com status do pagamento, link para detalhe

---

## Checklist de Verificação

```bash
# TypeScript
pnpm --filter web type-check

# Lint
pnpm --filter web lint

# Build
pnpm --filter web build  # espera compilar + gerar rotas de payments

# Manual
# [ ] Listagem renderiza com tabs de status e filtro de método
# [ ] Criação de pagamento pré-preenche valor e NF
# [ ] Parcelas renderizam com destaque de vencido
# [ ] Pagar parcela atualiza status e barra de progresso
# [ ] Auto-completar exibe banner "Pagamento concluído"
# [ ] Cancelar com AlertDialog funciona
# [ ] Botão "Registrar Pagamento" no detalhe da NF
```
