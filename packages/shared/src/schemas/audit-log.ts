import { z } from 'zod'

// O audit log é read-only — não há schema de criação (o insert é feito
// internamente pelos Services). Apenas schemas de consulta e resposta.

export const auditLogQuerySchema = z.object({
  entity: z.string().max(100).optional(),
  entityId: z.string().uuid().optional(),
  action: z.string().max(50).optional(),
  userId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
})

export const auditLogResponseSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid().nullable(),
  userId: z.string().nullable(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  entity: z.string(),
  entityId: z.string().uuid(),
  action: z.string(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string().nullable(),
  createdAt: z.string().datetime(),
})

// ─── Entities/Actions para filtros de dropdown no frontend ──────────────────

export const auditLogEntities = [
  'Company',
  'CompanyMember',
  'Supplier',
  'SupplierContact',
  'SupplierBankAccount',
  'Product',
  'ProductSupplier',
  'Quotation',
  'QuotationItem',
  'QuotationSupplier',
  'Bid',
  'BidItem',
  'PurchaseOrder',
  'Receipt',
  'StockMovement',
  'Warehouse',
  'NonConformity',
  'Invoice',
  'InvoiceItem',
  'Payment',
  'PaymentInstallment',
] as const

export const auditLogActions = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'DEACTIVATE',
  'APPROVE',
  'REJECT',
  'PUBLISH',
  'CLOSE',
  'CANCEL',
  'SUBMIT',
  'SELECT_WINNER',
  'SEND',
  'RECEIVE',
  'ANALYZE',
  'RESOLVE',
  'VALIDATE',
  'PAY',
  'COMPLETE',
] as const

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>
export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>
