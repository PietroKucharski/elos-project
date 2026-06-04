import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { PurchaseOrdersController } from './purchase-orders.controller'
import { PurchaseOrdersService } from './purchase-orders.service'

@Module({
  imports: [AbilityModule],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService], // exportado para uso pelo ReceiptsModule (Fase 5)
})
export class PurchaseOrdersModule {}
