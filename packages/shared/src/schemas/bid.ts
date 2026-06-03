import { z } from 'zod'
import { BidStatus } from '../enums'

// ─── Bid ──────────────────────────────────────────────────────────────────────

// Fonte única de verdade: os valores derivam do enum canônico `BidStatus`
// (`../enums`), o mesmo usado pelo `bidStatusEnum` do banco — sem hard-code que
// possa divergir. O tipo `BidStatus` não é re-declarado aqui para evitar
// ambiguidade no barrel `index.ts`. Use `bidStatusValues` para validação via `z.enum`.
export const bidStatusValues = Object.values(BidStatus) as [BidStatus, ...BidStatus[]]

// COMPRADOR cria o lance em nome do fornecedor (portal de fornecedor fora do escopo v1)
export const createBidSchema = z.object({
  supplierId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
})

export type CreateBidDto = z.infer<typeof createBidSchema>

export const updateBidSchema = z.object({
  notes: z.string().max(2000).optional(),
})

export type UpdateBidDto = z.infer<typeof updateBidSchema>

export const bidResponseSchema = z.object({
  id: z.string().uuid(),
  quotationId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  companyId: z.string().uuid(),
  status: z.enum(bidStatusValues),
  notes: z.string().nullable(),
  submittedAt: z.string().datetime().nullable(),
  totalPrice: z.string().nullable(), // calculado pelo backend (soma dos itens)
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type BidResponse = z.infer<typeof bidResponseSchema>

// ─── Bid Item ─────────────────────────────────────────────────────────────────

export const createBidItemSchema = z.object({
  quotationItemId: z.string().uuid(),
  unitPrice: z.number().nonnegative({ message: 'Preço unitário não pode ser negativo.' }),
  deliveryDays: z.number().int().positive({ message: 'Prazo de entrega deve ser positivo.' }),
  notes: z.string().max(1000).optional(),
})

export type CreateBidItemDto = z.infer<typeof createBidItemSchema>

export const updateBidItemSchema = z.object({
  unitPrice: z.number().nonnegative().optional(),
  deliveryDays: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
})

export type UpdateBidItemDto = z.infer<typeof updateBidItemSchema>

export const bidItemResponseSchema = z.object({
  id: z.string().uuid(),
  bidId: z.string().uuid(),
  quotationItemId: z.string().uuid(),
  description: z.string(), // copiado do QuotationItem para exibição
  quantity: z.string(), // copiado do QuotationItem
  unit: z.string(), // copiado do QuotationItem
  unitPrice: z.string(), // numeric vem como string
  totalPrice: z.string(), // unitPrice * quantity, calculado pelo backend
  deliveryDays: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type BidItemResponse = z.infer<typeof bidItemResponseSchema>

// ─── Bid Comparison (resposta do endpoint GET /bids/compare) ─────────────────

// Uma célula da matrix: interseção de item × lance de fornecedor
export const bidComparisonCellSchema = z.object({
  bidItemId: z.string().uuid().nullable(), // null se o fornecedor não cotou este item
  unitPrice: z.string().nullable(),
  totalPrice: z.string().nullable(),
  deliveryDays: z.number().nullable(),
  notes: z.string().nullable(),
  isWinner: z.boolean(),
})

export type BidComparisonCell = z.infer<typeof bidComparisonCellSchema>

// Uma linha da matrix: item da cotação com os preços de cada fornecedor
export const bidComparisonRowSchema = z.object({
  quotationItemId: z.string().uuid(),
  description: z.string(),
  quantity: z.string(),
  unit: z.string(),
  bids: z.record(z.string().uuid(), bidComparisonCellSchema),
  // chave = bidId; frontend itera os bidIds em ordem para construir as colunas
})

export type BidComparisonRow = z.infer<typeof bidComparisonRowSchema>

// Resposta completa do comparativo
export const bidComparisonResponseSchema = z.object({
  quotationId: z.string().uuid(),
  bids: z.array(
    z.object({
      bidId: z.string().uuid(),
      supplierId: z.string().uuid(),
      supplierName: z.string(),
      status: z.enum(bidStatusValues),
      totalPrice: z.string().nullable(),
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
