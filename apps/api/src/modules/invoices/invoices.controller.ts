import {
  type CreateInvoiceDto,
  type CreateInvoiceItemDto,
  type RejectInvoiceDto,
  type UpdateInvoiceDto,
  type UploadInvoiceFileDto,
  type ValidateInvoiceDto,
  createInvoiceItemSchema,
  createInvoiceSchema,
  rejectInvoiceSchema,
  updateInvoiceSchema,
  uploadInvoiceFileSchema,
  validateInvoiceSchema,
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
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { InvoicesService } from './invoices.service'

@ApiTags('invoices')
@ApiCookieAuth()
@Controller('companies/:cnpj/invoices')
@UseGuards(AuthGuard)
export class InvoicesController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(InvoicesService) private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notas fiscais' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoicesService.findAll(user, {
      status,
      supplierId,
      purchaseOrderId,
      search,
      page,
      limit,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar nota fiscal' })
  @ApiResponse({ status: 201, description: 'NF criada.' })
  @ApiResponse({
    status: 400,
    description: 'PO não está SENT/RECEIVED ou fornecedor não APPROVED.',
  })
  create(
    @Body(new ZodValidationPipe(createInvoiceSchema)) body: CreateInvoiceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da NF com itens' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.invoicesService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar NF (apenas PENDING)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateInvoiceSchema)) body: UpdateInvoiceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.update(id, body, user)
  }

  @Post(':id/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar NF (PENDING → VALIDATED)' })
  validate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(validateInvoiceSchema)) body: ValidateInvoiceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.validate(id, body, user)
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rejeitar NF (PENDING → REJECTED)' })
  reject(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejectInvoiceSchema)) body: RejectInvoiceDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.reject(id, body, user)
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar item à NF (apenas PENDING)' })
  addItem(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(createInvoiceItemSchema)) body: CreateInvoiceItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.addItem(id, body, user)
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remover item da NF (apenas PENDING)' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.removeItem(id, itemId, user)
  }

  @Post(':id/upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload de arquivo PDF da NF' })
  @ApiResponse({ status: 400, description: 'fileUrl ausente ou inválido.' })
  uploadFile(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(uploadInvoiceFileSchema)) body: UploadInvoiceFileDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.invoicesService.uploadFile(id, body.fileUrl, user)
  }
}
