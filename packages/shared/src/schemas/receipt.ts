import { z } from 'zod'

// ─── Receipt item ─────────────────────────────────────────────────────────────

export const createReceiptItemSchema = z.object({
  purchaseOrderItemId: z.string().uuid(),
  receivedQuantity: z.number().positive(),
  notes: z.string().max(500).optional(),
})

export const receiptItemResponseSchema = z.object({
  id: z.string().uuid(),
  receiptId: z.string().uuid(),
  purchaseOrderItemId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  productCode: z.string().nullable(),
  unit: z.string(),
  orderedQuantity: z.string(), // quantity do purchase_order_item (numeric)
  receivedQuantity: z.string(), // numeric do postgres.js
  totalReceived: z.string(), // acumulado até agora (antes + este recebimento)
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ─── Receipt ──────────────────────────────────────────────────────────────────

// v1: um recebimento registra os itens recebidos de um PO em um armazém.
// O sistema decide automaticamente se é PARTIAL ou COMPLETE com base nas
// quantidades recebidas vs. quantidades do PO.
export const createReceiptSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  receivedAt: z.string().datetime(), // ISO datetime informado pelo almoxarife
  notes: z.string().max(1000).optional(),
  items: z.array(createReceiptItemSchema).min(1),
})

export const receiptResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  purchaseOrderNumber: z.string(),
  warehouseId: z.string().uuid(),
  warehouseName: z.string(),
  receivedById: z.string(),
  status: z.enum(['PARTIAL', 'COMPLETE']),
  notes: z.string().nullable(),
  receivedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(receiptItemResponseSchema).optional(), // só no GET :id
})

export type CreateReceiptDto = z.infer<typeof createReceiptSchema>
export type CreateReceiptItemDto = z.infer<typeof createReceiptItemSchema>
export type ReceiptResponse = z.infer<typeof receiptResponseSchema>
export type ReceiptItemResponse = z.infer<typeof receiptItemResponseSchema>
