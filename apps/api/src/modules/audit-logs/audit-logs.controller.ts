import { type AuditLogQuery, auditLogQuerySchema } from '@elos/shared'
import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
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
    @Query(new ZodValidationPipe(auditLogQuerySchema)) query: AuditLogQuery,
  ) {
    return this.auditLogsService.findAll(user, query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do audit log' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: SessionUser) {
    return this.auditLogsService.findOne(id, user)
  }
}
