import {
  type CreateBidDto,
  type CreateBidItemDto,
  type SelectWinnerDto,
  type UpdateBidDto,
  type UpdateBidItemDto,
  createBidItemSchema,
  createBidSchema,
  selectWinnerSchema,
  updateBidItemSchema,
  updateBidSchema,
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
  UseGuards,
} from '@nestjs/common'
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { SessionUser } from '../../common/types/session-user'
import { BidsService } from './bids.service'

@ApiTags('bids')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies/:cnpj/quotations/:quotationId')
export class BidsController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(BidsService) private readonly bidsService: BidsService) {}

  // ─── Bids ───────────────────────────────────────────────────────────────────

  @Get('bids')
  @ApiOperation({ summary: 'Listar lances da cotação' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  findAll(@Param('quotationId') quotationId: string, @CurrentUser() user: SessionUser) {
    return this.bidsService.findAll(quotationId, user)
  }

  @Post('bids')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar lance em nome do fornecedor (cotação OPEN)' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 409 })
  create(
    @Param('quotationId') quotationId: string,
    @Body(new ZodValidationPipe(createBidSchema)) body: CreateBidDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.create(quotationId, body, user)
  }

  // IMPORTANTE: @Get('bids/compare') deve vir ANTES de @Get('bids/:bidId') para que
  // o NestJS não interprete a string literal "compare" como um UUID de bidId.
  @Get('bids/compare')
  @ApiOperation({ summary: 'Comparativo de lances (matrix itens × fornecedores)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Cotação não é OPEN nem CLOSED.' })
  @ApiResponse({ status: 403 })
  compare(@Param('quotationId') quotationId: string, @CurrentUser() user: SessionUser) {
    return this.bidsService.compare(quotationId, user)
  }

  @Get('bids/:bidId')
  @ApiOperation({ summary: 'Detalhe do lance com itens' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  findOne(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.findOne(quotationId, bidId, user)
  }

  @Patch('bids/:bidId')
  @ApiOperation({ summary: 'Atualizar notas do lance (apenas DRAFT)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  update(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @Body(new ZodValidationPipe(updateBidSchema)) body: UpdateBidDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.update(quotationId, bidId, body, user)
  }

  @Delete('bids/:bidId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover lance (apenas DRAFT)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT.' })
  @ApiResponse({ status: 403 })
  remove(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.remove(quotationId, bidId, user)
  }

  @Post('bids/:bidId/submit')
  @ApiOperation({ summary: 'Submeter lance (DRAFT → SUBMITTED)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status não é DRAFT ou sem itens.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  submit(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.submit(quotationId, bidId, user)
  }

  // ─── Bid Items ──────────────────────────────────────────────────────────────

  @Get('bids/:bidId/items')
  @ApiOperation({ summary: 'Listar itens do lance' })
  findBidItems(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.findBidItems(quotationId, bidId, user)
  }

  @Post('bids/:bidId/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar item ao lance (apenas DRAFT)' })
  addBidItem(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @Body(new ZodValidationPipe(createBidItemSchema)) body: CreateBidItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.addBidItem(quotationId, bidId, body, user)
  }

  @Patch('bids/:bidId/items/:itemId')
  @ApiOperation({ summary: 'Atualizar item do lance (apenas DRAFT)' })
  updateBidItem(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateBidItemSchema)) body: UpdateBidItemDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.updateBidItem(quotationId, bidId, itemId, body, user)
  }

  @Delete('bids/:bidId/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item do lance (apenas DRAFT)' })
  removeBidItem(
    @Param('quotationId') quotationId: string,
    @Param('bidId') bidId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.removeBidItem(quotationId, bidId, itemId, user)
  }

  // ─── Winner Selection ───────────────────────────────────────────────────────

  @Post('select-winner')
  @ApiOperation({ summary: 'Selecionar lance vencedor (cotação CLOSED)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Status inválido ou já há vencedor.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 409, description: 'Já existe vencedor selecionado.' })
  selectWinner(
    @Param('quotationId') quotationId: string,
    @Body(new ZodValidationPipe(selectWinnerSchema)) body: SelectWinnerDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.bidsService.selectWinner(quotationId, body, user)
  }
}
