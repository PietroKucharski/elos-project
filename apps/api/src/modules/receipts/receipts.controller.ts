import {
  type CreateReceiptDto,
  type CreateStockMovementDto,
  ReceiptStatus,
  StockMovementType,
  createReceiptSchema,
  createStockMovementSchema,
} from '@elos/shared'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { ReceiptsService } from './receipts.service'
import { StockMovementsService } from './stock-movements.service'

@ApiTags('receipts')
@ApiCookieAuth()
@Controller('companies/:cnpj')
@UseGuards(AuthGuard)
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly stockMovementsService: StockMovementsService,
  ) {}

  // ─── Receipts ─────────────────────────────────────────────────────────────

  @Get('receipts')
  @ApiOperation({ summary: 'Listar recebimentos' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('purchaseOrderId') purchaseOrderId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (status && !Object.values(ReceiptStatus).includes(status as ReceiptStatus)) {
      throw new BadRequestException(`Status de recebimento inválido: ${status}.`)
    }
    return this.receiptsService.findAll(user, {
      purchaseOrderId,
      warehouseId,
      status,
      page,
      limit,
    })
  }

  @Post('receipts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar recebimento de mercadoria' })
  @ApiResponse({ status: 201, description: 'Recebimento registrado.' })
  @ApiResponse({ status: 400, description: 'PO não está SENT ou quantidade excedida.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 404, description: 'PO ou armazém não encontrado.' })
  create(
    @Body(new ZodValidationPipe(createReceiptSchema)) body: CreateReceiptDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.receiptsService.create(body, user)
  }

  @Get('receipts/:id')
  @ApiOperation({ summary: 'Detalhe do recebimento com itens' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.receiptsService.findOne(id, user)
  }

  @Get('purchase-orders/:poId/receipts')
  @ApiOperation({ summary: 'Recebimentos de um Pedido de Compra' })
  findByPo(@Param('poId') poId: string, @CurrentUser() user: SessionUser) {
    return this.receiptsService.findAll(user, { purchaseOrderId: poId })
  }

  // ─── Stock Movements ──────────────────────────────────────────────────────

  @Get('stock-movements')
  @ApiOperation({ summary: 'Listar movimentações de estoque' })
  findMovements(
    @CurrentUser() user: SessionUser,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (type && !Object.values(StockMovementType).includes(type as StockMovementType)) {
      throw new BadRequestException(`Tipo de movimentação inválido: ${type}.`)
    }
    return this.stockMovementsService.findAll(user, {
      warehouseId,
      productId,
      type,
      page,
      limit,
    })
  }

  @Post('stock-movements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar movimentação manual de estoque' })
  @ApiResponse({ status: 201, description: 'Movimentação registrada.' })
  createMovement(
    @Body(new ZodValidationPipe(createStockMovementSchema)) body: CreateStockMovementDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.stockMovementsService.create(body, user)
  }
}
