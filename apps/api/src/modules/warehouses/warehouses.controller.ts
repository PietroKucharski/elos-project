import {
  type CreateWarehouseDto,
  type UpdateWarehouseDto,
  createWarehouseSchema,
  updateWarehouseSchema,
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
import { WarehousesService } from './warehouses.service'

@ApiTags('warehouses')
@ApiCookieAuth()
@Controller('companies/:cnpj/warehouses')
@UseGuards(AuthGuard)
export class WarehousesController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(WarehousesService) private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar armazéns' })
  @ApiResponse({ status: 200, description: 'Lista de armazéns.' })
  findAll(@CurrentUser() user: SessionUser, @Query('includeInactive') includeInactive?: string) {
    return this.warehousesService.findAll(user, { includeInactive })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar armazém' })
  @ApiResponse({ status: 201, description: 'Armazém criado.' })
  @ApiResponse({ status: 403, description: 'Sem permissão.' })
  @ApiResponse({ status: 409, description: 'Código já cadastrado.' })
  create(
    @Body(new ZodValidationPipe(createWarehouseSchema)) body: CreateWarehouseDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.warehousesService.create(body, user)
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Saldo de estoque global (todos os armazéns)' })
  getGlobalInventory(
    @CurrentUser() user: SessionUser,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehousesService.getInventory(user, { productId, search, page, limit })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do armazém' })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.warehousesService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar armazém' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema)) body: UpdateWarehouseDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.warehousesService.update(id, body, user)
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar armazém (soft delete)' })
  @ApiResponse({ status: 400, description: 'Armazém com estoque ou já desativado.' })
  deactivate(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.warehousesService.deactivate(id, user)
  }

  @Get(':id/inventory')
  @ApiOperation({ summary: 'Saldo de estoque do armazém' })
  getInventory(
    @Param('id') id: string,
    @CurrentUser() user: SessionUser,
    @Query('productId') productId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.warehousesService.getInventory(user, {
      warehouseId: id,
      productId,
      search,
      page,
      limit,
    })
  }
}
