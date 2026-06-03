import { z } from 'zod'

// Valores válidos de unidade de medida — espelham o `unitOfMeasureEnum` do banco
export const unitOfMeasureValues = [
  'UN',
  'KG',
  'G',
  'L',
  'ML',
  'M',
  'M2',
  'M3',
  'CX',
  'PC',
] as const
// O tipo `UnitOfMeasure` já é exportado por `../enums` (mesmos valores);
// não o re-declaramos aqui para evitar ambiguidade no barrel `index.ts`.

// ─── Product ─────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  unit: z.enum(unitOfMeasureValues),
  minStock: z.number().nonnegative().optional(),
  isActive: z.boolean().default(true),
})

export type CreateProductDto = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial()

export type UpdateProductDto = z.infer<typeof updateProductSchema>

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  unit: z.enum(unitOfMeasureValues),
  minStock: z.string().nullable(), // numeric vem como string
  isActive: z.boolean(),
  suppliers: z
    .array(
      z.object({
        id: z.string().uuid(),
        supplierId: z.string().uuid(),
        supplierName: z.string(),
        isPreferred: z.boolean(),
        notes: z.string().nullable(),
      }),
    )
    .optional(), // presente apenas no GET :id
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type ProductResponse = z.infer<typeof productResponseSchema>

// ─── Product ↔ Supplier link ─────────────────────────────────────────────────

export const linkProductSupplierSchema = z.object({
  supplierId: z.string().uuid(),
  isPreferred: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
})

export type LinkProductSupplierDto = z.infer<typeof linkProductSupplierSchema>

export const updateProductSupplierSchema = z.object({
  isPreferred: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
})

export type UpdateProductSupplierDto = z.infer<typeof updateProductSupplierSchema>

export const productSupplierResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  isPreferred: z.boolean(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type ProductSupplierResponse = z.infer<typeof productSupplierResponseSchema>
