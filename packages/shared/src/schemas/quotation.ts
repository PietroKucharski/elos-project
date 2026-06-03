import { z } from 'zod'

// ─── Quotation ────────────────────────────────────────────────────────────────

export const quotationStatusValues = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'] as const
// O tipo `QuotationStatus` já é exportado por `../enums` (mesmos valores);
// não o re-declaramos aqui para evitar ambiguidade no barrel `index.ts`.

export const createQuotationSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(2000).optional(),
  deadline: z.string().datetime({ message: 'Prazo deve ser uma data ISO válida.' }),
  paymentTerms: z.string().max(500).optional(),
})

export type CreateQuotationDto = z.infer<typeof createQuotationSchema>

export const updateQuotationSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().max(2000).optional(),
  deadline: z.string().datetime().optional(),
  paymentTerms: z.string().max(500).optional(),
})

export type UpdateQuotationDto = z.infer<typeof updateQuotationSchema>

export const quotationResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  number: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  deadline: z.string().datetime(),
  paymentTerms: z.string().nullable(),
  status: z.enum(quotationStatusValues),
  createdBy: z.string().uuid(),
  itemCount: z.number().optional(), // presente na lista, ausente no detalhe
  bidCount: z.number().optional(), // presente na lista, ausente no detalhe
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type QuotationResponse = z.infer<typeof quotationResponseSchema>

// ─── Quotation Item ───────────────────────────────────────────────────────────

export const createQuotationItemSchema = z.object({
  productId: z.string().uuid().optional(), // vínculo opcional ao catálogo
  description: z.string().min(2).max(500), // obrigatório mesmo com productId
  quantity: z.number().positive({ message: 'Quantidade deve ser positiva.' }),
  unit: z.string().min(1).max(20), // espelha unitOfMeasure, mas livre para
  // itens sem produto no catálogo
  notes: z.string().max(1000).optional(),
})

export type CreateQuotationItemDto = z.infer<typeof createQuotationItemSchema>

export const updateQuotationItemSchema = createQuotationItemSchema.partial()

export type UpdateQuotationItemDto = z.infer<typeof updateQuotationItemSchema>

export const quotationItemResponseSchema = z.object({
  id: z.string().uuid(),
  quotationId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  description: z.string(),
  quantity: z.string(), // numeric vem como string no postgres.js
  unit: z.string(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  id: z.string().uuid(),
  quotationId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  status: z.enum(quotationSupplierStatusValues),
  invitedAt: z.string().datetime(),
})

export type QuotationSupplierResponse = z.infer<typeof quotationSupplierResponseSchema>
