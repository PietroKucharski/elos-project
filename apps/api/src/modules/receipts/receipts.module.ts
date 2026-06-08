import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { PurchaseOrdersModule } from '../purchase-orders/purchase-orders.module'
import { ReceiptsController } from './receipts.controller'
import { ReceiptsService } from './receipts.service'
import { StockMovementsService } from './stock-movements.service'

@Module({
  imports: [AbilityModule, PurchaseOrdersModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, StockMovementsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
