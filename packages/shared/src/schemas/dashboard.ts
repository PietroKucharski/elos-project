import { z } from 'zod'

// Schemas de resposta para os KPIs do dashboard.
// O backend calcula; o frontend exibe.

export const dashboardKpisSchema = z.object({
  // Cotações
  quotationsOpen: z.number().int().nonnegative(),
  quotationsClosed: z.number().int().nonnegative(),

  // Pedidos de Compra
  purchaseOrdersDraft: z.number().int().nonnegative(),
  purchaseOrdersApproved: z.number().int().nonnegative(),
  purchaseOrdersSent: z.number().int().nonnegative(),
  purchaseOrdersReceived: z.number().int().nonnegative(),

  // Financeiro
  invoicesPending: z.number().int().nonnegative(),
  invoicesValidated: z.number().int().nonnegative(),
  paymentsPending: z.number().int().nonnegative(),
  paymentsPaid: z.number().int().nonnegative(),
  totalPayable: z.string(), // numeric → string (total a pagar em NFs validadas sem pagamento PAID)
  totalPaid: z.string(), // numeric → string (total pago em pagamentos PAID)

  // Estoque
  lowStockAlerts: z.number().int().nonnegative(), // produtos com quantity < minStock

  // NCs
  nonConformitiesOpen: z.number().int().nonnegative(),
  nonConformitiesAnalyzing: z.number().int().nonnegative(),

  // Fornecedores
  suppliersPending: z.number().int().nonnegative(),
  suppliersApproved: z.number().int().nonnegative(),
})

export const dashboardRecentActivitySchema = z.object({
  id: z.string().uuid(),
  entity: z.string(),
  action: z.string(),
  userName: z.string().nullable(),
  createdAt: z.string().datetime(),
  summary: z.string(), // frase curta descrevendo a ação (montada pelo backend)
})

export const dashboardResponseSchema = z.object({
  kpis: dashboardKpisSchema,
  recentActivity: z.array(dashboardRecentActivitySchema),
})

export type DashboardKpis = z.infer<typeof dashboardKpisSchema>
export type DashboardRecentActivity = z.infer<typeof dashboardRecentActivitySchema>
export type DashboardResponse = z.infer<typeof dashboardResponseSchema>
