import {
  type ApproveSupplierDto,
  type CreateSupplierBankAccountDto,
  type CreateSupplierContactDto,
  type CreateSupplierDto,
  type RejectSupplierDto,
  type UpdateSupplierBankAccountDto,
  type UpdateSupplierContactDto,
  type UpdateSupplierDto,
  approveSupplierSchema,
  createSupplierBankAccountSchema,
  createSupplierContactSchema,
  createSupplierSchema,
  rejectSupplierSchema,
  updateSupplierBankAccountSchema,
  updateSupplierContactSchema,
  updateSupplierSchema,
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
import { SuppliersService } from './suppliers.service'

@ApiTags('suppliers')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies/:cnpj/suppliers')
export class SuppliersController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(SuppliersService) private readonly suppliersService: SuppliersService) {}

  // ─── Suppliers ─────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar fornecedores' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
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
    return this.suppliersService.findAll(user, {
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar fornecedor' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 409 })
  create(
    @Body(new ZodValidationPipe(createSupplierSchema)) body: CreateSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do fornecedor (com endereço)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateSupplierSchema)) body: UpdateSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.update(id, body, user)
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprovar fornecedor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é PENDING.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  approve(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(approveSupplierSchema)) body: ApproveSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.approve(id, body, user)
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rejeitar fornecedor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é PENDING ou motivo ausente.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectSupplierSchema)) body: RejectSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.reject(id, body, user)
  }

  // ─── Sub-recursos (abas do detalhe) ──────────────────────────────────────────

  @Get(':id/products')
  @ApiOperation({ summary: 'Produtos fornecidos por este fornecedor' })
  findProducts(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findProducts(id, user)
  }

  @Get(':id/purchase-orders')
  @ApiOperation({ summary: 'Pedidos de compra emitidos para este fornecedor' })
  findPurchaseOrders(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findPurchaseOrders(id, user)
  }

  @Get(':id/evaluations')
  @ApiOperation({ summary: 'Histórico de avaliações (aprovações/rejeições)' })
  findEvaluations(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findEvaluations(id, user)
  }

  // ─── Contacts ──────────────────────────────────────────────────────────────

  @Get(':id/contacts')
  @ApiOperation({ summary: 'Listar contatos do fornecedor' })
  findContacts(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findContacts(id, user)
  }

  @Post(':id/contacts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar contato' })
  addContact(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createSupplierContactSchema)) body: CreateSupplierContactDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.addContact(id, body, user)
  }

  @Patch(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Atualizar contato' })
  updateContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body(new ZodValidationPipe(updateSupplierContactSchema)) body: UpdateSupplierContactDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.updateContact(id, contactId, body, user)
  }

  @Delete(':id/contacts/:contactId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover contato' })
  removeContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.removeContact(id, contactId, user)
  }

  // ─── Bank Accounts ─────────────────────────────────────────────────────────

  @Get(':id/bank-accounts')
  @ApiOperation({ summary: 'Listar contas bancárias do fornecedor' })
  findBankAccounts(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.suppliersService.findBankAccounts(id, user)
  }

  @Post(':id/bank-accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar conta bancária' })
  addBankAccount(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createSupplierBankAccountSchema))
    body: CreateSupplierBankAccountDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.addBankAccount(id, body, user)
  }

  @Patch(':id/bank-accounts/:accountId')
  @ApiOperation({ summary: 'Atualizar conta bancária' })
  updateBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @Body(new ZodValidationPipe(updateSupplierBankAccountSchema))
    body: UpdateSupplierBankAccountDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.updateBankAccount(id, accountId, body, user)
  }

  @Delete(':id/bank-accounts/:accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover conta bancária' })
  removeBankAccount(
    @Param('id') id: string,
    @Param('accountId') accountId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.suppliersService.removeBankAccount(id, accountId, user)
  }
}
