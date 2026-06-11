# Feature Spec — 7.1 Shared Schemas: Audit Log

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 7 — Audit Log e Administração  
**Unidade:** 7.1  
**Pré-requisito:** 6.5 concluído (Fase 6 completa)  
**Commit convencional esperado:** `feat(shared): add audit log zod schemas`

---

## Objetivo

Definir os schemas Zod de contrato de API em `packages/shared` para o domínio
de audit log e para os DTOs do dashboard de KPIs. Estes schemas são a fonte de
verdade para tipagem no frontend e validação de query params no backend.

---

## Escopo

### In

- `packages/shared/src/schemas/audit-log.ts`
- `packages/shared/src/schemas/dashboard.ts`
- Modificação em `packages/shared/src/index.ts` — re-exportar os 2 novos schemas

### Out (não implementar nesta unidade)

- Módulos NestJS (→ 7.2, 7.4)
- UI (→ 7.3, 7.4)

---

## Arquivos a Criar / Modificar

```
packages/shared/src/
  schemas/
    audit-log.ts        ← criar
    dashboard.ts        ← criar
  index.ts              ← modificar (adicionar re-exports)
```

---

## Implementação Detalhada

### 1. `packages/shared/src/schemas/audit-log.ts`

```typescript
import { z } from 'zod'

// O audit log é read-only — não há schema de criação (o insert é feito
// internamente pelos Services). Apenas schemas de consulta e resposta.

export const auditLogQuerySchema = z.object({
  entity:   z.string().max(100).optional(),
  entityId: z.string().uuid().optional(),
  action:   z.string().max(50).optional(),
  userId:   z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate:   z.string().datetime().optional(),
  page:     z.coerce.number().int().positive().optional().default(1),
  limit:    z.coerce.number().int().positive().max(100).optional().default(50),
})

export const auditLogResponseSchema = z.object({
  id:         z.string().uuid(),
  companyId:  z.string().uuid().nullable(),
  userId:     z.string().nullable(),
  userName:   z.string().nullable(),
  userEmail:  z.string().nullable(),
  entity:     z.string(),
  entityId:   z.string().uuid(),
  action:     z.string(),
  before:     z.record(z.string(), z.unknown()).nullable(),
  after:      z.record(z.string(), z.unknown()).nullable(),
  ipAddress:  z.string().nullable(),
  createdAt:  z.string().datetime(),
})

// ─── Entities/Actions para filtros de dropdown no frontend ──────────────────

export const auditLogEntities = [
  'Company', 'CompanyMember',
  'Supplier', 'SupplierContact', 'SupplierBankAccount',
  'Product', 'ProductSupplier',
  'Quotation', 'QuotationItem', 'QuotationSupplier',
  'Bid', 'BidItem',
  'PurchaseOrder',
  'Receipt', 'StockMovement',
  'Warehouse',
  'NonConformity',
  'Invoice', 'InvoiceItem',
  'Payment', 'PaymentInstallment',
] as const

export const auditLogActions = [
  'CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE',
  'APPROVE', 'REJECT', 'PUBLISH', 'CLOSE', 'CANCEL',
  'SUBMIT', 'SELECT_WINNER',
  'SEND', 'RECEIVE',
  'ANALYZE', 'RESOLVE',
  'VALIDATE',
  'PAY', 'COMPLETE',
] as const

export type AuditLogQuery    = z.infer<typeof auditLogQuerySchema>
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>
```

---

### 2. `packages/shared/src/schemas/dashboard.ts`

```typescript
import { z } from 'zod'

// Schemas de resposta para os KPIs do dashboard.
// O backend calcula; o frontend exibe.

export const dashboardKpisSchema = z.object({
  // Cotações
  quotationsOpen:     z.number(),
  quotationsClosed:   z.number(),

  // Pedidos de Compra
  purchaseOrdersDraft:    z.number(),
  purchaseOrdersApproved: z.number(),
  purchaseOrdersSent:     z.number(),
  purchaseOrdersReceived: z.number(),

  // Financeiro
  invoicesPending:    z.number(),
  invoicesValidated:  z.number(),
  paymentsPending:    z.number(),
  paymentsPaid:       z.number(),
  totalPayable:       z.string(), // numeric → string (total a pagar em NFs validadas sem pagamento PAID)
  totalPaid:          z.string(), // numeric → string (total pago em pagamentos PAID)

  // Estoque
  lowStockAlerts:     z.number(), // produtos com quantity < minStock

  // NCs
  nonConformitiesOpen:      z.number(),
  nonConformitiesAnalyzing: z.number(),

  // Fornecedores
  suppliersPending:   z.number(),
  suppliersApproved:  z.number(),
})

export const dashboardRecentActivitySchema = z.object({
  id:        z.string().uuid(),
  entity:    z.string(),
  action:    z.string(),
  userName:  z.string().nullable(),
  createdAt: z.string().datetime(),
  summary:   z.string(), // frase curta descrevendo a ação (montada pelo backend)
})

export const dashboardResponseSchema = z.object({
  kpis:           dashboardKpisSchema,
  recentActivity: z.array(dashboardRecentActivitySchema),
})

export type DashboardKpis           = z.infer<typeof dashboardKpisSchema>
export type DashboardRecentActivity = z.infer<typeof dashboardRecentActivitySchema>
export type DashboardResponse       = z.infer<typeof dashboardResponseSchema>
```

---

### 3. Modificar `packages/shared/src/index.ts`

Adicionar re-exports em ordem alfabética:

```typescript
// Adicionar ao barrel (ordem alfabética):
export * from './schemas/audit-log'
export * from './schemas/dashboard'
```

---

## Checklist de Verificação

```bash
# Build do shared
pnpm --filter @elos/shared build

# Type-check nos 3 workspaces
pnpm type-check

# Lint
pnpm --filter @elos/shared lint

# Verificações manuais (safeParse):
# [ ] auditLogQuerySchema sem campos → passa (todos opcionais com defaults)
# [ ] auditLogQuerySchema com limit > 100 → falha
# [ ] auditLogResponseSchema com before/after como object → passa
# [ ] dashboardKpisSchema com todos os campos numéricos → passa
# [ ] auditLogEntities contém todas as entidades registradas nos Services
```

---

## Decisões de Domínio

| Decisão | Motivo |
| ------- | ------ |
| Audit log é read-only no schema | Os inserts são feitos internamente pelos Services; não há endpoint de criação exposto |
| `auditLogEntities`/`auditLogActions` como arrays const | Permitem gerar dropdowns de filtro no frontend sem hardcoding |
| Dashboard KPIs como schema separado | Os KPIs são um contrato do backend para o frontend; ter schema permite validação e tipagem segura |
| `totalPayable`/`totalPaid` como string | São somas de `numeric` do PostgreSQL; postgres.js retorna strings para precisão decimal |
| `recentActivity` com `summary` | O backend monta a frase descritiva (ex: "João aprovou o fornecedor Acme"); o frontend não precisa interpretar entity+action |
