import {
  type CreatePaymentDto,
  type PayInstallmentDto,
  type UpdatePaymentDto,
  createPaymentSchema,
  payInstallmentSchema,
  updatePaymentSchema,
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
import { PaymentsService } from './payments.service'

@ApiTags('payments')
@ApiCookieAuth()
@Controller('companies/:cnpj/payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pagamentos' })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findAll(user, {
      status,
      method,
      invoiceId,
      search,
      page,
      limit,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar pagamento com parcelas' })
  @ApiResponse({ status: 201, description: 'Pagamento criado.' })
  @ApiResponse({ status: 400, description: 'NF não validada.' })
  @ApiResponse({ status: 409, description: 'Já existe pagamento para esta NF.' })
  create(
    @Body(new ZodValidationPipe(createPaymentSchema)) body: CreatePaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.paymentsService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do pagamento com parcelas' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.paymentsService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar notas (apenas PENDING)' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePaymentSchema)) body: UpdatePaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.paymentsService.update(id, body, user)
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar pagamento (PENDING, sem parcelas pagas)' })
  cancel(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.paymentsService.cancel(id, user)
  }

  @Post(':id/installments/:installmentId/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar parcela como paga' })
  payInstallment(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body(new ZodValidationPipe(payInstallmentSchema)) body: PayInstallmentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.paymentsService.payInstallment(id, installmentId, body, user)
  }
}
