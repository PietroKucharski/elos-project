import {
  type CreateQuotationDto,
  type CreateQuotationItemDto,
  type InviteSupplierToQuotationDto,
  type UpdateQuotationDto,
  type UpdateQuotationItemDto,
  createQuotationItemSchema,
  createQuotationSchema,
  inviteSupplierToQuotationSchema,
  updateQuotationItemSchema,
  updateQuotationSchema,
} from '@elos/shared'
import {
  Body,
  Controller,
  Delete,
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
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { QuotationsService } from './quotations.service'

@ApiTags('quotations')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies/:cnpj/quotations')
export class QuotationsController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(QuotationsService) private readonly quotationsService: QuotationsService) {}

  // ─── Quotations ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar cotações' })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.quotationsService.findAll(user, {
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar cotação (status DRAFT)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  create(
    @Body(new ZodValidationPipe(createQuotationSchema)) body: CreateQuotationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da cotação' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cotação (apenas DRAFT)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateQuotationSchema)) body: UpdateQuotationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.update(id, body, user)
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publicar cotação (DRAFT → OPEN)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT ou faltam itens/fornecedores.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  publish(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.publish(id, user)
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Fechar cotação (OPEN → CLOSED)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é OPEN.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  close(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.close(id, user)
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar cotação (DRAFT/OPEN → CANCELLED)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT nem OPEN.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  cancel(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.cancel(id, user)
  }

  // ─── Quotation Items ────────────────────────────────────────────────────────

  @Get(':id/items')
  @ApiOperation({ summary: 'Listar itens da cotação' })
  findItems(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.findItems(id, user)
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar item (apenas DRAFT)' })
  addItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createQuotationItemSchema)) body: CreateQuotationItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.addItem(id, body, user)
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Atualizar item (apenas DRAFT)' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateQuotationItemSchema)) body: UpdateQuotationItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.updateItem(id, itemId, body, user)
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item (apenas DRAFT)' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.removeItem(id, itemId, user)
  }

  // ─── Invited Suppliers ──────────────────────────────────────────────────────

  @Get(':id/suppliers')
  @ApiOperation({ summary: 'Listar fornecedores convidados' })
  findInvitedSuppliers(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.quotationsService.findInvitedSuppliers(id, user)
  }

  @Post(':id/suppliers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convidar fornecedor (apenas DRAFT, fornecedor APPROVED)' })
  inviteSupplier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inviteSupplierToQuotationSchema))
    body: InviteSupplierToQuotationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.inviteSupplier(id, body, user)
  }

  @Delete(':id/suppliers/:supplierId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover convite (apenas DRAFT)' })
  removeInvite(
    @Param('id') id: string,
    @Param('supplierId') supplierId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.quotationsService.removeInvite(id, supplierId, user)
  }
}
