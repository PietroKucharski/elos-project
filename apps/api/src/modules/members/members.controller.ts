import {
  type InviteMemberDto,
  type UpdateMemberRoleDto,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '@elos/shared'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AllowPlatformRoute } from '../../common/decorators/platform-route.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { MembersService } from './members.service'

@ApiTags('members')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  // Rota de plataforma — sem cnpj no path; depende apenas de session.user.id.
  // @AllowPlatformRoute() libera o opt-in no AuthGuard (fail-closed por padrão).
  @Get('me/companies')
  @AllowPlatformRoute()
  @ApiOperation({ summary: 'Listar empresas do usuário logado (para company switcher)' })
  @ApiResponse({ status: 200, description: 'Lista de empresas do usuário.' })
  getMyCompanies(@CurrentUser() user: SessionUser) {
    return this.membersService.getMyCompanies(user)
  }

  @Get('companies/:cnpj/members')
  @ApiOperation({ summary: 'Listar membros da empresa' })
  @ApiResponse({ status: 200, description: 'Lista de membros.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  findAll(@CurrentUser() user: SessionUser) {
    return this.membersService.findAll(user)
  }

  @Post('companies/:cnpj/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convidar novo membro' })
  @ApiResponse({ status: 201, description: 'Membro convidado.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 409, description: 'Usuário já é membro.' })
  invite(
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: InviteMemberDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.membersService.invite(body, user)
  }

  @Patch('companies/:cnpj/members/:userId')
  @ApiOperation({ summary: 'Atualizar papel do membro' })
  @ApiResponse({ status: 200, description: 'Papel atualizado.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou auto-alteração.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Membro não encontrado.' })
  updateRole(
    @Param('userId') targetUserId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema)) body: UpdateMemberRoleDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.membersService.updateRole(targetUserId, body, user)
  }

  @Delete('companies/:cnpj/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro da empresa' })
  @ApiResponse({ status: 204, description: 'Membro removido.' })
  @ApiResponse({ status: 400, description: 'Último ADMIN ou auto-remoção.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Membro não encontrado.' })
  remove(@Param('userId') targetUserId: string, @CurrentUser() user: SessionUser) {
    return this.membersService.remove(targetUserId, user)
  }
}
