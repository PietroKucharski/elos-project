# Feature Spec — 5.1 Shared Schemas: Recebimento, Armazéns e Não-Conformidades

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 5 — Recebimento e Estoque  
**Unidade:** 5.1  
**Pré-requisito:** 4.3 concluído (Fase 4 completa)  
**Commit convencional esperado:** `feat(shared): add warehouse, receipt and non-conformity zod schemas`

---

## Objetivo

Definir os schemas Zod de contrato de API em `packages/shared` para os domínios
da Fase 5: armazéns (`warehouse`), recebimentos (`receipt`), movimentações de
estoque (`stock-movement`) e não-conformidades (`non-conformity`). Estes schemas
são a fonte de verdade para validação no backend e tipagem no frontend.

---

## Escopo

### In

- `packages/shared/src/schemas/warehouse.ts`
- `packages/shared/src/schemas/receipt.ts`
- `packages/shared/src/schemas/stock-movement.ts`
- `packages/shared/src/schemas/non-conformity.ts`
- Modificação em `packages/shared/src/index.ts` — re-exportar os 4 novos schemas

### Out (não implementar nesta unidade)

- Módulos NestJS (→ 5.2, 5.3, 5.4)
- UI (→ 5.5, 5.6, 5.7)
- Migrations de banco — os schemas das tabelas já foram definidos em 0.3; se
  algum ajuste for necessário, será feito na unidade do módulo correspondente

---

## Arquivos a Criar / Modificar

```text
packages/shared/src/
  schemas/
    warehouse.ts        ← criar
    receipt.ts          ← criar
    stock-movement.ts   ← criar
    non-conformity.ts   ← criar
  index.ts              ← modificar (adicionar re-exports)
```

---

## Implementação Detalhada

### 1. `packages/shared/src/schemas/warehouse.ts`

```typescript
import { z } from 'zod'

// ─── Warehouse ────────────────────────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  name:     z.string().min(2).max(255),
  code:     z.string().max(50).optional(),
  location: z.string().max(500).optional(),
})

export const updateWarehouseSchema = createWarehouseSchema.partial()

export const warehouseResponseSchema = z.object({
  id:        z.string().uuid(),
  companyId: z.string().uuid(),
  name:      z.string(),
  code:      z.string().nullable(),
  location:  z.string().nullable(),
  isActive:  z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ─── Inventory (saldo por produto/armazém) ────────────────────────────────────

export const inventoryResponseSchema = z.object({
  id:           z.string().uuid(),
  warehouseId:  z.string().uuid(),
  warehouseName: z.string(),
  productId:    z.string().uuid(),
  productName:  z.string(),
  productCode:  z.string().nullable(),
  unit:         z.string(),
  quantity:     z.string(), // numeric do postgres.js
  minStock:     z.string().nullable(),
  updatedAt:    z.string().datetime(),
})

export type CreateWarehouseDto   = z.infer<typeof createWarehouseSchema>
export type UpdateWarehouseDto   = z.infer<typeof updateWarehouseSchema>
export type WarehouseResponse    = z.infer<typeof warehouseResponseSchema>
export type InventoryResponse    = z.infer<typeof inventoryResponseSchema>
```

---

### 2. `packages/shared/src/schemas/receipt.ts`

```typescript
import { z } from 'zod'

// ─── Receipt item ─────────────────────────────────────────────────────────────

export const createReceiptItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  receivedQuantity:    z.number().positive(),
  notes:               z.string().max(500).optional(),
})

export const receiptItemResponseSchema = z.object({
  id:                  z.string().uuid(),
  receiptId:           z.string().uuid(),
  purchaseOrderItemId: z.string().uuid(),
  productId:           z.string().uuid(),
  productName:         z.string(),
  productCode:         z.string().nullable(),
  unit:                z.string(),
  orderedQuantity:     z.string(), // quantity do purchase_order_item (numeric)
  receivedQuantity:    z.string(), // numeric do postgres.js
  totalReceived:       z.string(), // acumulado até agora (antes + este recebimento)
  notes:               z.string().nullable(),
  createdAt:           z.string().datetime(),
  updatedAt:           z.string().datetime(),
})

// ─── Receipt ──────────────────────────────────────────────────────────────────

// v1: um recebimento registra os itens recebidos de um PO em um armazém.
// O sistema decide automaticamente se é PARTIAL ou COMPLETE com base nas
// quantidades recebidas vs. quantidades do PO.
export const createReceiptSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  warehouseId:     z.string().uuid(),
  receivedAt:      z.string().datetime(), // ISO datetime informado pelo almoxarife
  notes:           z.string().max(1000).optional(),
  items:           z.array(createReceiptItemSchema).min(1),
})

export const receiptResponseSchema = z.object({
  id:              z.string().uuid(),
  companyId:       z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  purchaseOrderNumber: z.string(),
  warehouseId:     z.string().uuid(),
  warehouseName:   z.string(),
  receivedById:    z.string(),
  status:          z.enum(['PARTIAL', 'COMPLETE']),
  notes:           z.string().nullable(),
  receivedAt:      z.string().datetime(),
  createdAt:       z.string().datetime(),
  updatedAt:       z.string().datetime(),
  items:           z.array(receiptItemResponseSchema).optional(), // só no GET :id
})

export type CreateReceiptDto       = z.infer<typeof createReceiptSchema>
export type CreateReceiptItemDto   = z.infer<typeof createReceiptItemSchema>
export type ReceiptResponse        = z.infer<typeof receiptResponseSchema>
export type ReceiptItemResponse    = z.infer<typeof receiptItemResponseSchema>
```

---

### 3. `packages/shared/src/schemas/stock-movement.ts`

```typescript
import { z } from 'zod'
import { StockMovementType } from '../enums'

export const stockMovementTypeValues = Object.values(
  StockMovementType,
) as [StockMovementType, ...StockMovementType[]]

// Movimentações manuais criadas pelo ALMOXARIFE (entrada, saída, transferência)
// As movimentações geradas automaticamente pelo recebimento não passam por este schema.
export const createStockMovementSchema = z.object({
  warehouseId:      z.string().uuid(),
  productId:        z.string().uuid(),
  type:             z.enum(stockMovementTypeValues),
  quantity:         z.number().positive(),
  // Para transferências: armazém de destino
  toWarehouseId:    z.string().uuid().optional(),
  referenceType:    z.string().max(50).optional(),
  referenceId:      z.string().uuid().optional(),
  notes:            z.string().max(500).optional(),
})

export const stockMovementResponseSchema = z.object({
  id:            z.string().uuid(),
  companyId:     z.string().uuid(),
  warehouseId:   z.string().uuid(),
  warehouseName: z.string(),
  productId:     z.string().uuid(),
  productName:   z.string(),
  productCode:   z.string().nullable(),
  unit:          z.string(),
  type:          z.enum(stockMovementTypeValues),
  quantity:      z.string(), // numeric do postgres.js
  referenceType: z.string().nullable(),
  referenceId:   z.string().nullable(),
  notes:         z.string().nullable(),
  createdById:   z.string(),
  createdByName: z.string(),
  createdAt:     z.string().datetime(),
})

export type CreateStockMovementDto  = z.infer<typeof createStockMovementSchema>
export type StockMovementResponse   = z.infer<typeof stockMovementResponseSchema>
```

---

### 4. `packages/shared/src/schemas/non-conformity.ts`

```typescript
import { z } from 'zod'
import {
  NonConformityStatus,
  NonConformityType,
  Severity,
} from '../enums'

export const ncStatusValues = Object.values(
  NonConformityStatus,
) as [NonConformityStatus, ...NonConformityStatus[]]

export const ncTypeValues = Object.values(
  NonConformityType,
) as [NonConformityType, ...NonConformityType[]]

export const severityValues = Object.values(
  Severity,
) as [Severity, ...Severity[]]

// ─── Non-Conformity ───────────────────────────────────────────────────────────

export const createNonConformitySchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  supplierId:      z.string().uuid(),
  productId:       z.string().uuid().optional(),
  type:            z.enum(ncTypeValues),
  severity:        z.enum(severityValues),
  description:     z.string().min(10).max(2000),
  notes:           z.string().max(1000).optional(),
})

export const updateNonConformitySchema = z.object({
  type:        z.enum(ncTypeValues).optional(),
  severity:    z.enum(severityValues).optional(),
  description: z.string().min(10).max(2000).optional(),
  notes:       z.string().max(1000).optional(),
})

// Transições de status
export const analyzeNcSchema = z.object({
  notes: z.string().max(1000).optional(), // notas ao iniciar análise
})

export const resolveNcSchema = z.object({
  resolution: z.string().min(10).max(2000),
})

export const rejectNcSchema = z.object({
  resolution: z.string().min(5).max(2000), // motivo da rejeição
})

export const nonConformityResponseSchema = z.object({
  id:              z.string().uuid(),
  companyId:       z.string().uuid(),
  purchaseOrderId: z.string().uuid().nullable(),
  purchaseOrderNumber: z.string().nullable(),
  supplierId:      z.string().uuid(),
  supplierName:    z.string(),
  productId:       z.string().uuid().nullable(),
  productName:     z.string().nullable(),
  type:            z.enum(ncTypeValues),
  severity:        z.enum(severityValues),
  description:     z.string(),
  status:          z.enum(ncStatusValues),
  resolution:      z.string().nullable(),
  notes:           z.string().nullable(),
  resolvedAt:      z.string().datetime().nullable(),
  createdById:     z.string(),
  createdByName:   z.string(),
  createdAt:       z.string().datetime(),
  updatedAt:       z.string().datetime(),
  comments:        z.array(ncCommentResponseSchema).optional(), // só no GET :id
})

// ─── NC Comments ──────────────────────────────────────────────────────────────

export const addNcCommentSchema = z.object({
  text: z.string().min(1).max(2000),
})

export const ncCommentResponseSchema = z.object({
  id:              z.string().uuid(),
  nonConformityId: z.string().uuid(),
  userId:          z.string(),
  userName:        z.string(),
  text:            z.string(),
  createdAt:       z.string().datetime(),
  updatedAt:       z.string().datetime(),
})

export type CreateNonConformityDto = z.infer<typeof createNonConformitySchema>
export type UpdateNonConformityDto = z.infer<typeof updateNonConformitySchema>
export type AnalyzeNcDto           = z.infer<typeof analyzeNcSchema>
export type ResolveNcDto           = z.infer<typeof resolveNcSchema>
export type RejectNcDto            = z.infer<typeof rejectNcSchema>
export type NonConformityResponse  = z.infer<typeof nonConformityResponseSchema>
export type AddNcCommentDto        = z.infer<typeof addNcCommentSchema>
export type NcCommentResponse      = z.infer<typeof ncCommentResponseSchema>
```

> **Nota:** `ncCommentResponseSchema` é referenciado dentro de
> `nonConformityResponseSchema`. Por ser uma referência circular (no mesmo
> arquivo, mas sem recursão real — NC tem lista de comentários, comentário não
> tem NC), declare `ncCommentResponseSchema` **antes** de
> `nonConformityResponseSchema` no arquivo, ou use `z.lazy()` caso o TypeScript
> reclame da ordem. Na prática, mover a declaração de `ncCommentResponseSchema`
> para o topo do bloco de comentários resolve.

---

### 5. Modificar `packages/shared/src/index.ts`

Adicionar re-exports em ordem alfabética, entre `purchase-order` e o próximo
módulo existente:

```typescript
// Adicionar ao barrel (ordem alfabética):
export * from './schemas/non-conformity'
export * from './schemas/receipt'
export * from './schemas/stock-movement'
export * from './schemas/warehouse'
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
# [ ] createWarehouseSchema com name vazio → falha
# [ ] createWarehouseSchema com name válido → passa
# [ ] createReceiptSchema sem items → falha
# [ ] createReceiptSchema com items[] válidos → passa
# [ ] createNonConformitySchema com description < 10 chars → falha
# [ ] createNonConformitySchema com campos válidos → passa
# [ ] ncStatusValues não re-exporta NonConformityStatus (já em enums.ts)
# [ ] ncTypeValues não re-exporta NonConformityType (já em enums.ts)
# [ ] severityValues não re-exporta Severity (já em enums.ts)
```

---

## Decisões de Domínio

| Decisão | Motivo |
| ------- | ------ |
| `createReceiptSchema` inclui `items[]` | Recebimento cria cabeçalho + itens numa única operação; não há POST separado de items (simplifica o fluxo do almoxarife) |
| Status PARTIAL/COMPLETE calculado pelo backend | O frontend não decide; o serviço compara `totalReceivedQuantity` com `orderedQuantity` de cada item |
| `receivedAt` informado pelo usuário | Pode haver atraso entre o recebimento físico e o registro no sistema; o almoxarife informa a data/hora real |
| Movimentações automáticas não têm schema de criação exposto | As movimentações geradas pelo recebimento são criadas internamente no `ReceiptsService`; apenas movimentações manuais têm `createStockMovementSchema` |
| NC sem FK obrigatória a receipt | A NC pode ser aberta manualmente (sem receipt, sem PO) a partir de uma inspeção de qualidade; `purchaseOrderId` e `productId` são opcionais |
| `ncCommentResponseSchema` declarado antes de `nonConformityResponseSchema` | Evita referência para frente no arquivo TypeScript; não é recursivo |
| `NonConformityStatus`, `NonConformityType`, `Severity` não re-exportados dos schema files | Já exportados por `enums.ts` — re-exportar causaria `TS2308` (ambiguidade no barrel). Apenas os arrays de valores (`ncStatusValues`, `ncTypeValues`, `severityValues`) são exportados dos schemas, necessários para `z.enum()` |
