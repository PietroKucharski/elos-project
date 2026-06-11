import { z } from 'zod'

// Schemas de resposta para os KPIs do dashboard.
// O backend calcula; o frontend exibe.

export const dashboardKpisSchema = z.object({
  // Cotações
  quotationsOpen: z.number(),
  quotationsClosed: z.number(),

  // Pedidos de Compra
  purchaseOrdersDraft: z.number(),
  purchaseOrdersApproved: z.number(),
  purchaseOrdersSent: z.number(),
  purchaseOrdersReceived: z.number(),

  // Financeiro
  invoicesPending: z.number(),
  invoicesValidated: z.number(),
  paymentsPending: z.number(),
  paymentsPaid: z.number(),
  totalPayable: z.string(), // numeric → string (total a pagar em NFs validadas sem pagamento PAID)
  totalPaid: z.string(), // numeric → string (total pago em pagamentos PAID)

  // Estoque
  lowStockAlerts: z.number(), // produtos com quantity < minStock

  // NCs
  nonConformitiesOpen: z.number(),
  nonConformitiesAnalyzing: z.number(),

  // Fornecedores
  suppliersPending: z.number(),
  suppliersApproved: z.number(),
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
