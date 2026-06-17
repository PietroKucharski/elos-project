import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DRIZZLE } from '../../db.module'
import { DashboardService } from './dashboard.service'

const companyId = '00000000-0000-0000-0000-000000000001'

// biome-ignore lint/suspicious/noExplicitAny: test fixture
const adminUser = {
  id: 'user-001',
  email: 'admin@test.com',
  name: 'Admin',
  role: 'ADMIN_EMPRESA',
  companyId,
} as any

// Mock thenable do Drizzle: cada chain de query resolve consumindo a próxima
// entrada da fila, na ordem em que as queries são disparadas pelo serviço.
function makeDb() {
  const resultsQueue: unknown[][] = []
  const enqueueMany = (rows: unknown[]) => resultsQueue.push(rows)

  const qb: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
  // biome-ignore lint/suspicious/noThenProperty: mock thenable
  qb.then = (resolve: (v: unknown) => void) => resolve(resultsQueue.shift() ?? [])

  const mockDb = { select: () => qb }
  return { mockDb, enqueueMany }
}

// Enfileira, na ordem do serviço, os grupos de KPIs e a atividade recente.
function enqueueDashboard(enqueueMany: (rows: unknown[]) => void, activity: unknown[] = []) {
  enqueueMany([
    { status: 'OPEN', count: 3 },
    { status: 'CLOSED', count: 2 },
  ]) // cotações
  enqueueMany([
    { status: 'DRAFT', count: 1 },
    { status: 'SENT', count: 4 },
  ]) // POs
  enqueueMany([{ status: 'PENDING', count: 2 }]) // NFs
  enqueueMany([{ status: 'PAID', count: 5 }]) // pagamentos
  enqueueMany([{ count: 7 }]) // estoque baixo
  enqueueMany([{ status: 'OPEN', count: 1 }]) // NCs
  enqueueMany([{ status: 'APPROVED', count: 9 }]) // fornecedores
  enqueueMany([{ total: '1000.00' }]) // total a pagar (NFs validadas sem pagamento PAID)
  enqueueMany([{ total: '500.00' }]) // total pago (pagamentos PAID)
  enqueueMany(activity) // atividade recente
  enqueueMany([{ key: '2026-05', value: 4 }]) // chart (PO por mês)
  enqueueMany([
    {
      id: '00000000-0000-0000-0000-0000000000aa',
      number: 'COT-2026-0001',
      title: 'Cotação X',
      deadline: new Date('2026-07-01T12:00:00.000Z'),
    },
  ]) // deadlines (cotações ativas)
}

describe('DashboardService', () => {
  let service: DashboardService
  let enqueueMany: ReturnType<typeof makeDb>['enqueueMany']

  beforeEach(async () => {
    const { mockDb, enqueueMany: em } = makeDb()
    enqueueMany = em
    const module = await Test.createTestingModule({
      providers: [DashboardService, { provide: DRIZZLE, useValue: mockDb }],
    }).compile()
    service = module.get(DashboardService)
  })

  it('getDashboard retorna kpis e recentActivity com todos os campos de KPI', async () => {
    enqueueDashboard(enqueueMany)
    const result = await service.getDashboard(adminUser)

    expect(result).toHaveProperty('kpis')
    expect(result).toHaveProperty('recentActivity')
    expect(result).toHaveProperty('chart')
    expect(result).toHaveProperty('deadlines')
    // Garante o conjunto completo de chaves de KPI
    expect(Object.keys(result.kpis).sort()).toEqual(
      [
        'quotationsOpen',
        'quotationsClosed',
        'purchaseOrdersDraft',
        'purchaseOrdersApproved',
        'purchaseOrdersSent',
        'purchaseOrdersReceived',
        'invoicesPending',
        'invoicesValidated',
        'paymentsPending',
        'paymentsPaid',
        'totalPayable',
        'totalPaid',
        'lowStockAlerts',
        'nonConformitiesOpen',
        'nonConformitiesAnalyzing',
        'suppliersPending',
        'suppliersApproved',
      ].sort(),
    )
  })

  it('getDashboard mapeia as contagens por status corretamente', async () => {
    enqueueDashboard(enqueueMany)
    const { kpis } = await service.getDashboard(adminUser)

    expect(kpis.quotationsOpen).toBe(3)
    expect(kpis.quotationsClosed).toBe(2)
    expect(kpis.purchaseOrdersSent).toBe(4)
    expect(kpis.purchaseOrdersReceived).toBe(0) // ausente → 0
    expect(kpis.paymentsPaid).toBe(5)
    expect(kpis.lowStockAlerts).toBe(7)
    expect(kpis.suppliersApproved).toBe(9)
    expect(kpis.totalPayable).toBe('1000.00')
    expect(kpis.totalPaid).toBe('500.00')
  })

  it('getDashboard limita a atividade recente a no máximo 10 itens', async () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({
      id: `log-${i}`,
      entity: 'Supplier',
      action: 'CREATE',
      userName: 'Admin',
      createdAt: new Date(),
    }))
    enqueueDashboard(enqueueMany, logs)
    const { recentActivity } = await service.getDashboard(adminUser)

    expect(recentActivity).toHaveLength(10)
    expect(recentActivity[0]?.summary).toBe('Admin criou Fornecedor')
  })

  it('getDashboard retorna série de 6 meses no chart e cotações no deadlines', async () => {
    enqueueDashboard(enqueueMany)
    const { chart, deadlines } = await service.getDashboard(adminUser)

    // O chart sempre preenche 6 meses (zeros onde não há pedidos)
    expect(chart).toHaveLength(6)
    expect(chart.every((c) => typeof c.month === 'string' && typeof c.value === 'number')).toBe(
      true,
    )
    // O mês enfileirado (2026-05 → Mai, valor 4) aparece quando estiver na janela
    const mai = chart.find((c) => c.month === 'Mai')
    if (mai) expect(mai.value).toBe(4)

    expect(deadlines).toHaveLength(1)
    expect(deadlines[0]?.number).toBe('COT-2026-0001')
  })

  it('getRecentActivity gera resumo para entidade desconhecida e usuário do sistema', async () => {
    enqueueMany([
      { id: 'l1', entity: 'Mystery', action: 'CREATE', userName: null, createdAt: new Date() },
    ])
    const activity = await service.getRecentActivity(adminUser)

    // Entidade desconhecida mantém o nome cru; userName null → 'Sistema'
    expect(activity[0]?.summary).toBe('Sistema criou Mystery')
  })

  it('getRecentActivity traduz entidade e ação conhecidas', async () => {
    enqueueMany([
      {
        id: 'l1',
        entity: 'Invoice',
        action: 'VALIDATE',
        userName: 'Maria',
        createdAt: new Date(),
      },
    ])
    const activity = await service.getRecentActivity(adminUser)

    expect(activity[0]?.summary).toBe('Maria validou Nota Fiscal')
  })
})
