import {
  type CreateCompanyDto,
  type UpdateCompanyDto,
  createCompanySchema,
  updateCompanySchema,
} from '@elos/shared'
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { CompaniesService } from './companies.service'

@ApiTags('companies')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies')
export class CompaniesController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(CompaniesService) private readonly companiesService: CompaniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar empresa (SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Empresa criada.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado.' })
  create(
    @Body(new ZodValidationPipe(createCompanySchema)) body: CreateCompanyDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.companiesService.create(body, user)
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as empresas (SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Lista de empresas.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  findAll(@CurrentUser() user: SessionUser) {
    return this.companiesService.findAll(user)
  }

  @Get(':cnpj')
  @ApiOperation({ summary: 'Buscar empresa por CNPJ' })
  @ApiResponse({ status: 200, description: 'Dados da empresa.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada.' })
  findOne(@Param('cnpj') cnpj: string, @CurrentUser() user: SessionUser) {
    return this.companiesService.findByCnpj(cnpj, user)
  }

  @Patch(':cnpj')
  @ApiOperation({ summary: 'Atualizar empresa (ADMIN_EMPRESA)' })
  @ApiResponse({ status: 200, description: 'Empresa atualizada.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada.' })
  update(
    @Param('cnpj') cnpj: string,
    @Body(new ZodValidationPipe(updateCompanySchema)) body: UpdateCompanyDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.companiesService.update(cnpj, body, user)
  }
}
