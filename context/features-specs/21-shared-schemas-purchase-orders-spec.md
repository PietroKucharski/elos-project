# Feature Spec — 4.1 Shared Schemas: Pedidos de Compra

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 4 — Pedidos de Compra  
**Unidade:** 4.1  
**Pré-requisito:** 3.5 concluído (Fase 3 completa — lances e seleção de vencedor)  
**Commit convencional esperado:** `feat(shared): add purchase order zod schemas`

---

## Objetivo

Definir os schemas Zod de contrato de API para o domínio de Pedidos de Compra
(`PurchaseOrder`) em `packages/shared`. Esses schemas são a **única fonte de verdade**
para validação de request/response entre o backend (NestJS) e o frontend (Next.js).
As unidades 4.2 e 4.3 os importam diretamente.

---

## Decisão de Domínio: Geração de PO a partir de Lance Vencedor

O pedido de compra é gerado **a partir de um lance com status `SELECTED`** (vencedor
da cotação, selecionado na unidade 3.3). O COMPRADOR aciona explicitamente a geração
via `POST /v1/companies/:cnpj/purchase-orders` com `{ bidId }`. Não há geração
automática sem ação do usuário.

Implicações nos schemas:
- `createPurchaseOrderSchema` exige apenas `bidId` (uuid do lance vencedor) e
  opcionalmente `notes`.
- Não há formulário de criação manual de PO com itens — os itens são sempre copiados
  do lance e dos itens da cotação.
- `updatePurchaseOrderSchema` permite editar apenas `notes` (status DRAFT).
- O campo `items` em `purchaseOrderResponseSchema` é opcional (presente apenas no
  endpoint de detalhe, ausente na listagem).

---

## Decisão de Domínio: Requisito de Produto nos Itens

Para gerar um PO, **todos os itens da cotação associada ao lance devem ter um
`productId` vinculado** (campo `product_id NOT NULL` nos itens do pedido de compra).
Itens de cotação sem produto (`product_id IS NULL`) bloqueiam a geração — retorna
400 com mensagem descritiva. Esse requisito é validado no Service (4.2).

---

## Escopo

### In

- `packages/shared/src/schemas/purchase-order.ts` — criar
- `packages/shared/src/index.ts` — modificar (adicionar re-exports)
- Tipos derivados via `z.infer<typeof schema>` exportados do próprio arquivo de schema

### Out (não implementar nesta unidade)

- Módulo NestJS de purchase-orders (→ 4.2)
- UI de purchase-orders (→ 4.3)
- Schema de recebimento (→ Fase 5)
- Schemas de nota fiscal ou pagamento (→ Fase 6)

---

## Arquivos a Criar / Modificar

```
packages/shared/src/
  schemas/
    purchase-order.ts   ← criar
  index.ts              ← modificar (adicionar re-exports)
```

---

## Implementação Detalhada

### 1. `packages/shared/src/schemas/purchase-order.ts`

```typescript
import { z } from 'zod'
import { PurchaseOrderStatus } from '../enums'

// ─── Status values (para z.enum) ──────────────────────────────────────────────
// Não re-exportar PurchaseOrderStatus como type — já exportado por enums.ts
// Usar Object.values para garantir sincronismo com o enum canônico
export const purchaseOrderStatusValues = Object.values(PurchaseOrderStatus) as [
  PurchaseOrderStatus,
  ...PurchaseOrderStatus[],
]

// ─── Item de Pedido de Compra (response) ──────────────────────────────────────

export const purchaseOrderItemResponseSchema = z.object({
  id:               z.string().uuid(),
  purchaseOrderId:  z.string().uuid(),
  productId:        z.string().uuid(),
  productName:      z.string(),
  productCode:      z.string().nullable(),
  unit:             z.string(),          // unidade de medida do produto
  quantity:         z.string(),          // numeric do postgres.js
  unitPrice:        z.string(),          // numeric do postgres.js
  totalPrice:       z.string(),          // numeric do postgres.js
  receivedQuantity: z.string(),          // numeric — atualizado na Fase 5 (recebimento)
  createdAt:        z.string().datetime(),
  updatedAt:        z.string().datetime(),
})

export type PurchaseOrderItemResponse = z.infer<typeof purchaseOrderItemResponseSchema>

// ─── Pedido de Compra ─────────────────────────────────────────────────────────

export const createPurchaseOrderSchema = z.object({
  bidId: z.string().uuid('ID do lance inválido.'),
  notes: z.string().max(2000).optional(),
})

export type CreatePurchaseOrderDto = z.infer<typeof createPurchaseOrderSchema>

export const updatePurchaseOrderSchema = z.object({
  notes: z.string().max(2000).optional(),
})

export type UpdatePurchaseOrderDto = z.infer<typeof updatePurchaseOrderSchema>

export const purchaseOrderResponseSchema = z.object({
  id:              z.string().uuid(),
  companyId:       z.string().uuid(),
  supplierId:      z.string().uuid(),
  supplierName:    z.string(),
  quotationId:     z.string().uuid().nullable(),
  quotationNumber: z.string().nullable(),
  bidId:           z.string().uuid().nullable(),
  number:          z.string(),
  status:          z.enum(purchaseOrderStatusValues),
  totalAmount:     z.string(),          // numeric do postgres.js
  notes:           z.string().nullable(),
  approvedById:    z.string().nullable(),
  approvedAt:      z.string().datetime().nullable(),
  sentAt:          z.string().datetime().nullable(),
  createdById:     z.string(),
  createdAt:       z.string().datetime(),
  updatedAt:       z.string().datetime(),
  // Presente apenas no GET :id (detalhe); ausente na listagem
  items:           z.array(purchaseOrderItemResponseSchema).optional(),
  // Presente apenas na listagem (contagem de itens sem carregar o array)
  itemCount:       z.number().int().nonnegative().optional(),
})

export type PurchaseOrderResponse = z.infer<typeof purchaseOrderResponseSchema>
```

---

### 2. Modificar `packages/shared/src/index.ts`

Adicionar ao final do arquivo:

```typescript
export * from './schemas/purchase-order'
```

---

## Checklist de Verificação

```bash
# Build e type-check do pacote shared
pnpm --filter @elos/shared build
pnpm type-check   # todos os 3 workspaces

# Lint dos arquivos novos
pnpm --filter @elos/shared lint

# Confirmar com safeParse manual:
# 1. createPurchaseOrderSchema — bidId não-uuid deve falhar
# 2. createPurchaseOrderSchema — bidId uuid válido deve passar
# 3. purchaseOrderResponseSchema — totalAmount como string deve passar
# 4. purchaseOrderStatusValues — array contém os 5 valores do enum
```

### Casos de `safeParse` esperados

```typescript
import { createPurchaseOrderSchema, purchaseOrderStatusValues } from '@elos/shared'

// ✅ Deve passar
createPurchaseOrderSchema.safeParse({
  bidId: '550e8400-e29b-41d4-a716-446655440000',
}).success // true

// ❌ Deve falhar — bidId inválido
createPurchaseOrderSchema.safeParse({
  bidId: 'not-a-uuid',
}).success // false

// ✅ Status values corretos
console.log(purchaseOrderStatusValues)
// ['DRAFT', 'APPROVED', 'SENT', 'RECEIVED', 'CANCELLED']
```

---

## Observações

- `PurchaseOrderStatus` **não** é re-declarado neste arquivo — já é exportado por
  `enums.ts` (padrão estabelecido em 2.1 para `UnitOfMeasure`, 3.1 para
  `QuotationStatus`/`BidStatus`).
- `purchaseOrderStatusValues` usa `Object.values(PurchaseOrderStatus)` em vez de
  array literal hardcoded — garante sincronismo automático se o enum evoluir.
- Campos `numeric` do Drizzle/postgres.js chegam como `string` no JS; os schemas de
  response refletem isso (`z.string()` para `totalAmount`, `quantity`, `unitPrice`,
  `totalPrice`, `receivedQuantity`).
- `receivedQuantity` nos itens começa em `'0'` e é atualizado pelos recebimentos
  da Fase 5 — incluído aqui para que o frontend da Fase 5 possa exibir o progresso.
