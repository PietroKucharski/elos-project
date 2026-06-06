import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { WarehousesController } from './warehouses.controller'
import { WarehousesService } from './warehouses.service'

@Module({
  imports: [AbilityModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService], // usado pelo ReceiptsService (Fase 5.3)
})
export class WarehousesModule {}
