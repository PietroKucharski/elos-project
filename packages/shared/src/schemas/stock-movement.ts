import { z } from 'zod'
import { StockMovementType } from '../enums'

export const stockMovementTypeValues = Object.values(StockMovementType) as [
  StockMovementType,
  ...StockMovementType[],
]

// Movimentações manuais criadas pelo ALMOXARIFE (entrada, saída, transferência)
// As movimentações geradas automaticamente pelo recebimento não passam por este schema.
export const createStockMovementSchema = z.object({
  warehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  type: z.enum(stockMovementTypeValues),
  quantity: z.number().positive(),
  // Para transferências: armazém de destino
  toWarehouseId: z.string().uuid().optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

export const stockMovementResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  warehouseName: z.string(),
  productId: z.string().uuid(),
  productName: z.string(),
  productCode: z.string().nullable(),
  unit: z.string(),
  type: z.enum(stockMovementTypeValues),
  quantity: z.string(), // numeric do postgres.js
  referenceType: z.string().nullable(),
  referenceId: z.string().nullable(),
  notes: z.string().nullable(),
  createdById: z.string(),
  createdByName: z.string(),
  createdAt: z.string().datetime(),
})

export type CreateStockMovementDto = z.infer<typeof createStockMovementSchema>
export type StockMovementResponse = z.infer<typeof stockMovementResponseSchema>
