import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { ProductsController } from './products.controller'
import { ProductsService } from './products.service'

describe('ProductsController', () => {
  let controller: ProductsController
  let service: { [key: string]: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    service = {
      findAll: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'product-1' }),
      findOne: vi.fn().mockResolvedValue({ id: 'product-1' }),
      update: vi.fn().mockResolvedValue({ id: 'product-1' }),
      deactivate: vi.fn().mockResolvedValue({ success: true }),
      linkSupplier: vi.fn().mockResolvedValue({ id: 'link-1' }),
      updateSupplierLink: vi.fn().mockResolvedValue({ id: 'link-1' }),
      unlinkSupplier: vi.fn().mockResolvedValue({ success: true }),
    }

    const module = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(ProductsController)
  })

  it('findAll delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.findAll(user)
    expect(service.findAll).toHaveBeenCalledWith(user, expect.any(Object))
  })

  it('create delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    const dto = { name: 'Parafuso', unit: 'UN' as const, isActive: true }
    await controller.create(dto, user)
    expect(service.create).toHaveBeenCalledWith(dto, user)
  })

  it('deactivate delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.deactivate('product-1', user)
    expect(service.deactivate).toHaveBeenCalledWith('product-1', user)
  })

  it('linkSupplier delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    const dto = { supplierId: 'supplier-1', isPreferred: false }
    await controller.linkSupplier('product-1', dto, user)
    expect(service.linkSupplier).toHaveBeenCalledWith('product-1', dto, user)
  })

  it('updateSupplierLink delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    const dto = { isPreferred: true }
    await controller.updateSupplierLink('product-1', 'supplier-1', dto, user)
    expect(service.updateSupplierLink).toHaveBeenCalledWith('product-1', 'supplier-1', dto, user)
  })

  it('unlinkSupplier delega ao service', async () => {
    const user = { id: 'u1', role: 'COMPRADOR', companyId: 'c1' } as never
    await controller.unlinkSupplier('product-1', 'supplier-1', user)
    expect(service.unlinkSupplier).toHaveBeenCalledWith('product-1', 'supplier-1', user)
  })
})
