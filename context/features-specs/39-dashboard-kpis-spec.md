# Feature Spec — 7.4 Dashboard KPIs (API + UI)

**Fase:** 7 — Audit Log e Administração  
**Unidade:** 7.4  
**Pré-requisito:** 7.3 concluído; 6.5 concluído (todos os módulos financeiros funcionais)  
**Commit convencional esperado:** `feat: add dashboard with role-based kpis and recent activity`

---

## Objetivo

Substituir o placeholder do dashboard (`[cnpj]/dashboard/page.tsx` de 1.4) por
um dashboard real com KPIs por papel e atividade recente derivada do audit log.
O endpoint de backend calcula os KPIs via queries agregadas; o frontend exibe
cards com os números relevantes para cada papel.

---

## Decisões de Negócio

| Regra | Comportamento |
| ----- | ------------- |
| KPIs por papel | Cada papel vê KPIs diferentes (ver tabela abaixo) |
| Atividade recente | Últimos 10 registros de audit log da empresa, com frase descritiva |
| Período | KPIs refletem o estado atual (não filtrados por período na v1) |
| Refresh | Recarregamento server-side a cada navegação (sem polling/WebSocket na v1) |

### KPIs por Papel

| Papel | KPIs visíveis |
| ----- | ------------- |
| SUPER_ADMIN | Todos os KPIs |
| ADMIN_EMPRESA | Todos os KPIs |
| COMPRADOR | Cotações (open/closed), POs (draft/approved/sent), Fornecedores (pending/approved) |
| ALMOXARIFE | POs (sent/received), Estoque (low stock alerts), NCs (open/analyzing) |
| ANALISTA_FINANCEIRO | NFs (pending/validated), Pagamentos (pending/paid), Total a pagar/pago |
| TRANSPORTADOR | POs (sent) |

---

## Escopo

### In

**Backend:**
- `apps/api/src/modules/dashboard/dashboard.module.ts`
- `apps/api/src/modules/dashboard/dashboard.controller.ts`
- `apps/api/src/modules/dashboard/dashboard.controller.spec.ts`
- `apps/api/src/modules/dashboard/dashboard.service.ts`
- `apps/api/src/modules/dashboard/dashboard.service.spec.ts`
- Modificação em `apps/api/src/app.module.ts` — importar `DashboardModule`

**Frontend:**
- Substituir `(app)/[cnpj]/dashboard/page.tsx`
- `components/domain/dashboard-kpi-card.tsx`
- `components/domain/dashboard-recent-activity.tsx`

### Out

- Gráficos/charts (fora do escopo v1; apenas números em cards)
- Filtro por período
- Refresh automático (polling/WebSocket)

---

## Rotas (API)

| Método | Caminho | Papel mínimo | Descrição |
| ------ | ------- | ------------ | --------- |
| GET | `/v1/companies/:cnpj/dashboard` | Autenticado | KPIs + atividade recente |

Todos os papéis podem acessar o dashboard; o backend retorna **todos** os KPIs,
e o frontend filtra conforme o papel do usuário (o backend não precisa conhecer
quais cards cada papel vê — essa é lógica de UI).

---

## Implementação Detalhada

### 1. `dashboard.service.ts`

```typescript
import {
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common'
import { and, count, desc, eq, lt, sql } from 'drizzle-orm'
import { DRIZZLE } from '../../db.module'
import type { DrizzleDB } from '../../db'
import type { SessionUser } from '../../common/types/session-user'
import { auditLogs } from '../../db/schema/audit-logs'
import { users } from '../../db/schema/auth'
import { invoices } from '../../db/schema/invoices'
import { inventory } from '../../db/schema/warehouses'
import { nonConformities } from '../../db/schema/non-conformities'
import { payments } from '../../db/schema/payments'
import { products } from '../../db/schema/products'
import { purchaseOrders } from '../../db/schema/purchase-orders'
import { quotations } from '../../db/schema/quotations'
import { suppliers } from '../../db/schema/suppliers'

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE) private db: DrizzleDB,
  ) {}

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
      financialData,
    ] = await Promise.all([
      // Cotações
      this.db
        .select({
          status: quotations.status,
          count: count(),
        })
        .from(quotations)
        .where(eq(quotations.companyId, cid))
        .groupBy(quotations.status),

      // POs
      this.db
        .select({
          status: purchaseOrders.status,
          count: count(),
        })
        .from(purchaseOrders)
        .where(eq(purchaseOrders.companyId, cid))
        .groupBy(purchaseOrders.status),

      // NFs
      this.db
        .select({
          status: invoices.status,
          count: count(),
        })
        .from(invoices)
        .where(eq(invoices.companyId, cid))
        .groupBy(invoices.status),

      // Pagamentos
      this.db
        .select({
          status: payments.status,
          count: count(),
        })
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
        .select({
          status: nonConformities.status,
          count: count(),
        })
        .from(nonConformities)
        .where(eq(nonConformities.companyId, cid))
        .groupBy(nonConformities.status),

      // Fornecedores
      this.db
        .select({
          status: suppliers.status,
          count: count(),
        })
        .from(suppliers)
        .where(eq(suppliers.companyId, cid))
        .groupBy(suppliers.status),

      // Total a pagar (NFs validadas sem pagamento PAID) e total pago
      this.db
        .select({
          totalPayable: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.status} = 'VALIDATED' THEN ${invoices.totalAmount}::numeric ELSE 0 END), 0)::text`,
          totalPaid: sql<string>`COALESCE(SUM(CASE WHEN ${payments.status} = 'PAID' THEN ${payments.totalAmount}::numeric ELSE 0 END), 0)::text`,
        })
        .from(invoices)
        .leftJoin(payments, eq(payments.invoiceId, invoices.id))
        .where(eq(invoices.companyId, cid)),
    ])

    // Helper para extrair contagem por status
    const countByStatus = (data: { status: string; count: number }[], status: string) =>
      data.find((d) => d.status === status)?.count ?? 0

    return {
      kpis: {
        quotationsOpen:          countByStatus(quotationsData, 'OPEN'),
        quotationsClosed:        countByStatus(quotationsData, 'CLOSED'),
        purchaseOrdersDraft:     countByStatus(posData, 'DRAFT'),
        purchaseOrdersApproved:  countByStatus(posData, 'APPROVED'),
        purchaseOrdersSent:      countByStatus(posData, 'SENT'),
        purchaseOrdersReceived:  countByStatus(posData, 'RECEIVED'),
        invoicesPending:         countByStatus(invoicesData, 'PENDING'),
        invoicesValidated:       countByStatus(invoicesData, 'VALIDATED'),
        paymentsPending:         countByStatus(paymentsData, 'PENDING'),
        paymentsPaid:            countByStatus(paymentsData, 'PAID'),
        totalPayable:            financialData[0]?.totalPayable ?? '0',
        totalPaid:               financialData[0]?.totalPaid ?? '0',
        lowStockAlerts:          lowStockData[0]?.count ?? 0,
        nonConformitiesOpen:     countByStatus(ncsData, 'OPEN'),
        nonConformitiesAnalyzing: countByStatus(ncsData, 'ANALYZING'),
        suppliersPending:        countByStatus(suppliersData, 'PENDING'),
        suppliersApproved:       countByStatus(suppliersData, 'APPROVED'),
      },
    }
  }

  async getRecentActivity(user: SessionUser) {
    const logs = await this.db
      .select({
        id:        auditLogs.id,
        entity:    auditLogs.entity,
        action:    auditLogs.action,
        userName:  users.name,
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

  async getDashboard(user: SessionUser) {
    const [kpisResult, recentActivity] = await Promise.all([
      this.getKpis(user),
      this.getRecentActivity(user),
    ])

    return {
      kpis: kpisResult.kpis,
      recentActivity,
    }
  }

  private buildSummary(entity: string, action: string, userName: string | null): string {
    const user = userName ?? 'Sistema'
    const entityNames: Record<string, string> = {
      Company: 'Empresa', Supplier: 'Fornecedor', Product: 'Produto',
      Quotation: 'Cotação', Bid: 'Lance', PurchaseOrder: 'Pedido de Compra',
      Receipt: 'Recebimento', Invoice: 'Nota Fiscal', Payment: 'Pagamento',
      Warehouse: 'Armazém', NonConformity: 'Não-Conformidade',
      StockMovement: 'Movimentação de Estoque',
    }
    const actionNames: Record<string, string> = {
      CREATE: 'criou', UPDATE: 'atualizou', DELETE: 'removeu',
      APPROVE: 'aprovou', REJECT: 'rejeitou', PUBLISH: 'publicou',
      CLOSE: 'fechou', CANCEL: 'cancelou', SUBMIT: 'enviou',
      SEND: 'enviou', RECEIVE: 'recebeu', VALIDATE: 'validou',
      ANALYZE: 'analisou', RESOLVE: 'resolveu', PAY: 'pagou',
      COMPLETE: 'completou', DEACTIVATE: 'desativou',
      SELECT_WINNER: 'selecionou vencedor',
    }
    const e = entityNames[entity] ?? entity
    const a = actionNames[action] ?? action.toLowerCase()
    return `${user} ${a} ${e}`
  }
}
```

---

### 2. `dashboard.controller.ts`

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthGuard } from '../../common/guards/auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { SessionUser } from '../../common/types/session-user'
import { DashboardService } from './dashboard.service'

@ApiTags('dashboard')
@ApiCookieAuth()
@Controller('companies/:cnpj/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'KPIs e atividade recente do dashboard' })
  getDashboard(@CurrentUser() user: SessionUser) {
    return this.dashboardService.getDashboard(user)
  }
}
```

---

### 3. `dashboard.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  controllers: [DashboardController],
  providers:   [DashboardService],
})
export class DashboardModule {}
```

---

### 4. Frontend — `[cnpj]/dashboard/page.tsx`

Substituir o placeholder de 1.4 por:

```tsx
// Server Component
// 1. Buscar dashboard data via getServerSession + fetch
// 2. Obter role via membership (getMyCompaniesServer)
// 3. Renderizar grid de KPI cards filtrados por papel
// 4. Renderizar lista de atividade recente
```

### `dashboard-kpi-card.tsx`

Componente de card de KPI:
- Ícone (lucide-react) à esquerda
- Título descritivo (ex: "Cotações Abertas")
- Número grande centralizado
- Cor de fundo semântica (success para positivo, warning para alertas, etc.)
- Link para a página relevante (ex: click em "POs Enviados" → `/purchase-orders?status=SENT`)

### `dashboard-recent-activity.tsx`

Lista simples:
- Cada item: avatar do usuário + frase descritiva + timestamp relativo
- Máximo 10 itens
- Link para audit log no rodapé (se ADMIN_EMPRESA)

### Layout por papel

O grid de cards usa CSS grid responsivo. As colunas e a disposição são as
mesmas para todos os papéis — os cards simplesmente não renderizam se o
KPI não se aplica ao papel do usuário.

---

### 5. Testes

**Service spec (~5 testes):**
- `getDashboard`: retorna kpis e recentActivity; kpis contém todos os campos; recentActivity tem max 10 itens
- `buildSummary`: gera frase correta; trata entidade desconhecida
- Queries escopadas a companyId

**Controller spec (~1 teste):**
- GET / — retorna dashboard

---

## API Functions em `lib/api.ts`

**Server-side:**
- `getDashboardServer(cnpj)` — GET `/dashboard`

---

## Checklist de Verificação

```bash
# Testes
pnpm vitest run   # espera ≥ 285 testes

# TypeScript
pnpm type-check

# Build
pnpm --filter web build

# Manual
# [ ] COMPRADOR vê KPIs de cotações, POs, fornecedores (não vê financeiro)
# [ ] ALMOXARIFE vê KPIs de POs, estoque, NCs
# [ ] ANALISTA_FINANCEIRO vê KPIs de NFs, pagamentos, totais
# [ ] ADMIN_EMPRESA vê todos os KPIs
# [ ] Atividade recente mostra últimas 10 ações
# [ ] Cards linkam para as páginas relevantes
# [ ] Dashboard substitui o placeholder de 1.4
```

---

## Decisões Arquiteturais desta Unidade

| Decisão | Motivo |
| ------- | ------ |
| Backend retorna todos os KPIs, frontend filtra por papel | Simplifica o backend (um endpoint, uma query); o frontend já tem o papel via membership. Evita duplicar lógica de permissão no backend |
| Queries paralelas via `Promise.all` | 8 queries independentes executadas em paralelo são mais rápidas que 8 sequenciais; cada query é simples (COUNT + GROUP BY) |
| `buildSummary` no backend | O frontend recebe frases prontas em português; não precisa interpretar entity+action. Centraliza a tradução |
| Sem AbilityModule | O dashboard é acessível a todos os papéis autenticados (todos veem o dashboard, mas com cards diferentes); a checagem CASL seria redundante |
| Sem gráficos na v1 | Cards com números são suficientes para v1; gráficos (recharts/chart.js) ficam para v2 |
| `totalPayable` com LEFT JOIN em invoices + payments | Calcula NFs validadas e soma pagamentos PAID em uma query; evita N+1 |
