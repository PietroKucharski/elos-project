import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { AbilityModule } from './common/ability/ability.module'
import { AuthGuard } from './common/guards/auth.guard'
import { DrizzleModule } from './db.module'
import { AuthModule } from './modules/auth/auth.module'
import { BidsModule } from './modules/bids/bids.module'
import { CompaniesModule } from './modules/companies/companies.module'
import { HealthModule } from './modules/health/health.module'
import { MembersModule } from './modules/members/members.module'
import { ProductsModule } from './modules/products/products.module'
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module'
import { QuotationsModule } from './modules/quotations/quotations.module'
import { SuppliersModule } from './modules/suppliers/suppliers.module'
import { WarehousesModule } from './modules/warehouses/warehouses.module'

@Module({
  imports: [
    // Rate limiting global: 100 req/min por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Infraestrutura — ambos @Global, disponíveis em todo o app
    DrizzleModule,
    AbilityModule,

    // Módulos de feature
    AuthModule,
    HealthModule,
    CompaniesModule,
    MembersModule,
    SuppliersModule,
    ProductsModule,
    QuotationsModule,
    BidsModule,
    PurchaseOrdersModule,
    WarehousesModule,
    // Fases 1–7: módulos de domínio adicionados aqui
  ],
  providers: [
    // AuthGuard aplicado globalmente — @Public() exclui rotas específicas
    { provide: APP_GUARD, useClass: AuthGuard },
    // ThrottlerGuard aplica rate limiting a todas as rotas
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
