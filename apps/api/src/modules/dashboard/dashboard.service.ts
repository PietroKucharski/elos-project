import { Inject, Injectable } from '@nestjs/common'
import { and, asc, count, desc, eq, gte, sql } from 'drizzle-orm'
import type { SessionUser } from '../../common/types/session-user'
import type { DrizzleDB } from '../../db'
import { DRIZZLE } from '../../db.module'
import { auditLogs } from '../../db/schema/audit-logs'
import { users } from '../../db/schema/auth'
import { invoices } from '../../db/schema/invoices'
import { nonConformities } from '../../db/schema/non-conformities'
import { payments } from '../../db/schema/payments'
import { products } from '../../db/schema/products'
import { purchaseOrders } from '../../db/schema/purchase-orders'
import { quotations } from '../../db/schema/quotations'
import { suppliers } from '../../db/schema/suppliers'
import { inventory } from '../../db/schema/warehouses'

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async getKpis(user: SessionUser) {
    const cid = user.companyId!

    // Queries paralelas para cada grupo de KPIs
    const [
      quotationsData,
      posData,
      invoicesData,
      paymentsData,
      lowStockData,
      ncsData,
      suppliersData,
      payableData,
      paidData,
    ] = await Promise.all([
      // Cotações
      this.db
        .select({ status: quotations.status, count: count() })
        .from(quotations)
        .where(eq(quotations.companyId, cid))
        .groupBy(quotations.status),

      // POs
      this.db
        .select({ status: purchaseOrders.status, count: count() })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.companyId, cid))
        .groupBy(purchaseOrders.status),

      // NFs
      this.db
        .select({ status: invoices.status, count: count() })
        .from(invoices)
        .where(eq(invoices.companyId, cid))
        .groupBy(invoices.status),

      // Pagamentos
      this.db
        .select({ status: payments.status, count: count() })
        .from(payments)
        .where(eq(payments.companyId, cid))
        .groupBy(payments.status),

      // Estoque baixo
      this.db
        .select({ count: count() })
        .from(inventory)
        .innerJoin(products, eq(products.id, inventory.productId))
        .where(
          and(
            eq(products.companyId, cid),
            sql`${inventory.quantity}::numeric < ${products.minStock}::numeric`,
            sql`${products.minStock} IS NOT NULL`,
          ),
        ),

      // NCs
      this.db
        .select({ status: nonConformities.status, count: count() })
        .from(nonConformities)
        .where(eq(nonConformities.companyId, cid))
        .groupBy(nonConformities.status),

      // Fornecedores
      this.db
        .select({ status: suppliers.status, count: count() })
        .from(suppliers)
        .where(eq(suppliers.companyId, cid))
        .groupBy(suppliers.status),

      // Total a pagar: NFs validadas SEM nenhum pagamento PAID. Agregado direto
      // sobre invoices (sem join com payments) para não multiplicar o valor da NF
      // quando ela tem mais de um pagamento.
      this.db
        .select({
          total: sql<string>`COALESCE(SUM(${invoices.totalAmount}::numeric), 0)::text`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, cid),
            eq(invoices.status, 'VALIDATED'),
            sql`NOT EXISTS (SELECT 1 FROM ${payments} WHERE ${payments.invoiceId} = ${invoices.id} AND ${payments.status} = 'PAID')`,
          ),
        ),

      // Total pago: soma dos pagamentos PAID, agregado direto sobre payments.
      this.db
        .select({
          total: sql<string>`COALESCE(SUM(${payments.totalAmount}::numeric), 0)::text`,
        })
        .from(payments)
        .where(and(eq(payments.companyId, cid), eq(payments.status, 'PAID'))),
    ])

    // Helper para extrair contagem por status
    const countByStatus = (data: { status: string; count: number }[], status: string) =>
      data.find((d) => d.status === status)?.count ?? 0

    return {
      kpis: {
        quotationsOpen: countByStatus(quotationsData, 'OPEN'),
        quotationsClosed: countByStatus(quotationsData, 'CLOSED'),
        purchaseOrdersDraft: countByStatus(posData, 'DRAFT'),
        purchaseOrdersApproved: countByStatus(posData, 'APPROVED'),
        purchaseOrdersSent: countByStatus(posData, 'SENT'),
        purchaseOrdersReceived: countByStatus(posData, 'RECEIVED'),
        invoicesPending: countByStatus(invoicesData, 'PENDING'),
        invoicesValidated: countByStatus(invoicesData, 'VALIDATED'),
        paymentsPending: countByStatus(paymentsData, 'PENDING'),
        paymentsPaid: countByStatus(paymentsData, 'PAID'),
        totalPayable: payableData[0]?.total ?? '0',
        totalPaid: paidData[0]?.total ?? '0',
        lowStockAlerts: lowStockData[0]?.count ?? 0,
        nonConformitiesOpen: countByStatus(ncsData, 'OPEN'),
        nonConformitiesAnalyzing: countByStatus(ncsData, 'ANALYZING'),
        suppliersPending: countByStatus(suppliersData, 'PENDING'),
        suppliersApproved: countByStatus(suppliersData, 'APPROVED'),
      },
    }
  }

  async getRecentActivity(user: SessionUser) {
    const logs = await this.db
      .select({
        id: auditLogs.id,
        entity: auditLogs.entity,
        action: auditLogs.action,
        userName: users.name,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(eq(auditLogs.companyId, user.companyId!))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10)

    return logs.map((log) => ({
      ...log,
      summary: this.buildSummary(log.entity, log.action, log.userName),
    }))
  }

  // Série dos últimos 6 meses de pedidos de compra emitidos (gráfico de área do
  // dashboard). Preenche meses sem pedidos com zero para a linha não ter buracos.
  async getChart(user: SessionUser) {
    const cid = user.companyId!
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const rows = await this.db
      .select({
        key: sql<string>`to_char(date_trunc('month', ${purchaseOrders.createdAt}), 'YYYY-MM')`,
        value: count(),
      })
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.companyId, cid), gte(purchaseOrders.createdAt, start)))
      .groupBy(sql`date_trunc('month', ${purchaseOrders.createdAt})`)

    const byKey = new Map(rows.map((r) => [r.key, Number(r.value)]))
    const labels = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]

    const series: { month: string; value: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      series.push({ month: labels[d.getMonth()]!, value: byKey.get(key) ?? 0 })
    }
    return series
  }

  // Cotações ativas (OPEN) ordenadas pelo prazo mais próximo, para o card
  // "Cotações próximas do prazo" do dashboard.
  async getDeadlines(user: SessionUser) {
    return this.db
      .select({
        id: quotations.id,
        number: quotations.number,
        title: quotations.title,
        deadline: quotations.deadline,
      })
      .from(quotations)
      .where(and(eq(quotations.companyId, user.companyId!), eq(quotations.status, 'OPEN')))
      .orderBy(asc(quotations.deadline))
      .limit(5)
  }

  async getDashboard(user: SessionUser) {
    const [kpisResult, recentActivity, chart, deadlines] = await Promise.all([
      this.getKpis(user),
      this.getRecentActivity(user),
      this.getChart(user),
      this.getDeadlines(user),
    ])

    return {
      kpis: kpisResult.kpis,
      recentActivity,
      chart,
      deadlines,
    }
  }

  private buildSummary(entity: string, action: string, userName: string | null): string {
    const user = userName ?? 'Sistema'
    const entityNames: Record<string, string> = {
      Company: 'Empresa',
      Supplier: 'Fornecedor',
      Product: 'Produto',
      Quotation: 'Cotação',
      Bid: 'Lance',
      PurchaseOrder: 'Pedido de Compra',
      Receipt: 'Recebimento',
      Invoice: 'Nota Fiscal',
      Payment: 'Pagamento',
      Warehouse: 'Armazém',
      NonConformity: 'Não-Conformidade',
      StockMovement: 'Movimentação de Estoque',
    }
    const actionNames: Record<string, string> = {
      CREATE: 'criou',
      UPDATE: 'atualizou',
      DELETE: 'removeu',
      APPROVE: 'aprovou',
      REJECT: 'rejeitou',
      PUBLISH: 'publicou',
      CLOSE: 'fechou',
      CANCEL: 'cancelou',
      SUBMIT: 'enviou',
      SEND: 'enviou',
      RECEIVE: 'recebeu',
      VALIDATE: 'validou',
      ANALYZE: 'analisou',
      RESOLVE: 'resolveu',
      PAY: 'pagou',
      COMPLETE: 'completou',
      DEACTIVATE: 'desativou',
      SELECT_WINNER: 'selecionou vencedor',
    }
    const e = entityNames[entity] ?? entity
    const a = actionNames[action] ?? action.toLowerCase()
    return `${user} ${a} ${e}`
  }
}
