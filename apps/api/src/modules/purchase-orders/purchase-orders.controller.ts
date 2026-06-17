import {
  type CreatePurchaseOrderDto,
  type UpdatePurchaseOrderDto,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
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
import { PurchaseOrdersService } from './purchase-orders.service'

@ApiTags('purchase-orders')
@ApiCookieAuth()
@Controller('companies/:cnpj/purchase-orders')
@UseGuards(AuthGuard)
export class PurchaseOrdersController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(
    @Inject(PurchaseOrdersService) private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos de compra' })
  @ApiResponse({ status: 200, description: 'Lista de pedidos de compra.' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('supplierId') supplierId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseOrdersService.findAll(user, {
      status,
      search,
      supplierId,
      page,
      limit,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Gerar pedido de compra a partir de lance vencedor' })
  @ApiResponse({ status: 201, description: 'Pedido de compra gerado.' })
  @ApiResponse({ status: 400, description: 'Lance inválido ou itens sem produto.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'Lance não encontrado.' })
  @ApiResponse({ status: 409, description: 'Já existe PO para este lance.' })
  create(
    @Body(new ZodValidationPipe(createPurchaseOrderSchema)) body: CreatePurchaseOrderDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.purchaseOrdersService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do pedido de compra com itens' })
  @ApiResponse({ status: 200, description: 'Pedido de compra com itens.' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado.' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar notas do pedido (apenas DRAFT)' })
  @ApiResponse({ status: 200, description: 'Pedido atualizado.' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePurchaseOrderSchema)) body: UpdatePurchaseOrderDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.purchaseOrdersService.update(id, body, user)
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Aprovar pedido (DRAFT → APPROVED)' })
  @ApiResponse({ status: 200, description: 'Pedido aprovado.' })
  approve(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.approve(id, user)
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enviar pedido ao fornecedor (APPROVED → SENT)' })
  @ApiResponse({ status: 200, description: 'Pedido enviado.' })
  send(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.send(id, user)
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pedido (DRAFT/APPROVED → CANCELLED)' })
  @ApiResponse({ status: 200, description: 'Pedido cancelado.' })
  cancel(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.cancel(id, user)
  }

  @Post(':id/receive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar pedido como recebido (SENT → RECEIVED)' })
  @ApiResponse({ status: 200, description: 'Pedido marcado como recebido.' })
  receive(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.purchaseOrdersService.receive(id, user)
  }
}
