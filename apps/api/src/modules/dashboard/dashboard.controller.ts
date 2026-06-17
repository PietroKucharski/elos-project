import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import type { SessionUser } from '../../common/types/session-user'
import { DashboardService } from './dashboard.service'

@ApiTags('dashboard')
@ApiCookieAuth()
@Controller('companies/:cnpj/dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'KPIs e atividade recente do dashboard' })
  getDashboard(@CurrentUser() user: SessionUser) {
    return this.dashboardService.getDashboard(user)
  }
}
