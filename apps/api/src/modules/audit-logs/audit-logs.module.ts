import { Module } from '@nestjs/common'
import { AbilityModule } from '../../common/ability/ability.module'
import { AuditLogsController } from './audit-logs.controller'
import { AuditLogsService } from './audit-logs.service'

@Module({
  imports: [AbilityModule],
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
