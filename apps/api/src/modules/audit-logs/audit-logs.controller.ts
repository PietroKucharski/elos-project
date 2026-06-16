import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import type { SessionUser } from '../../common/types/session-user'
import { AuditLogsService } from './audit-logs.service'

@ApiTags('audit-logs')
@ApiCookieAuth()
@Controller('companies/:cnpj/audit-logs')
@UseGuards(AuthGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  // Rotas sem parâmetros dinâmicos ANTES de :id
  @Get('entities')
  @ApiOperation({ summary: 'Listar entidades distintas' })
  getEntities(@CurrentUser() user: SessionUser) {
    return this.auditLogsService.getDistinctEntities(user)
  }

  @Get('actions')
  @ApiOperation({ summary: 'Listar ações distintas' })
  getActions(@CurrentUser() user: SessionUser) {
    return this.auditLogsService.getDistinctActions(user)
  }

  @Get()
  @ApiOperation({ summary: 'Listar audit logs' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogsService.findAll(user, {
      entity,
      entityId,
      action,
      userId,
      startDate,
      endDate,
      page,
      limit,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do audit log' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.auditLogsService.findOne(id, user)
  }
}
