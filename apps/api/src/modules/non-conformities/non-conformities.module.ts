import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { NonConformitiesController } from './non-conformities.controller'
import { NonConformitiesService } from './non-conformities.service'

@Module({
  imports: [AbilityModule],
  controllers: [NonConformitiesController],
  providers: [NonConformitiesService],
  exports: [NonConformitiesService],
})
export class NonConformitiesModule {}
