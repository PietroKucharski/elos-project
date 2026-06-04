import { z } from 'zod'
import { PurchaseOrderStatus } from '../enums'

// ─── Status values (para z.enum) ──────────────────────────────────────────────
// Não re-exportar PurchaseOrderStatus como type — já exportado por enums.ts.
// Usar Object.values para garantir sincronismo com o enum canônico.
export const purchaseOrderStatusValues = Object.values(PurchaseOrderStatus) as [
  PurchaseOrderStatus,
  ...PurchaseOrderStatus[],
]

// ─── Item de Pedido de Compra (response) ──────────────────────────────────────

export const purchaseOrderItemResponseSchema = z.object({
  id: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productCode: z.string().nullable(),
  unit: z.string(), // unidade de medida do produto
  quantity: z.string(), // numeric do postgres.js
  unitPrice: z.string(), // numeric do postgres.js
  totalPrice: z.string(), // numeric do postgres.js
  receivedQuantity: z.string(), // numeric — atualizado na Fase 5 (recebimento)
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  quotationId: z.string().uuid().nullable(),
  quotationNumber: z.string().nullable(),
  bidId: z.string().uuid().nullable(),
  number: z.string(),
  status: z.enum(purchaseOrderStatusValues),
  totalAmount: z.string(), // numeric do postgres.js
  notes: z.string().nullable(),
  approvedById: z.string().nullable(),
  approvedAt: z.string().datetime().nullable(),
  sentAt: z.string().datetime().nullable(),
  createdById: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Presente apenas no GET :id (detalhe); ausente na listagem
  items: z.array(purchaseOrderItemResponseSchema).optional(),
  // Presente apenas na listagem (contagem de itens sem carregar o array)
  itemCount: z.number().int().nonnegative().optional(),
})

export type PurchaseOrderResponse = z.infer<typeof purchaseOrderResponseSchema>
