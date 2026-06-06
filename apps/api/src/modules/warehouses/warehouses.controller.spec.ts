import { Test } from '@nestjs/testing'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../../common/guards/auth.guard'
import { WarehousesController } from './warehouses.controller'
import { WarehousesService } from './warehouses.service'

describe('WarehousesController', () => {
  let controller: WarehousesController
  const mockUser = { id: 'u1', role: 'ALMOXARIFE', companyId: 'c1' } as any
  const mockWarehouse = { id: 'w1', name: 'Central', isActive: true }

  const mockService = {
    findAll: vi.fn().mockResolvedValue([mockWarehouse]),
    findOne: vi.fn().mockResolvedValue(mockWarehouse),
    create: vi.fn().mockResolvedValue(mockWarehouse),
    update: vi.fn().mockResolvedValue(mockWarehouse),
    deactivate: vi.fn().mockResolvedValue({ success: true }),
    getInventory: vi.fn().mockResolvedValue([]),
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [WarehousesController],
      providers: [{ provide: WarehousesService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get(WarehousesController)
  })

  it('GET / — lista armazéns', async () =>
    expect(await controller.findAll(mockUser)).toEqual([mockWarehouse]))
  it('POST / — cria armazém', async () =>
    expect(await controller.create({ name: 'X' }, mockUser)).toMatchObject({ name: 'Central' }))
  it('GET /:id — detalhe', async () =>
    expect(await controller.findOne('w1', mockUser)).toMatchObject({ id: 'w1' }))
  it('PATCH /:id — atualiza', async () =>
    expect(await controller.update('w1', { name: 'Y' }, mockUser)).toMatchObject({ id: 'w1' }))
  it('POST /:id/deactivate — desativa', async () =>
    expect(await controller.deactivate('w1', mockUser)).toEqual({ success: true }))
  it('GET /:id/inventory — inventário', async () =>
    expect(await controller.getInventory('w1', mockUser)).toEqual([]))
})
