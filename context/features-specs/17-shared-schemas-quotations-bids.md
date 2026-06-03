# Feature Spec — 3.1 Shared Schemas: Cotações e Lances

> **Antes de qualquer coisa:** leia o arquivo `CLAUDE.md` na raiz do repositório.
> Ele define sua persona, as invariantes inegociáveis e a ordem de leitura dos
> context files que você deve seguir antes de implementar.

**Fase:** 3 — Cotações e Lances  
**Unidade:** 3.1  
**Pré-requisito:** 2.5 concluído (Fase 2 completa)  
**Commit convencional esperado:** `feat(shared): add quotation and bid zod schemas`

---

## Objetivo

Definir os schemas Zod de contrato de API para os domínios de Cotações (`Quotation`)
e Lances (`Bid`) em `packages/shared`. Esses schemas são a **única fonte de verdade**
para validação de request/response entre o backend (NestJS) e o frontend (Next.js).
As unidades 3.2–3.5 os importam diretamente.

---

## Decisão de Domínio: Lances sem Portal de Fornecedor (v1)

A open question do `progress-tracker.md` ("Fornecedores submetem lances diretamente
no sistema ou via e-mail/link externo?") foi resolvida para v1:

> **Lances são registrados pelo COMPRADOR no sistema, em nome do fornecedor.**
> O portal de autoatendimento do fornecedor está explicitamente fora do escopo v1.

Implicações nos schemas:
- `CreateBidDto` inclui `supplierId` (fornecedor para quem o lance pertence).
- `BidResponse` inclui `supplierName` para exibição no comparativo.
- Não há schema de "submissão pelo fornecedor" nesta versão.

---

## Escopo

### In

- `packages/shared/src/schemas/quotation.ts` — schemas de cotação, itens e
  fornecedores convidados
- `packages/shared/src/schemas/bid.ts` — schemas de lance, itens de lance e
  seleção de vencedor
- `packages/shared/src/index.ts` — re-exportar os novos schemas
- Tipos derivados via `z.infer<typeof schema>` (exportados pelos próprios arquivos
  de schema, seguindo o padrão de `company.ts`, `supplier.ts` e `product.ts`)

### Out (não implementar nesta unidade)

- Módulos NestJS de quotations/bids (→ 3.2 e 3.3)
- UI de quotations/bids (→ 3.4 e 3.5)
- Schema de purchase-order gerado a partir do vencedor (→ Fase 4)

---

## Arquivos a Criar / Modificar

```
packages/shared/src/
  schemas/
    quotation.ts     ← criar
    bid.ts           ← criar
  index.ts           ← modificar (adicionar re-exports)
```

---

## Implementação Detalhada

### 1. `packages/shared/src/schemas/quotation.ts`

```typescript
import { z } from 'zod'

// ─── Quotation ────────────────────────────────────────────────────────────────

export const quotationStatusValues = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'] as const
export type QuotationStatus = (typeof quotationStatusValues)[number]

export const createQuotationSchema = z.object({
  title:        z.string().min(3).max(255),
  description:  z.string().max(2000).optional(),
  deadline:     z.string().datetime({ message: 'Prazo deve ser uma data ISO válida.' }),
  paymentTerms: z.string().max(500).optional(),
})

export type CreateQuotationDto = z.infer<typeof createQuotationSchema>

export const updateQuotationSchema = z.object({
  title:        z.string().min(3).max(255).optional(),
  description:  z.string().max(2000).optional(),
  deadline:     z.string().datetime().optional(),
  paymentTerms: z.string().max(500).optional(),
})

export type UpdateQuotationDto = z.infer<typeof updateQuotationSchema>

export const quotationResponseSchema = z.object({
  id:           z.string().uuid(),
  companyId:    z.string().uuid(),
  number:       z.string(),
  title:        z.string(),
  description:  z.string().nullable(),
  deadline:     z.string().datetime(),
  paymentTerms: z.string().nullable(),
  status:       z.enum(quotationStatusValues),
  createdBy:    z.string().uuid(),
  itemCount:    z.number().optional(),    // presente na lista, ausente no detalhe
  bidCount:     z.number().optional(),    // presente na lista, ausente no detalhe
  createdAt:    z.string().datetime(),
  updatedAt:    z.string().datetime(),
})

export type QuotationResponse = z.infer<typeof quotationResponseSchema>

// ─── Quotation Item ───────────────────────────────────────────────────────────

export const createQuotationItemSchema = z.object({
  productId:   z.string().uuid().optional(),   // vínculo opcional ao catálogo
  description: z.string().min(2).max(500),     // obrigatório mesmo com productId
  quantity:    z.number().positive({ message: 'Quantidade deve ser positiva.' }),
  unit:        z.string().min(1).max(20),      // espelha unitOfMeasure, mas livre para
                                                // itens sem produto no catálogo
  notes:       z.string().max(1000).optional(),
})

export type CreateQuotationItemDto = z.infer<typeof createQuotationItemSchema>

export const updateQuotationItemSchema = createQuotationItemSchema.partial()

export type UpdateQuotationItemDto = z.infer<typeof updateQuotationItemSchema>

export const quotationItemResponseSchema = z.object({
  id:          z.string().uuid(),
  quotationId: z.string().uuid(),
  productId:   z.string().uuid().nullable(),
  description: z.string(),
  quantity:    z.string(),   // numeric vem como string no postgres.js
  unit:        z.string(),
  notes:       z.string().nullable(),
  createdAt:   z.string().datetime(),
  updatedAt:   z.string().datetime(),
})

export type QuotationItemResponse = z.infer<typeof quotationItemResponseSchema>

// ─── Quotation Supplier (convite) ─────────────────────────────────────────────

export const quotationSupplierStatusValues = ['INVITED', 'RESPONDED', 'DECLINED'] as const
export type QuotationSupplierStatus = (typeof quotationSupplierStatusValues)[number]

export const inviteSupplierToQuotationSchema = z.object({
  supplierId: z.string().uuid(),
})

export type InviteSupplierToQuotationDto = z.infer<typeof inviteSupplierToQuotationSchema>

export const quotationSupplierResponseSchema = z.object({
  id:           z.string().uuid(),
  quotationId:  z.string().uuid(),
  supplierId:   z.string().uuid(),
  supplierName: z.string(),
  status:       z.enum(quotationSupplierStatusValues),
  invitedAt:    z.string().datetime(),
})

export type QuotationSupplierResponse = z.infer<typeof quotationSupplierResponseSchema>
```

---

### 2. `packages/shared/src/schemas/bid.ts`

```typescript
import { z } from 'zod'

// ─── Bid ──────────────────────────────────────────────────────────────────────

export const bidStatusValues = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED'] as const
export type BidStatus = (typeof bidStatusValues)[number]

// COMPRADOR cria o lance em nome do fornecedor (portal de fornecedor fora do escopo v1)
export const createBidSchema = z.object({
  supplierId: z.string().uuid(),
  notes:      z.string().max(2000).optional(),
})

export type CreateBidDto = z.infer<typeof createBidSchema>

export const updateBidSchema = z.object({
  notes: z.string().max(2000).optional(),
})

export type UpdateBidDto = z.infer<typeof updateBidSchema>

export const bidResponseSchema = z.object({
  id:           z.string().uuid(),
  quotationId:  z.string().uuid(),
  supplierId:   z.string().uuid(),
  supplierName: z.string(),
  companyId:    z.string().uuid(),
  status:       z.enum(bidStatusValues),
  notes:        z.string().nullable(),
  submittedAt:  z.string().datetime().nullable(),
  totalPrice:   z.string().nullable(),  // calculado pelo backend (soma dos itens)
  createdAt:    z.string().datetime(),
  updatedAt:    z.string().datetime(),
})

export type BidResponse = z.infer<typeof bidResponseSchema>

// ─── Bid Item ─────────────────────────────────────────────────────────────────

export const createBidItemSchema = z.object({
  quotationItemId: z.string().uuid(),
  unitPrice:       z.number().nonnegative({ message: 'Preço unitário não pode ser negativo.' }),
  deliveryDays:    z.number().int().positive({ message: 'Prazo de entrega deve ser positivo.' }),
  notes:           z.string().max(1000).optional(),
})

export type CreateBidItemDto = z.infer<typeof createBidItemSchema>

export const updateBidItemSchema = z.object({
  unitPrice:    z.number().nonnegative().optional(),
  deliveryDays: z.number().int().positive().optional(),
  notes:        z.string().max(1000).optional(),
})

export type UpdateBidItemDto = z.infer<typeof updateBidItemSchema>

export const bidItemResponseSchema = z.object({
  id:              z.string().uuid(),
  bidId:           z.string().uuid(),
  quotationItemId: z.string().uuid(),
  description:     z.string(),   // copiado do QuotationItem para exibição
  quantity:        z.string(),   // copiado do QuotationItem
  unit:            z.string(),   // copiado do QuotationItem
  unitPrice:       z.string(),   // numeric vem como string
  totalPrice:      z.string(),   // unitPrice * quantity, calculado pelo backend
  deliveryDays:    z.number(),
  notes:           z.string().nullable(),
  createdAt:       z.string().datetime(),
  updatedAt:       z.string().datetime(),
})

export type BidItemResponse = z.infer<typeof bidItemResponseSchema>

// ─── Bid Comparison (resposta do endpoint GET /bids/compare) ─────────────────

// Uma célula da matrix: interseção de item × lance de fornecedor
export const bidComparisonCellSchema = z.object({
  bidItemId:    z.string().uuid().nullable(),  // null se o fornecedor não cotou este item
  unitPrice:    z.string().nullable(),
  totalPrice:   z.string().nullable(),
  deliveryDays: z.number().nullable(),
  notes:        z.string().nullable(),
  isWinner:     z.boolean(),
})

export type BidComparisonCell = z.infer<typeof bidComparisonCellSchema>

// Uma linha da matrix: item da cotação com os preços de cada fornecedor
export const bidComparisonRowSchema = z.object({
  quotationItemId: z.string().uuid(),
  description:     z.string(),
  quantity:        z.string(),
  unit:            z.string(),
  bids:            z.record(z.string().uuid(), bidComparisonCellSchema),
  // chave = bidId; frontend itera os bidIds em ordem para construir as colunas
})

export type BidComparisonRow = z.infer<typeof bidComparisonRowSchema>

// Resposta completa do comparativo
export const bidComparisonResponseSchema = z.object({
  quotationId: z.string().uuid(),
  bids: z.array(
    z.object({
      bidId:        z.string().uuid(),
      supplierId:   z.string().uuid(),
      supplierName: z.string(),
      status:       z.enum(['DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED'] as const),
      totalPrice:   z.string().nullable(),
    }),
  ),
  rows: z.array(bidComparisonRowSchema),
})

export type BidComparisonResponse = z.infer<typeof bidComparisonResponseSchema>

// ─── Winner Selection ─────────────────────────────────────────────────────────

// v1: seleciona um único lance vencedor para toda a cotação
// (seleção por item é considerada complexidade futura — ver Open Questions)
export const selectWinnerSchema = z.object({
  bidId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
})

export type SelectWinnerDto = z.infer<typeof selectWinnerSchema>
```

---

### 3. Atualizar `packages/shared/src/index.ts`

Adicionar os dois novos re-exports ao barrel existente:

```typescript
export * from './schemas/quotation'
export * from './schemas/bid'
```

---

## Notas de Implementação

**`deadline` como string ISO datetime** — O frontend envia a data como ISO 8601
string (ex: `"2024-12-31T23:59:59.000Z"`). O Service converte para `Date` antes
de inserir via Drizzle. O response converte `Date` para string via `.toISOString()`.

**`quantity` e `unitPrice` como string no response** — O Drizzle/postgres.js retorna
colunas `numeric` como `string` para preservar precisão decimal. O frontend converte
via `parseFloat()` quando precisar exibir ou operar numericamente.

**`totalPrice` calculado pelo backend** — O backend calcula `unitPrice × quantity`
no Service (ao criar/atualizar um `BidItem`) e retorna no response. Não é persistido
separadamente — recalculado em cada resposta via SQL (`SUM(unit_price * quantity)`
no `BidResponse`).

**Comparativo via `z.record`** — O `bidComparisonRowSchema` usa `z.record(uuid, cell)`
para mapear cada `bidId` à sua célula. O frontend ordena os `bidIds` pelos que
aparecem no array `bids` (mesmo índice do cabeçalho da tabela).

**Seleção de vencedor v1: por lance (não por item)** — A spec `project-overview.md`
menciona suporte a seleção por item, mas a open question "Múltiplos vencedores por
cotação" ainda está em aberto. Para v1, o `selectWinnerSchema` aceita um único
`bidId`. A seleção por item pode ser adicionada na v2 sem breaking change no schema
(adicionar campo `itemWinners?: Record<uuid, uuid>` opcionalmente).

**`unit` livre no QuotationItem** — Itens de cotação podem referenciar produtos do
catálogo (`productId` opcional) ou descrever um item ad-hoc. Para itens ad-hoc, a
unidade é texto livre (não vinculado ao enum `unitOfMeasureValues`). O Service preenche
`description` e `unit` automaticamente do produto quando `productId` é informado,
mas permite sobrescrita.

---

## Verificação

- [ ] `pnpm --filter @elos/shared build` — zero erros TypeScript
- [ ] `pnpm type-check` verde nos 3 workspaces
- [ ] `pnpm lint` limpo
- [ ] `createQuotationSchema.safeParse({ title: 'Ab', deadline: 'não-é-data' })` falha
- [ ] `createQuotationSchema.safeParse({ title: 'Cotação Q1', deadline: '2024-12-31T23:59:59.000Z' })` passa
- [ ] `createBidSchema.safeParse({ supplierId: 'não-é-uuid' })` falha
- [ ] `createBidItemSchema.safeParse({ quotationItemId: 'uuid-ok', unitPrice: -1, deliveryDays: 5 })` falha (preço negativo)
- [ ] `selectWinnerSchema.safeParse({ bidId: '123e4567-e89b-12d3-a456-426614174000' })` passa
