import { z } from 'zod'
import { InvoiceStatus } from '../enums'

export const invoiceStatusValues = Object.values(InvoiceStatus) as [
  InvoiceStatus,
  ...InvoiceStatus[],
]

// ─── Invoice item ────────────────────────────────────────────────────────────

export const createInvoiceItemSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1).max(255),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
})

export const invoiceItemResponseSchema = z.object({
  id: z.string().uuid(),
  invoiceId: z.string().uuid(),
  productId: z.string().uuid().nullable(),
  productName: z.string().nullable(),
  description: z.string(),
  quantity: z.string(), // numeric do postgres.js
  unitPrice: z.string(),
  totalPrice: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// ─── Invoice ─────────────────────────────────────────────────────────────────

export const createInvoiceSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  supplierId: z.string().uuid(),
  number: z.string().min(1).max(100),
  issueDate: z.string().datetime(),
  totalAmount: z.number().positive(),
  taxAmount: z.number().nonnegative().optional(),
  fileUrl: z.string().url().optional(),
  items: z.array(createInvoiceItemSchema).optional(),
})

export const updateInvoiceSchema = z.object({
  number: z.string().min(1).max(100).optional(),
  issueDate: z.string().datetime().optional(),
  totalAmount: z.number().positive().optional(),
  taxAmount: z.number().nonnegative().optional(),
  fileUrl: z.string().url().optional(),
})

export const validateInvoiceSchema = z.object({
  notes: z.string().max(1000).optional(),
})

export const rejectInvoiceSchema = z.object({
  rejectionReason: z.string().min(5).max(2000),
})

export const invoiceResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  purchaseOrderId: z.string().uuid(),
  purchaseOrderNumber: z.string(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  number: z.string(),
  issueDate: z.string().datetime(),
  totalAmount: z.string(), // numeric do postgres.js
  taxAmount: z.string().nullable(),
  status: z.enum(invoiceStatusValues),
  fileUrl: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  validatedById: z.string().nullable(),
  validatedByName: z.string().nullable(),
  validatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(invoiceItemResponseSchema).optional(), // só no GET :id
  itemCount: z.number().optional(), // só na listagem
})

export type CreateInvoiceDto = z.infer<typeof createInvoiceSchema>
export type UpdateInvoiceDto = z.infer<typeof updateInvoiceSchema>
export type ValidateInvoiceDto = z.infer<typeof validateInvoiceSchema>
export type RejectInvoiceDto = z.infer<typeof rejectInvoiceSchema>
export type CreateInvoiceItemDto = z.infer<typeof createInvoiceItemSchema>
export type InvoiceResponse = z.infer<typeof invoiceResponseSchema>
export type InvoiceItemResponse = z.infer<typeof invoiceItemResponseSchema>
