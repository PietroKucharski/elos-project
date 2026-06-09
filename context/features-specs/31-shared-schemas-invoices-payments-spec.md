# Feature Spec — 6.1 Shared Schemas: Notas Fiscais e Pagamentos

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 6 — Financeiro (NF + Pagamentos)  
**Unidade:** 6.1  
**Pré-requisito:** 5.7 concluído (Fase 5 completa)  
**Commit convencional esperado:** `feat(shared): add invoice and payment zod schemas`

---

## Objetivo

Definir os schemas Zod de contrato de API em `packages/shared` para os domínios
da Fase 6: notas fiscais (`invoice`) e pagamentos (`payment`). Estes schemas são
a fonte de verdade para validação no backend e tipagem no frontend.

---

## Escopo

### In

- `packages/shared/src/schemas/invoice.ts`
- `packages/shared/src/schemas/payment.ts`
- Modificação em `packages/shared/src/index.ts` — re-exportar os 2 novos schemas

### Out (não implementar nesta unidade)

- Módulos NestJS (→ 6.2, 6.3)
- UI (→ 6.4, 6.5)
- Upload real de arquivos para Supabase Storage (→ 6.2, endpoint de upload)
- Migrations de banco — os schemas das tabelas já foram definidos em 0.3; se
  algum ajuste for necessário, será feito na unidade do módulo correspondente

---

## Arquivos a Criar / Modificar

```
packages/shared/src/
  schemas/
    invoice.ts          ← criar
    payment.ts          ← criar
  index.ts              ← modificar (adicionar re-exports)
```

---

## Decisões de Domínio

| Decisão | Motivo |
| ------- | ------ |
| NF vinculada obrigatoriamente a um PO | No fluxo Elos, toda NF entra pelo recebimento de um pedido de compra; NFs avulsas estão fora do escopo v1 |
| `supplierId` obrigatório na NF | O fornecedor emissor da NF deve estar cadastrado e pertencer à empresa |
| `fileUrl` opcional no create | Upload do PDF da NF pode ser feito após a criação do registro (endpoint separado) |
| Itens da NF são opcionais no create | O analista pode registrar apenas o cabeçalho inicialmente e adicionar itens depois; ou os itens podem ser copiados do PO |
| Pagamento vinculado obrigatoriamente a uma NF validada | Não se paga sem NF aprovada — regra de negócio do fluxo financeiro |
| Parcelas inclusas no create do pagamento | Pagamentos à vista têm 1 parcela; parcelados têm N parcelas informadas de uma vez |
| `InvoiceStatus`/`PaymentStatus`/`PaymentMethod` não re-exportados dos schema files | Já exportados por `enums.ts` — re-exportar causaria `TS2308` (ambiguidade no barrel). Apenas os arrays de valores são exportados dos schemas |
| `installmentStatusValues` exportado do schema | `InstallmentStatus` (PENDING/PAID/OVERDUE) é um enum do banco (`installment_status`) mas pode não estar em `enums.ts`; se estiver, exportar apenas o array de valores |

---

## Implementação Detalhada

### 1. `packages/shared/src/schemas/invoice.ts`

```typescript
import { z } from 'zod'
import { InvoiceStatus } from '../enums'

export const invoiceStatusValues = Object.values(
  InvoiceStatus,
) as [InvoiceStatus, ...InvoiceStatus[]]

// ─── Invoice item ────────────────────────────────────────────────────────────

export const createInvoiceItemSchema = z.object({
  productId:   z.string().uuid().optional(),
  description: z.string().min(1).max(255),
  quantity:    z.number().positive(),
  unitPrice:   z.number().nonnegative(),
  totalPrice:  z.number().nonnegative(),
})

export const invoiceItemResponseSchema = z.object({
  id:          z.string().uuid(),
  invoiceId:   z.string().uuid(),
  productId:   z.string().uuid().nullable(),
  productName: z.string().nullable(),
  description: z.string(),
  quantity:    z.string(), // numeric do postgres.js
  unitPrice:   z.string(),
  totalPrice:  z.string(),
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
})

// ─── Invoice ─────────────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  supplierId:      z.string().uuid(),
  number:          z.string().min(1).max(100),
  issueDate:       z.string().datetime(),
  totalAmount:     z.number().positive(),
  taxAmount:       z.number().nonnegative().optional(),
  fileUrl:         z.string().url().optional(),
  items:           z.array(createInvoiceItemSchema).optional(),
})

export const updateInvoiceSchema = z.object({
  number:      z.string().min(1).max(100).optional(),
  issueDate:   z.string().datetime().optional(),
  totalAmount: z.number().positive().optional(),
  taxAmount:   z.number().nonnegative().optional(),
  fileUrl:     z.string().url().optional(),
})

export const validateInvoiceSchema = z.object({
  notes: z.string().max(1000).optional(),
})

export const rejectInvoiceSchema = z.object({
  rejectionReason: z.string().min(5).max(2000),
})

export const invoiceResponseSchema = z.object({
  id:              z.string().uuid(),
  companyId:       z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  purchaseOrderNumber: z.string(),
  supplierId:      z.string().uuid(),
  supplierName:    z.string(),
  number:          z.string(),
  issueDate:       z.string().datetime(),
  totalAmount:     z.string(), // numeric do postgres.js
  taxAmount:       z.string().nullable(),
  status:          z.enum(invoiceStatusValues),
  fileUrl:         z.string().nullable(),
  rejectionReason: z.string().nullable(),
  validatedById:   z.string().nullable(),
  validatedByName: z.string().nullable(),
  validatedAt:     z.string().datetime().nullable(),
  createdAt:       z.string().datetime(),
  updatedAt:       z.string().datetime(),
  items:           z.array(invoiceItemResponseSchema).optional(), // só no GET :id
  itemCount:       z.number().optional(), // só na listagem
})

export type CreateInvoiceDto      = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceDto      = z.infer<typeof updateInvoiceSchema>
export type ValidateInvoiceDto    = z.infer<typeof validateInvoiceSchema>
export type RejectInvoiceDto      = z.infer<typeof rejectInvoiceSchema>
export type CreateInvoiceItemDto  = z.infer<typeof createInvoiceItemSchema>
export type InvoiceResponse       = z.infer<typeof invoiceResponseSchema>
export type InvoiceItemResponse   = z.infer<typeof invoiceItemResponseSchema>
```

---

### 2. `packages/shared/src/schemas/payment.ts`

```typescript
import { z } from 'zod'
import { PaymentStatus, PaymentMethod } from '../enums'

export const paymentStatusValues = Object.values(
  PaymentStatus,
) as [PaymentStatus, ...PaymentStatus[]]

export const paymentMethodValues = Object.values(
  PaymentMethod,
) as [PaymentMethod, ...PaymentMethod[]]

// Nota: InstallmentStatus pode não existir em enums.ts (é pgEnum do banco).
// Se existir, usar Object.values(). Senão, declarar inline:
export const installmentStatusValues = ['PENDING', 'PAID', 'OVERDUE'] as const

// ─── Payment installment ─────────────────────────────────────────────────────

export const createInstallmentSchema = z.object({
  installmentNumber: z.number().int().positive(),
  amount:            z.number().positive(),
  dueDate:           z.string().datetime(),
})

export const installmentResponseSchema = z.object({
  id:                z.string().uuid(),
  paymentId:         z.string().uuid(),
  installmentNumber: z.string(), // numeric do postgres.js
  amount:            z.string(),
  dueDate:           z.string().datetime(),
  paidAt:            z.string().datetime().nullable(),
  status:            z.enum(installmentStatusValues),
  createdAt:         z.string().datetime(),
  updatedAt:         z.string().datetime(),
})

// ─── Payment ─────────────────────────────────────────────────────────────────

export const createPaymentSchema = z.object({
  invoiceId:    z.string().uuid(),
  totalAmount:  z.number().positive(),
  method:       z.enum(paymentMethodValues),
  notes:        z.string().max(1000).optional(),
  installments: z.array(createInstallmentSchema).min(1),
})

export const updatePaymentSchema = z.object({
  notes: z.string().max(1000).optional(),
})

export const paymentResponseSchema = z.object({
  id:          z.string().uuid(),
  companyId:   z.string().uuid(),
  invoiceId:   z.string().uuid(),
  invoiceNumber: z.string(),
  totalAmount: z.string(), // numeric do postgres.js
  method:      z.enum(paymentMethodValues),
  status:      z.enum(paymentStatusValues),
  paidAt:      z.string().datetime().nullable(),
  notes:       z.string().nullable(),
  createdById: z.string(),
  createdByName: z.string(),
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
  installments: z.array(installmentResponseSchema).optional(), // só no GET :id
  installmentCount: z.number().optional(), // só na listagem
})

// ─── Ações de parcela ────────────────────────────────────────────────────────

export const payInstallmentSchema = z.object({
  paidAt: z.string().datetime().optional(), // default = now no backend
})

export type CreatePaymentDto       = z.infer<typeof createPaymentSchema>
export type UpdatePaymentDto       = z.infer<typeof updatePaymentSchema>
export type CreateInstallmentDto   = z.infer<typeof createInstallmentSchema>
export type PayInstallmentDto      = z.infer<typeof payInstallmentSchema>
export type PaymentResponse        = z.infer<typeof paymentResponseSchema>
export type InstallmentResponse    = z.infer<typeof installmentResponseSchema>
```

---

### 3. Modificar `packages/shared/src/index.ts`

Adicionar re-exports em ordem alfabética:

```typescript
// Adicionar ao barrel (ordem alfabética):
export * from './schemas/invoice'
export * from './schemas/payment'
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
# [ ] createInvoiceSchema sem purchaseOrderId → falha
# [ ] createInvoiceSchema com campos válidos → passa
# [ ] createInvoiceSchema com totalAmount negativo → falha
# [ ] createPaymentSchema sem installments → falha (min 1)
# [ ] createPaymentSchema com campos válidos → passa
# [ ] createPaymentSchema com method inválido → falha
# [ ] payInstallmentSchema sem campos → passa (todos opcionais)
# [ ] InvoiceStatus/PaymentStatus/PaymentMethod não re-exportados (já em enums.ts)
```
