import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { InvoicesController } from './invoices.controller'
import { InvoicesService } from './invoices.service'

@Module({
  imports: [AbilityModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
