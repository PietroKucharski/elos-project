import {
  type AddNcCommentDto,
  type AnalyzeNcDto,
  type CreateNonConformityDto,
  type RejectNcDto,
  type ResolveNcDto,
  type UpdateNonConformityDto,
  addNcCommentSchema,
  analyzeNcSchema,
  createNonConformitySchema,
  rejectNcSchema,
  resolveNcSchema,
  updateNonConformitySchema,
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
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { NonConformitiesService } from './non-conformities.service'

@ApiTags('non-conformities')
@ApiCookieAuth()
@Controller('companies/:cnpj/non-conformities')
@UseGuards(AuthGuard)
export class NonConformitiesController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(NonConformitiesService) private readonly ncService: NonConformitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar não-conformidades' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('supplierId') supplierId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ncService.findAll(user, {
      status,
      type,
      severity,
      supplierId,
      purchaseOrderId,
      search,
      page,
      limit,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Abrir não-conformidade' })
  @ApiResponse({ status: 201, description: 'NC aberta.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Fornecedor ou PO não encontrado.' })
  create(
    @Body(new ZodValidationPipe(createNonConformitySchema)) body: CreateNonConformityDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da NC com comentários' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.ncService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar NC (apenas OPEN)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateNonConformitySchema)) body: UpdateNonConformityDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.update(id, body, user)
  }

  @Post(':id/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar análise da NC (OPEN → ANALYZING)' })
  analyze(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(analyzeNcSchema)) body: AnalyzeNcDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.analyze(id, body, user)
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolver NC (ANALYZING → RESOLVED)' })
  @ApiResponse({ status: 400, description: 'NC não está em ANALYZING.' })
  resolve(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(resolveNcSchema)) body: ResolveNcDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.resolve(id, body, user)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeitar NC (ANALYZING → REJECTED)' })
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectNcSchema)) body: RejectNcDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.reject(id, body, user)
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar comentário à NC' })
  addComment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addNcCommentSchema)) body: AddNcCommentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.ncService.addComment(id, body, user)
  }
}
