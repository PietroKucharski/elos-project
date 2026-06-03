import {
  type CreateProductDto,
  type LinkProductSupplierDto,
  type UpdateProductDto,
  type UpdateProductSupplierDto,
  createProductSchema,
  linkProductSupplierSchema,
  updateProductSchema,
  updateProductSupplierSchema,
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
import { ProductsService } from './products.service'

@ApiTags('products')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('companies/:cnpj/products')
export class ProductsController {
  // @Inject explícito: tsx/esbuild não emite metadata de tipo para a DI.
  constructor(@Inject(ProductsService) private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, enum: ['true', 'false'] })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'unit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  findAll(
    @CurrentUser() user: SessionUser,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('supplierId') supplierId?: string,
    @Query('unit') unit?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(user, {
      search,
      isActive,
      supplierId,
      unit,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar produto' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 409 })
  create(
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.productsService.create(body, user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do produto com fornecedores vinculados' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  findOne(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.productsService.findOne(id, user)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.productsService.update(id, body, user)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar produto (soft delete)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  deactivate(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.productsService.deactivate(id, user)
  }

  // ─── Product ↔ Supplier links ──────────────────────────────────────────────

  @Post(':id/suppliers')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vincular fornecedor ao produto' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Fornecedor não aprovado ou vínculo duplicado.' })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  @ApiResponse({ status: 409 })
  linkSupplier(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(linkProductSupplierSchema)) body: LinkProductSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.productsService.linkSupplier(id, body, user)
  }

  @Patch(':id/suppliers/:supplierId')
  @ApiOperation({ summary: 'Atualizar vínculo produto↔fornecedor' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  updateSupplierLink(
    @Param('id') id: string,
    @Param('supplierId') supplierId: string,
    @Body(new ZodValidationPipe(updateProductSupplierSchema)) body: UpdateProductSupplierDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.productsService.updateSupplierLink(id, supplierId, body, user)
  }

  @Delete(':id/suppliers/:supplierId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover vínculo produto↔fornecedor' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403 })
  @ApiResponse({ status: 404 })
  unlinkSupplier(
    @Param('id') id: string,
    @Param('supplierId') supplierId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.productsService.unlinkSupplier(id, supplierId, user)
  }
}
