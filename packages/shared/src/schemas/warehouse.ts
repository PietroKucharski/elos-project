import { z } from 'zod'

// ─── Warehouse ────────────────────────────────────────────────────────────────

export const createWarehouseSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().max(50).optional(),
  location: z.string().max(500).optional(),
})

export const updateWarehouseSchema = createWarehouseSchema.partial()

export const warehouseResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  location: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ─── Inventory (saldo por produto/armazém) ────────────────────────────────────

export const inventoryResponseSchema = z.object({
  id: z.string().uuid(),
  warehouseId: z.string().uuid(),
  warehouseName: z.string(),
  productId: z.string().uuid(),
  productName: z.string(),
  productCode: z.string().nullable(),
  unit: z.string(),
  quantity: z.string(), // numeric do postgres.js
  minStock: z.string().nullable(),
  updatedAt: z.string().datetime(),
})

export type CreateWarehouseDto = z.infer<typeof createWarehouseSchema>
export type UpdateWarehouseDto = z.infer<typeof updateWarehouseSchema>
export type WarehouseResponse = z.infer<typeof warehouseResponseSchema>
export type InventoryResponse = z.infer<typeof inventoryResponseSchema>
